from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import User, WalletTransaction
from app.schemas import PhoneRequest, VerifyCodeRequest, TokenResponse, UserResponse, AdminLoginRequest
from app.auth import create_access_token
from app.config import settings
from app.dependencies import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/send-code")
async def send_code(req: PhoneRequest):
    """Mock SMS send - always succeeds. In production, integrate with Twilio/etc."""
    return {"message": "Code sent successfully", "phone": req.phone}


@router.post("/verify-code", response_model=TokenResponse)
async def verify_code(req: VerifyCodeRequest, db: AsyncSession = Depends(get_db)):
    """Verify SMS code. For now, only '123456' is accepted."""
    if req.code != settings.MOCK_SMS_CODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )

    from app.schemas import VerifyCodeRequest

    result = await db.execute(select(User).where(User.phone == req.phone))
    user = result.scalar_one_or_none()

    if user is None:
        user = User(phone=req.phone, name=req.name or None, coins=settings.SIGNUP_BONUS_COINS)
        db.add(user)
        await db.commit()
        await db.refresh(user)

        tx = WalletTransaction(
            user_id=user.id,
            amount=settings.SIGNUP_BONUS_COINS,
            type="signup_bonus",
            description="Welcome bonus for joining LocationLens",
        )
        db.add(tx)
        await db.commit()

    token = create_access_token(data={"sub": str(user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user)
    )


@router.post("/admin-login", response_model=TokenResponse)
async def admin_login(req: AdminLoginRequest):
    """Admin login with username/password."""
    if req.username != settings.ADMIN_USERNAME or req.password != settings.ADMIN_PASSWORD:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid admin credentials"
        )

    from app.database import async_session
    async with async_session() as db:
        result = await db.execute(
            select(User).where(User.phone == settings.ADMIN_PHONE)
        )
        admin_user = result.scalar_one_or_none()

        if admin_user is None:
            admin_user = User(
                phone=settings.ADMIN_PHONE,
                name="Admin",
                is_admin=True,
                coins=settings.ADMIN_INITIAL_COINS,
            )
            db.add(admin_user)
            await db.commit()
            await db.refresh(admin_user)

    token = create_access_token(data={"sub": str(admin_user.id)})
    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(admin_user)
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(get_current_user)):
    return UserResponse.model_validate(user)
