# LocationLens

A location-discovery app for portrait photography spots, with a FastAPI backend and a React (Vite + Capacitor) frontend shipped both as a website and an Android app.

## Running locally

```
docker compose up -d --build
```

This starts the database, backend, and frontend as defined in `docker-compose.yml`. Copy `.env.example` to `.env` and fill in real values first.

## Deploying / pulling updates on the server

After `git pull origin main`, there's one manual step `git pull` can't do for you:

**Manually copy the two secret files** — these are gitignored on purpose, so `git pull` will *not* bring them over. You need to transfer them yourself (scp, sftp, or paste the contents):
- `client/android/app/google-services.json` (needed wherever you build the APK)
- `server/firebase-service-account.json` (needed on the backend server)

Once both are in place:
```
docker compose up -d --build
```
to redeploy the backend, then rebuild the Android APK on the machine that has `google-services.json`.
