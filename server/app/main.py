import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db
from app.routers import auth, locations, search, push


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    await init_db()
    yield


app = FastAPI(title="LocationLens API", version="1.0.0", lifespan=lifespan)

# Size-limit middleware for multipart uploads
MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

@app.middleware("http")
async def limit_upload_size(request: Request, call_next):
    if request.method == "POST" and "multipart/form-data" in request.headers.get("content-type", ""):
        body = await request.body()
        content_length = len(body)
        if content_length > MAX_BYTES:
            return JSONResponse(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                content={"detail": f"Uploaded file is too large. Maximum allowed size is {settings.MAX_UPLOAD_SIZE_MB} MB."},
            )
        # Re-populate body stream so downstream can read it again
        async def receive():
            return {"type": "http.request", "body": body}
        request._receive = receive
    response = await call_next(request)
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://localhost",
        # Capacitor's Android WebView serves the bundled app from this internal origin.
        "https://localhost",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(locations.router)
app.include_router(search.router)
app.include_router(push.router)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "app": "LocationLens"}
