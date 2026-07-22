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

    # Storage
    UPLOAD_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")

    # Seeding
    SEED_ON_START: bool = False

    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 10

    # Coin purchase packages (coins, price in local currency)
    COIN_PKG_STARTER_COINS: int = 10
    COIN_PKG_STARTER_PRICE: str = "0.99"
    COIN_PKG_POPULAR_COINS: int = 50
    COIN_PKG_POPULAR_PRICE: str = "3.99"
    COIN_PKG_PREMIUM_COINS: int = 100
    COIN_PKG_PREMIUM_PRICE: str = "6.99"

    class Config:
        env_file = _find_env_file()
        extra = "ignore"


settings = Settings()


# Assemble the packages dict from individual env settings so the router can import it.
COIN_PACKAGES = {
    "starter": {
        "coins": settings.COIN_PKG_STARTER_COINS,
        "price": f"${settings.COIN_PKG_STARTER_PRICE}",
        "label": "Starter",
        "color": "blue",
    },
    "popular": {
        "coins": settings.COIN_PKG_POPULAR_COINS,
        "price": f"${settings.COIN_PKG_POPULAR_PRICE}",
        "label": "Popular",
        "color": "purple",
        "badge": "Best Value",
    },
    "premium": {
        "coins": settings.COIN_PKG_PREMIUM_COINS,
        "price": f"${settings.COIN_PKG_PREMIUM_PRICE}",
        "label": "Premium",
        "color": "green",
    },
}
