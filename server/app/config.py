from pydantic_settings import BaseSettings
import os


def _find_env_file() -> str | None:
    """Look for .env in the project root (one level up from server/app/)."""
    root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
    if os.path.isfile(root_env):
        return root_env
    return None


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/locationlens"

    # JWT / Auth
    JWT_SECRET: str = "locationlens-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Admin credentials
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "admin123"
    ADMIN_PHONE: str = "admin_phone"
    ADMIN_INITIAL_COINS: int = 999999

    # Mock SMS verification
    MOCK_SMS_CODE: str = "123456"

    # Coin economy
    SIGNUP_BONUS_COINS: int = 10
    REVEAL_COST_COINS: int = 1
    APPROVAL_REWARD_COINS: int = 2

    # Storage (path used for uploaded images / media)
    UPLOAD_DIR: str = "uploads"

    # Seeding
    SEED_ON_START: bool = False

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 10

    # Push notifications (Firebase Cloud Messaging)
    # Path to the Firebase service-account JSON (Project Settings > Service accounts > Generate new private key).
    # Never commit this file - keep it outside the repo or gitignored.
    FIREBASE_CREDENTIALS_PATH: str = "firebase-service-account.json"

    # Coin purchase packages (coins, price in local currency)
    COIN_PKG_BRONZE_COINS: int = 10
    COIN_PKG_BRONZE_PRICE: str = "۳۵,۰۰۰ تومان"
    COIN_PKG_SILVER_COINS: int = 20
    COIN_PKG_SILVER_PRICE: str = "۵۵,۰۰۰ تومان"
    COIN_PKG_GOLD_COINS: int = 50
    COIN_PKG_GOLD_PRICE: str = "۱۲۵,۰۰۰ تومان"

    class Config:
        env_file = _find_env_file()
        extra = "ignore"


settings = Settings()


# Assemble the packages dict from individual env settings so the router can import it.
COIN_PACKAGES = {
    "bronze": {
        "id": "bronze",
        "coins": settings.COIN_PKG_BRONZE_COINS,
        "price": settings.COIN_PKG_BRONZE_PRICE,
        "label": "برنزی",
        "description": "۱۰ سکه - یک‌بار خرید",
        "color": "blue",
    },
    "silver": {
        "id": "silver",
        "coins": settings.COIN_PKG_SILVER_COINS,
        "price": settings.COIN_PKG_SILVER_PRICE,
        "label": "نقره‌ای",
        "description": "۲۰ سکه - یک‌بار خرید",
        "color": "purple",
        "badge": "پرفروش",
    },
    "gold": {
        "id": "gold",
        "coins": settings.COIN_PKG_GOLD_COINS,
        "price": settings.COIN_PKG_GOLD_PRICE,
        "label": "طلایی",
        "description": "۵۰ سکه - یک‌بار خرید",
        "color": "green",
    },
}
