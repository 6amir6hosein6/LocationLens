from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean, Enum as SAEnum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class LocationStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=True)
    coins = Column(Integer, default=10, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    locations = relationship("Location", back_populates="user")
    transactions = relationship("WalletTransaction", back_populates="user")
    revealed_locations = relationship("RevealedLocation", back_populates="user")


class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    province = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    neighborhood = Column(String(100), nullable=True)
    status = Column(String(20), default=LocationStatus.PENDING.value, nullable=False)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    user = relationship("User", back_populates="locations")
    images = relationship("Image", back_populates="location", cascade="all, delete-orphan")
    ratings = relationship("Rating", back_populates="location", cascade="all, delete-orphan")


class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(500), nullable=False)
    original_name = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    taken_at = Column(DateTime, nullable=True)
    camera_make = Column(String(100), nullable=True)
    camera_model = Column(String(200), nullable=True)
    iso = Column(Integer, nullable=True)
    aperture = Column(Float, nullable=True)
    shutter_speed = Column(String(50), nullable=True)
    focal_length = Column(Float, nullable=True)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    uploaded_at = Column(DateTime, default=datetime.utcnow)

    location = relationship("Location", back_populates="images")


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    amount = Column(Integer, nullable=False)
    type = Column(String(50), nullable=False)
    description = Column(String(300), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="transactions")


class RevealedLocation(Base):
    __tablename__ = "revealed_locations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    revealed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="revealed_locations")
    location = relationship("Location")


class Rating(Base):
    __tablename__ = "ratings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    stars = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User")
    location = relationship("Location", back_populates="ratings")
