from fastapi import APIRouter, Query
import httpx

router = APIRouter(prefix="/api/search", tags=["search"])

NOMINATIM_URL = "https://nominatim.openstreetmap.org"
HEADERS = {"User-Agent": "LocationLens/1.0"}


@router.get("")
async def search_locations(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(5, ge=1, le=20),
):
    """Forward geocoding - search places by name."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{NOMINATIM_URL}/search",
            params={
                "q": q,
                "format": "json",
                "limit": limit,
                "addressdetails": 1,
            },
            headers=HEADERS,
        )
        data = resp.json()

    results = []
    for item in data:
        results.append({
            "display_name": item.get("display_name", ""),
            "latitude": float(item.get("lat", 0)),
            "longitude": float(item.get("lon", 0)),
            "type": item.get("type", ""),
            "importance": item.get("importance", 0),
        })

    return results


@router.get("/reverse")
async def reverse_geocode(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
):
    """Reverse geocode - get address from coordinates."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{NOMINATIM_URL}/reverse",
            params={
                "lat": lat,
                "lon": lon,
                "format": "json",
                "addressdetails": 1,
            },
            headers=HEADERS,
        )
        data = resp.json()

    if "error" in data:
        return {"display_name": "", "address": {}}

    return {
        "display_name": data.get("display_name", ""),
        "address": data.get("address", {}),
    }
