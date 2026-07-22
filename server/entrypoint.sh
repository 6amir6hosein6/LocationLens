#!/bin/bash
set -e

echo "=== LocationLens Backend Entrypoint ==="

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432} ..."
python3 -c "
import asyncio
import os
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text

url = os.environ.get('DATABASE_URL', 'postgresql+asyncpg://postgres:postgres@db:5432/locationlens')
engine = create_async_engine(url)

async def wait():
    for _ in range(30):
        try:
            async with engine.connect() as conn:
                await conn.execute(text('SELECT 1'))
            print('Database is ready!')
            return
        except Exception as e:
            print(f'Waiting... {e}', flush=True)
            await asyncio.sleep(1)
    raise RuntimeError('Database did not become ready in time')

asyncio.run(wait())
"

# Initialize database tables
echo "Creating database tables (if not exist)..."
python3 -c "
import asyncio
from app.database import init_db
asyncio.run(init_db())
"

# Optional seeding
if [ "${SEED_ON_START:-false}" = "true" ]; then
    echo "Seeding database with sample data..."
    python3 seed_100.py
fi

# Start the application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
