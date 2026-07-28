import re
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


# Iranian mobile numbers: optional +98 or leading 0, then 9 followed by 9 digits.
# Keep this in sync with the frontend validator in client/src/utils/validation.js.
IRAN_PHONE_REGEX = re.compile(r"^(\+98|0)?9\d{9}$")


def normalize_iranian_phone(phone: str) -> Optional[str]:
    """Return the phone normalized to a leading-0 local format, or None if invalid."""
    phone = (phone or "").strip()
    if not IRAN_PHONE_REGEX.match(phone):
        return None
    if phone.startswith("+98"):
        return "0" + phone[3:]
    if not phone.startswith("0"):
        return "0" + phone
    return phone


# User schemas
class UserResponse(BaseModel):
    id: int
    name: Optional[str] = None
    coins: int
    is_admin: bool = False

    class Config:
        from_attributes = True


# Auth schemas
class PhoneRequest(BaseModel):
    phone: str


class VerifyCodeRequest(BaseModel):
    phone: str
    code: str
    name: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Image schemas
class ImageResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    description: Optional[str] = None
    taken_at: Optional[datetime] = None
    camera_make: Optional[str] = None
    camera_model: Optional[str] = None
    iso: Optional[int] = None
    aperture: Optional[float] = None
    shutter_speed: Optional[str] = None
    focal_length: Optional[float] = None
    width: Optional[int] = None
    height: Optional[int] = None
    uploaded_at: datetime

    class Config:
        from_attributes = True


# Location schemas
class LocationCreate(BaseModel):
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None


class LocationRevealed(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    created_at: datetime
    user: UserResponse
    images: List[ImageResponse] = []
    avg_rating: Optional[float] = None
    rating_count: int = 0

    class Config:
        from_attributes = True


class LocationBrief(BaseModel):
    id: int
    title: str
    latitude: float
    longitude: float
    created_at: datetime
    user: UserResponse
    thumbnail: Optional[str] = None
    image_count: int = 0
    province: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None

    class Config:
        from_attributes = True


# Rating schemas
class RatingCreate(BaseModel):
    stars: int
    comment: Optional[str] = None


class RatingResponse(BaseModel):
    id: int
    stars: int
    comment: Optional[str] = None
    user_name: str = "Anonymous"
    created_at: datetime

    class Config:
        from_attributes = True


class SwipeCard(BaseModel):
    id: int
    title: str
    created_at: datetime
    image: ImageResponse
    user_name: Optional[str] = None
    revealed: bool = False
    avg_rating: Optional[float] = None
    rating_count: int = 0
    reviews_preview: List[RatingResponse] = []

    class Config:
        from_attributes = True


# Wallet schemas
class WalletResponse(BaseModel):
    coins: int
    transactions: List["TransactionResponse"] = []


class TransactionResponse(BaseModel):
    id: int
    amount: int
    type: str
    description: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class BuyCoinsRequest(BaseModel):
    package: str


# Push notification schemas
class PushTokenRequest(BaseModel):
    token: str
    platform: str = "android"


class PushBroadcastRequest(BaseModel):
    title: str
    message: str


# Admin schemas
class AdminLoginRequest(BaseModel):
    username: str
    password: str


class LocationApproval(BaseModel):
    status: str
    rejection_reason: Optional[str] = None


class AdminLocationPending(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    latitude: float
    longitude: float
    address: Optional[str] = None
    province: Optional[str] = None
    city: Optional[str] = None
    neighborhood: Optional[str] = None
    status: str = "pending"
    created_at: datetime
    user: UserResponse
    images: List[ImageResponse] = []
    avg_rating: Optional[float] = None
    rating_count: int = 0

    class Config:
        from_attributes = True
