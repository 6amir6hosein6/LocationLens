import logging
import os
from typing import Optional

import firebase_admin
from firebase_admin import credentials, messaging
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import PushToken

logger = logging.getLogger(__name__)

_firebase_app: Optional[firebase_admin.App] = None
_firebase_init_attempted = False


def _get_firebase_app() -> Optional[firebase_admin.App]:
    """Lazily initialize the Firebase Admin app. Returns None if credentials aren't set up yet."""
    global _firebase_app, _firebase_init_attempted
    if _firebase_app is not None:
        return _firebase_app
    if _firebase_init_attempted:
        return None
    _firebase_init_attempted = True

    if not os.path.isfile(settings.FIREBASE_CREDENTIALS_PATH):
        logger.warning(
            "Firebase credentials not found at %s; push notifications are disabled.",
            settings.FIREBASE_CREDENTIALS_PATH,
        )
        return None

    try:
        cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
        _firebase_app = firebase_admin.initialize_app(cred)
    except Exception:
        logger.exception(
            "Failed to initialize Firebase Admin from %s; push notifications are disabled.",
            settings.FIREBASE_CREDENTIALS_PATH,
        )
        _firebase_app = None
    return _firebase_app


async def send_push_to_all(db: AsyncSession, title: str, body: str, data: Optional[dict] = None) -> dict:
    """Send a push notification to every registered device. Never raises (a broken/
    unconfigured Firebase setup must never break the caller's request) - instead returns
    a diagnostics dict the caller can surface to an admin if it wants to."""
    try:
        return await _send_push_to_all(db, title, body, data)
    except Exception as exc:
        logger.exception("Unexpected error while sending push notifications")
        return {"configured": True, "tokens": 0, "sent": 0, "failed": 0, "errors": [str(exc)]}


async def _send_push_to_all(db: AsyncSession, title: str, body: str, data: Optional[dict]) -> dict:
    app = _get_firebase_app()
    if app is None:
        return {
            "configured": False,
            "tokens": 0,
            "sent": 0,
            "failed": 0,
            "errors": [f"Firebase credentials not found at {settings.FIREBASE_CREDENTIALS_PATH}"],
        }

    result = await db.execute(select(PushToken.token))
    tokens = [row[0] for row in result.all()]
    if not tokens:
        return {"configured": True, "tokens": 0, "sent": 0, "failed": 0, "errors": []}

    message_data = {str(k): str(v) for k, v in (data or {}).items()}
    invalid_tokens: list[str] = []
    sent = 0
    failed = 0
    errors: list[str] = []

    # FCM allows at most 500 tokens per multicast request.
    for i in range(0, len(tokens), 500):
        batch = tokens[i:i + 500]
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=message_data,
            tokens=batch,
        )
        try:
            response = messaging.send_each_for_multicast(message, app=app)
        except Exception as exc:
            logger.exception("Failed to send push notification batch")
            failed += len(batch)
            errors.append(str(exc))
            continue

        for token, send_response in zip(batch, response.responses):
            if send_response.success:
                sent += 1
            else:
                failed += 1
                if isinstance(send_response.exception, messaging.UnregisteredError):
                    invalid_tokens.append(token)
                    errors.append("UnregisteredError (stale token, removed)")
                else:
                    err_text = str(send_response.exception)
                    logger.warning("Push send failed for a token: %s", err_text)
                    if err_text not in errors:
                        errors.append(err_text)

    if invalid_tokens:
        await db.execute(delete(PushToken).where(PushToken.token.in_(invalid_tokens)))
        await db.commit()

    return {"configured": True, "tokens": len(tokens), "sent": sent, "failed": failed, "errors": errors}
