# LocationLens Makefile
# Simplify all common operations with single commands

.PHONY: help up down build restart logs seed seed-auto db-shell db-count clean apk aab release

# Default target
help:
	@echo "🎯 LocationLens Commands:"
	@echo ""
	@echo "  make up         - Start all services (detached)"
	@echo "  make down       - Stop all services"
	@echo "  make build      - Build and start all services"
	@echo "  make restart    - Restart all services"
	@echo "  make logs       - View logs from all containers"
	@echo "  make seed       - Manually add 100 sample locations"
	@echo "  make seed-auto  - Enable auto-seed and start (first time only)"
	@echo "  make db-shell   - Open PostgreSQL shell"
	@echo "  make db-count   - Count locations in database"
	@echo "  make clean      - Stop and remove all containers + volumes"
	@echo "  make apk        - Build Android APK"
	@echo "  make aab        - Build Android AAB"
	@echo "  make release    - Create GitHub Release with APK/AAB"
	@echo ""

# Start all services
up:
	docker compose up -d
	@echo "✅ App running at http://localhost"

# Stop all services
down:
	docker compose down

# Build and start everything from scratch
build:
	docker compose up --build -d
	@echo "✅ App built and running at http://localhost"

# Restart all services
restart:
	docker compose restart
	@echo "✅ Services restarted"

# View logs
logs:
	docker compose logs -f

# Manual seed: Add 100 sample locations to running database
seed:
	@echo "🌱 Seeding 100 sample locations..."
	docker compose exec backend python3 seed_100.py
	@echo "✅ Done! Check with: make db-count"

# Auto-seed: Enable seeding on first container start, then start everything
seed-auto:
	@echo "🌱 Enabling auto-seed for first startup..."
	@sed -i 's/SEED_ON_START=false/SEED_ON_START=true/' .env
	docker compose up --build -d
	@echo "✅ App running with auto-seed enabled."
	@echo "   Set back to false after first start: make seed-disable"

# Disable auto-seed after first use
seed-disable:
	@sed -i 's/SEED_ON_START=true/SEED_ON_START=false/' .env
	@echo "✅ Auto-seed disabled"

# Open PostgreSQL interactive shell
db-shell:
	docker compose exec db psql -U postgres -d locationlens

# Count locations and users in database
db-count:
	@echo "📊 Database Stats:"
	@docker compose exec db psql -U postgres -d locationlens -c "SELECT 'Locations' as table, COUNT(*) as count FROM locations UNION SELECT 'Users', COUNT(*) FROM users UNION SELECT 'Images', COUNT(*) FROM images;"

# Clean everything: stop containers, remove volumes, remove images
clean:
	@echo "🧹 Cleaning up..."
	docker compose down -v --rmi all --remove-orphans
	@echo "✅ All containers, volumes, and images removed"

# Build Android APK (requires Android SDK setup)
apk:
	@echo "📦 Building APK..."
	cd client && npm run build && npx cap sync android
	cd client/android && ./gradlew assembleRelease
	@echo "✅ APK ready: client/android/app/build/outputs/apk/release/app-release.apk"

# Build Android AAB (requires Android SDK setup)
aab:
	@echo "📦 Building AAB..."
	cd client && npm run build && npx cap sync android
	cd client/android && ./gradlew bundleRelease
	@echo "✅ AAB ready: client/android/app/build/outputs/bundle/release/app-release.aab"

# Create GitHub Release (requires GH_TOKEN env variable)
release:
	@bash -c 'if [ -z "$$GH_TOKEN" ]; then echo "❌ Set GH_TOKEN first: export GH_TOKEN=ghp_xxxxxx"; exit 1; fi'
	python3 create-release.py
