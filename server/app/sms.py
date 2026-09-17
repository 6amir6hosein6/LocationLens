import logging
import random
import time

from app.config import settings

logger = logging.getLogger(__name__)

_OTP_TTL_SECONDS = 5 * 60
_otp_store: dict[str, tuple[str, float]] = {}


def issue_otp(phone: str) -> None:
    """Generate a verification code for phone and deliver it.

    In SMS_DEV_MODE the code is the static MOCK_SMS_CODE and no real SMS is sent.
    Otherwise a random 6-digit code is generated and sent via Kavenegar.
    """
    code = settings.MOCK_SMS_CODE if settings.SMS_DEV_MODE else f"{random.randint(0, 999999):06d}"
    _otp_store[phone] = (code, time.time() + _OTP_TTL_SECONDS)

    if settings.SMS_DEV_MODE:
        logger.info("SMS_DEV_MODE is on; skipping real SMS send to %s", phone)
        return

    _send_via_kavenegar(phone, code)


def verify_otp(phone: str, code: str) -> bool:
    """Check a submitted code against the one issued for phone, consuming it on success."""
    entry = _otp_store.get(phone)
    if entry is None:
        return False

    stored_code, expires_at = entry
    if time.time() > expires_at:
        del _otp_store[phone]
        return False

    if code != stored_code:
        return False

    del _otp_store[phone]
    return True


def _send_via_kavenegar(phone: str, code: str) -> None:
    from kavenegar import KavenegarAPI, APIException, HTTPException as KavenegarHTTPException

    if not settings.KAVENEGAR_API_KEY or not settings.KAVENEGAR_SENDER:
        raise RuntimeError("Kavenegar is not configured (KAVENEGAR_API_KEY / KAVENEGAR_SENDER missing)")

    api = KavenegarAPI(settings.KAVENEGAR_API_KEY)
    params = {
        "sender": settings.KAVENEGAR_SENDER,
        "receptor": phone,
        "message": f"کد تایید شما: {code}",
    }
    try:
        api.sms_send(params)
    except (APIException, KavenegarHTTPException):
        logger.exception("Failed to send OTP SMS via Kavenegar to %s", phone)
        raise RuntimeError("Failed to send verification SMS")
