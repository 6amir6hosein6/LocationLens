from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import PushToken, User
from app.schemas import PushTokenRequest

router = APIRouter(prefix="/api/push", tags=["push"])


@router.post("/register", status_code=204)
async def register_push_token(
    req: PushTokenRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Register (or refresh) a device's FCM token for the current user."""
    result = await db.execute(select(PushToken).where(PushToken.token == req.token))
    existing = result.scalar_one_or_none()

    if existing:
        existing.user_id = user.id
        existing.platform = req.platform
        existing.last_seen_at = datetime.utcnow()
    else:
        db.add(PushToken(user_id=user.id, token=req.token, platform=req.platform))

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
