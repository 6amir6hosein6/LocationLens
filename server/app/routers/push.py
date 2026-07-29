from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user, get_admin_user
from app.models import PushToken, User
from app.push import send_push_to_all
from app.schemas import PushBroadcastRequest, PushTokenRequest

router = APIRouter(prefix="/api/push", tags=["push"])


@router.post("/register", status_code=204)
async def register_push_token(
    req: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Register (or refresh) a device's FCM token for the current user.

    Uses an atomic upsert (not check-then-insert) because the same token can arrive in
    two near-simultaneous requests - Capacitor's 'registration' event has fired twice for
    the same token in practice, and a check-then-insert race would crash the second one
    with a unique constraint violation."""
    stmt = pg_insert(PushToken).values(
        user_id=user.id,
        token=req.token,
        platform=req.platform,
    )
    stmt = stmt.on_conflict_do_update(
        index_elements=[PushToken.token],
        set_={
            "user_id": user.id,
            "platform": req.platform,
            "last_seen_at": datetime.utcnow(),
        },
    )
    await db.execute(stmt)
    await db.commit()


@router.delete("/register", status_code=204)
async def unregister_push_token(
    req: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Remove a device token, e.g. on logout, so it stops receiving pushes."""
    result = await db.execute(
        select(PushToken).where(PushToken.token == req.token, PushToken.user_id == user.id)
    )
    existing = result.scalar_one_or_none()
    if existing:
        await db.delete(existing)
        await db.commit()


@router.post("/broadcast")
async def broadcast_push(
    req: PushBroadcastRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    """Admin-only: send a custom notification to every registered device."""
    result = await send_push_to_all(
        db,
        title=req.title,
        body=req.message,
        data={"type": "broadcast"},
    )
    return {"tokens_targeted": result["tokens"], **result}
