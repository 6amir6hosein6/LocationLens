import os
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload
from typing import Optional
from PIL import Image as PILImage
from PIL.ExifTags import TAGS

from app.database import get_db
from app.models import User, Location, Image, WalletTransaction, RevealedLocation, LocationStatus, Rating
from app.schemas import (
    LocationRevealed, LocationBrief, UserResponse, ImageResponse,
    SwipeCard, WalletResponse, TransactionResponse, AdminLocationPending,
    LocationApproval, RatingCreate, RatingResponse,
)
from app.dependencies import get_current_user, get_admin_user
from app.config import settings

router = APIRouter(prefix="/api/locations", tags=["locations"])


def extract_exif(file_path: str) -> dict:
    metadata = {}
    try:
        with PILImage.open(file_path) as img:
            metadata["width"], metadata["height"] = img.size
            exif_data = img.getexif()
            if not exif_data:
                return metadata
            for tag_id, value in exif_data.items():
                tag = TAGS.get(tag_id, tag_id)
                if tag == "Make":
                    metadata["camera_make"] = str(value).strip()
                elif tag == "Model":
                    metadata["camera_model"] = str(value).strip()
                elif tag == "DateTimeOriginal":
                    try:
                        metadata["taken_at"] = datetime.strptime(str(value).strip(), "%Y:%m:%d %H:%M:%S")
                    except (ValueError, TypeError):
                        pass
                elif tag == "ISOSpeedRatings":
                    metadata["iso"] = int(value)
                elif tag == "FNumber":
                    try:
                        metadata["aperture"] = float(value)
                    except (ValueError, TypeError):
                        pass
                elif tag == "ExposureTime":
                    metadata["shutter_speed"] = str(value)
                elif tag == "FocalLength":
                    try:
                        metadata["focal_length"] = float(value)
                    except (ValueError, TypeError):
                        pass
    except Exception:
        pass
    return metadata


def save_uploaded_file(file_content: bytes, original_filename: str) -> str:
    ext = os.path.splitext(original_filename)[1]
    unique_name = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    with open(file_path, "wb") as f:
        f.write(file_content)
    return unique_name


# ─── SWIPE ────────────────────────────────────────────────

@router.get("/swipe", response_model=list[SwipeCard])
async def get_swipe_cards(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get approved locations as swipe cards, excluding rejected and already revealed ones."""
    revealed_ids = await db.execute(
        select(RevealedLocation.location_id).where(RevealedLocation.user_id == user.id)
    )
    revealed_location_ids = [r[0] for r in revealed_ids.fetchall()]

    query = (
        select(Location, Image)
        .join(Image, Image.location_id == Location.id)
        .options(selectinload(Location.user))
        .where(
            Location.status == LocationStatus.APPROVED.value,
        )
        .order_by(func.random())
        .offset(skip)
        .limit(limit)
    )

    if revealed_location_ids:
        query = query.where(Location.id.notin_(revealed_location_ids))

    result = await db.execute(query)
    rows = result.all()

    cards = []
    seen_location_ids = set()
    for loc, img in rows:
        if loc.id in seen_location_ids:
            continue
        seen_location_ids.add(loc.id)

        rating_result = await db.execute(
            select(
                func.avg(Rating.stars).label("avg"),
                func.count(Rating.id).label("cnt"),
            ).where(Rating.location_id == loc.id)
        )
        r = rating_result.one()

        # Get latest 2 reviews as preview
        reviews_res = await db.execute(
            select(Rating, User)
            .join(User, Rating.user_id == User.id)
            .where(Rating.location_id == loc.id)
            .order_by(Rating.created_at.desc())
            .limit(2)
        )
        reviews_preview = [
            RatingResponse(
                id=rat.id,
                stars=rat.stars,
                comment=rat.comment,
                user_name=user.name or f"User #{user.id}",
                created_at=rat.created_at,
            )
            for rat, user in reviews_res.all()
        ]

        cards.append(SwipeCard(
            id=loc.id,
            title=loc.title,
            created_at=loc.created_at,
            image=ImageResponse.model_validate(img),
            user_name=loc.user.name or f"Photographer #{loc.user.id}",
            revealed=False,
            avg_rating=round(r.avg, 1) if r.avg else None,
            rating_count=r.cnt,
            reviews_preview=reviews_preview,
        ))

    return cards


# ─── REVEAL LOCATION (pay 1 coin) ────────────────────────

@router.post("/{location_id}/reveal", response_model=LocationRevealed)
async def reveal_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Pay 1 coin to reveal a location's details and map."""
    existing = await db.execute(
        select(RevealedLocation).where(
            RevealedLocation.user_id == user.id,
            RevealedLocation.location_id == location_id,
        )
    )
    if existing.scalar_one_or_none():
        return await get_location_with_details(location_id, db)

    if user.coins < settings.REVEAL_COST_COINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Not enough coins. Buy more coins to continue.",
        )

    user.coins -= settings.REVEAL_COST_COINS
    tx = WalletTransaction(
        user_id=user.id,
        amount=-settings.REVEAL_COST_COINS,
        type="reveal_location",
        description=f"Revealed location #{location_id}",
    )
    db.add(tx)

    revealed = RevealedLocation(user_id=user.id, location_id=location_id)
    db.add(revealed)
    await db.commit()

    return await get_location_with_details(location_id, db)


async def get_location_with_details(location_id: int, db: AsyncSession) -> LocationRevealed:
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.user), selectinload(Location.images))
        .where(Location.id == location_id)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    rating_result = await db.execute(
        select(
            func.avg(Rating.stars).label("avg"),
            func.count(Rating.id).label("cnt"),
        ).where(Rating.location_id == location_id)
    )
    r = rating_result.one()

    resp = LocationRevealed.model_validate(loc)
    resp.avg_rating = round(r.avg, 1) if r.avg else None
    resp.rating_count = r.cnt
    return resp


# ─── SKIP (no cost) ──────────────────────────────────────

@router.post("/{location_id}/skip", status_code=status.HTTP_200_OK)
async def skip_location(
    location_id: int,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Skip a location - no cost."""
    result = await db.execute(
        select(Location).where(Location.id == location_id, Location.status == LocationStatus.APPROVED.value)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"message": "skipped"}


# ─── CREATE LOCATION ──────────────────────────────────────

@router.post("", response_model=LocationBrief, status_code=status.HTTP_201_CREATED)
async def create_location(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    latitude: float = Form(...),
    longitude: float = Form(...),
    address: Optional[str] = Form(None),
    province: Optional[str] = Form(None),
    city: Optional[str] = Form(None),
    neighborhood: Optional[str] = Form(None),
    image_description: Optional[str] = Form(None),
    image_taken_at: Optional[str] = Form(None),
    image_camera_make: Optional[str] = Form(None),
    image_camera_model: Optional[str] = Form(None),
    image_iso: Optional[int] = Form(None),
    image_aperture: Optional[float] = Form(None),
    image_shutter_speed: Optional[str] = Form(None),
    image_focal_length: Optional[float] = Form(None),
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Create a new location with image. Status starts as 'pending'."""
    location = Location(
        title=title,
        description=description,
        latitude=latitude,
        longitude=longitude,
        address=address,
        province=province,
        city=city,
        neighborhood=neighborhood,
        user_id=user.id,
        status=LocationStatus.PENDING.value,
    )
    db.add(location)
    await db.flush()

    if file and file.filename:
        content = await file.read()
        unique_name = save_uploaded_file(content, file.filename)
        exif = extract_exif(os.path.join(settings.UPLOAD_DIR, unique_name))

        taken_at = None
        if image_taken_at:
            try:
                taken_at = datetime.fromisoformat(image_taken_at)
            except (ValueError, TypeError):
                pass

        img = Image(
            filename=unique_name,
            original_name=file.filename,
            description=image_description,
            taken_at=taken_at or exif.get("taken_at"),
            camera_make=image_camera_make or exif.get("camera_make"),
            camera_model=image_camera_model or exif.get("camera_model"),
            iso=image_iso or exif.get("iso"),
            aperture=image_aperture or exif.get("aperture"),
            shutter_speed=image_shutter_speed or exif.get("shutter_speed"),
            focal_length=image_focal_length or exif.get("focal_length"),
            width=exif.get("width"),
            height=exif.get("height"),
            location_id=location.id,
        )
        db.add(img)

    await db.commit()
    await db.refresh(location)

    result = await db.execute(
        select(Location)
        .options(selectinload(Location.images))
        .where(Location.id == location.id)
    )
    loc = result.scalar_one()
    thumbnail = f"/uploads/{loc.images[0].filename}" if loc.images else None
    return LocationBrief(
        id=loc.id,
        title=loc.title,
        latitude=loc.latitude,
        longitude=loc.longitude,
        address=loc.address,
        province=loc.province,
        city=loc.city,
        neighborhood=loc.neighborhood,
        created_at=loc.created_at,
        user=UserResponse.model_validate(loc.user),
        thumbnail=thumbnail,
        image_count=len(loc.images),
    )


# ─── WALLET ──────────────────────────────────────────────

@router.get("/wallet/me", response_model=WalletResponse)
async def get_wallet(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.user_id == user.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(50)
    )
    txs = result.scalars().all()
    return WalletResponse(
        coins=user.coins,
        transactions=[TransactionResponse.model_validate(tx) for tx in txs],
    )


COIN_PACKAGES = {
    "starter": {"coins": 10, "price": "$0.99"},
    "popular": {"coins": 50, "price": "$3.99"},
    "premium": {"coins": 100, "price": "$6.99"},
}


@router.post("/wallet/buy", response_model=WalletResponse)
async def buy_coins(
    package: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Mock coin purchase - instantly adds coins."""
    if package not in COIN_PACKAGES:
        raise HTTPException(status_code=400, detail="Invalid package. Choose: starter, popular, premium")

    pkg = COIN_PACKAGES[package]
    user.coins += pkg["coins"]
    tx = WalletTransaction(
        user_id=user.id,
        amount=pkg["coins"],
        type="purchase",
        description=f"Purchased {package} package ({pkg['coins']} coins for {pkg['price']})",
    )
    db.add(tx)
    await db.commit()
    await db.refresh(user)

    result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.user_id == user.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(50)
    )
    txs = result.scalars().all()
    return WalletResponse(
        coins=user.coins,
        transactions=[TransactionResponse.model_validate(tx) for tx in txs],
    )


# ─── ADMIN ───────────────────────────────────────────────

@router.get("/admin/pending", response_model=list[AdminLocationPending])
async def get_pending_locations(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.user), selectinload(Location.images))
        .where(Location.status == LocationStatus.PENDING.value)
        .order_by(Location.created_at.asc())
    )
    locations = result.scalars().all()
    return [AdminLocationPending.model_validate(loc) for loc in locations]


@router.put("/admin/{location_id}/review")
async def review_location(
    location_id: int,
    approval: LocationApproval,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    """Approve or reject a location. On approve, reward the author 2 coins."""
    result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    loc = result.scalar_one_or_none()
    if not loc:
        raise HTTPException(status_code=404, detail="Location not found")

    if approval.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="Status must be 'approved' or 'rejected'")

    loc.status = approval.status
    if approval.status == LocationStatus.APPROVED.value:
        loc.approved_at = datetime.utcnow()

    if approval.status == LocationStatus.REJECTED.value:
        loc.rejection_reason = approval.rejection_reason

    if approval.status == LocationStatus.APPROVED.value:
        author_result = await db.execute(select(User).where(User.id == loc.user_id))
        author = author_result.scalar_one_or_none()
        if author:
            author.coins += settings.APPROVAL_REWARD_COINS
            tx = WalletTransaction(
                user_id=author.id,
                amount=settings.APPROVAL_REWARD_COINS,
                type="reward",
                description=f"Reward for approved location #{loc.id}: {loc.title}",
            )
            db.add(tx)

    await db.commit()
    return {"message": f"Location {approval.status}"}


@router.get("/admin/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_admin_user),
):
    pending = await db.execute(select(func.count(Location.id)).where(Location.status == "pending"))
    approved = await db.execute(select(func.count(Location.id)).where(Location.status == "approved"))
    rejected = await db.execute(select(func.count(Location.id)).where(Location.status == "rejected"))
    total_users = await db.execute(select(func.count(User.id)))

    return {
        "pending": pending.scalar() or 0,
        "approved": approved.scalar() or 0,
        "rejected": rejected.scalar() or 0,
        "total_users": total_users.scalar() or 0,
    }


# ─── USER DASHBOARD ─────────────────────────────────────

@router.get("/mine/submissions")
async def get_my_submissions(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all locations submitted by the current user with status."""
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.images))
        .where(Location.user_id == user.id)
        .order_by(Location.created_at.desc())
    )
    locations = result.scalars().all()

    return [
        {
            "id": loc.id,
            "title": loc.title,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "address": loc.address,
            "province": loc.province,
            "city": loc.city,
            "neighborhood": loc.neighborhood,
            "description": loc.description,
            "status": loc.status,
            "rejection_reason": loc.rejection_reason,
            "created_at": loc.created_at.isoformat(),
            "approved_at": loc.approved_at.isoformat() if loc.approved_at else None,
            "thumbnail": f"/uploads/{loc.images[0].filename}" if loc.images else None,
            "image_count": len(loc.images),
        }
        for loc in locations
    ]


@router.get("/mine/revealed")
async def get_my_revealed(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get all locations the current user has revealed (saved)."""
    result = await db.execute(
        select(RevealedLocation, Location, Image)
        .join(Location, RevealedLocation.location_id == Location.id)
        .join(Image, Image.location_id == Location.id)
        .options(selectinload(Location.user))
        .where(RevealedLocation.user_id == user.id)
        .order_by(RevealedLocation.revealed_at.desc())
    )
    rows = result.all()

    seen = set()
    revealed = []
    for rev, loc, img in rows:
        if loc.id in seen:
            continue
        seen.add(loc.id)
        revealed.append({
            "id": loc.id,
            "title": loc.title,
            "latitude": loc.latitude,
            "longitude": loc.longitude,
            "address": loc.address,
            "province": loc.province,
            "city": loc.city,
            "neighborhood": loc.neighborhood,
            "description": loc.description,
            "thumbnail": f"/uploads/{img.filename}" if img else None,
            "posted_by": loc.user.name or f"Photographer #{loc.user.id}",
            "revealed_at": rev.revealed_at.isoformat(),
            "images": [ImageResponse.model_validate(img)],
        })

    return revealed


@router.get("/mine/stats")
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Get current user's stats."""
    total = await db.execute(
        select(func.count(Location.id)).where(Location.user_id == user.id)
    )
    approved = await db.execute(
        select(func.count(Location.id)).where(
            Location.user_id == user.id,
            Location.status == "approved",
        )
    )
    pending = await db.execute(
        select(func.count(Location.id)).where(
            Location.user_id == user.id,
            Location.status == "pending",
        )
    )
    rejected = await db.execute(
        select(func.count(Location.id)).where(
            Location.user_id == user.id,
            Location.status == "rejected",
        )
    )
    revealed_count = await db.execute(
        select(func.count(RevealedLocation.id)).where(RevealedLocation.user_id == user.id)
    )
    coins_earned = await db.execute(
        select(func.coalesce(func.sum(WalletTransaction.amount), 0)).where(
            WalletTransaction.user_id == user.id,
            WalletTransaction.amount > 0,
        )
    )

    total_submitted = total.scalar() or 0
    approved_count = approved.scalar() or 0

    return {
        "total_submitted": total_submitted,
        "approved": approved_count,
        "pending": pending.scalar() or 0,
        "rejected": rejected.scalar() or 0,
        "revealed_count": revealed_count.scalar() or 0,
        "coins": user.coins,
        "coins_earned": coins_earned.scalar() or 0,
        "approval_rate": round(approved_count / total_submitted * 100, 1) if total_submitted > 0 else 0,
    }


# ─── LEADERBOARD ──────────────────────────────────────────

@router.get("/leaderboard")
async def get_leaderboard(
    db: AsyncSession = Depends(get_db),
):
    """Get top users ranked by number of approved locations."""
    result = await db.execute(
        select(
            User.id,
            User.name,
            User.coins,
            func.count(Location.id).label("approved_count"),
        )
        .join(Location, Location.user_id == User.id)
        .where(Location.status == "approved")
        .group_by(User.id)
        .order_by(func.count(Location.id).desc())
        .limit(50)
    )
    rows = result.all()

    leaderboard = []
    for rank, row in enumerate(rows, 1):
        leaderboard.append({
            "rank": rank,
            "user_id": row.id,
            "name": row.name or f"Photographer #{row.id}",
            "approved_count": row.approved_count,
            "coins": row.coins,
        })

    return leaderboard


# ─── RATINGS ─────────────────────────────────────────────

@router.get("/{location_id}/ratings")
async def get_ratings(
    location_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get all ratings for a location."""
    result = await db.execute(
        select(Rating)
        .options(selectinload(Rating.user))
        .where(Rating.location_id == location_id)
        .order_by(Rating.created_at.desc())
    )
    ratings = result.scalars().all()

    avg_result = await db.execute(
        select(
            func.avg(Rating.stars).label("avg"),
            func.count(Rating.id).label("cnt"),
        ).where(Rating.location_id == location_id)
    )
    r = avg_result.one()

    return {
        "avg_rating": round(r.avg, 1) if r.avg else None,
        "rating_count": r.cnt,
        "ratings": [
            {
                "id": rat.id,
                "stars": rat.stars,
                "comment": rat.comment,
                "user_name": rat.user.name or f"User #{rat.user.id}",
                "created_at": rat.created_at.isoformat(),
            }
            for rat in ratings
        ],
    }


@router.post("/{location_id}/ratings", status_code=status.HTTP_201_CREATED)
async def create_rating(
    location_id: int,
    body: RatingCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Rate a revealed location (1-5 stars + optional comment)."""
    # Verify location exists
    loc_result = await db.execute(
        select(Location).where(Location.id == location_id)
    )
    if not loc_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Location not found")

    if body.stars < 1 or body.stars > 5:
        raise HTTPException(status_code=400, detail="Stars must be between 1 and 5")

    existing = await db.execute(
        select(Rating).where(
            Rating.user_id == user.id,
            Rating.location_id == location_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="You already rated this location")

    rating = Rating(
        user_id=user.id,
        location_id=location_id,
        stars=body.stars,
        comment=body.comment,
    )
    db.add(rating)
    await db.commit()

    return {"message": "Rating submitted", "id": rating.id}


# ─── GENERIC GET ──────────────────────────────────────────

@router.get("/{location_id}", response_model=LocationRevealed)
async def get_location(location_id: int, db: AsyncSession = Depends(get_db), user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.user), selectinload(Location.images))
        .where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")
    return location
