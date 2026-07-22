import asyncio
import os
import random
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.database import Base
from app.models import User, Location, Image, WalletTransaction, Rating, LocationStatus

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/locationlens")

engine = create_async_engine(DATABASE_URL)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

TITLES = [
    "Sunset Bridge", "Rose Garden", "Forest Trail", "City Rooftop", "Lavender Field",
    "Historic Mosque", "Old Bazaar", "Mountain Overlook", "River Walk", "Stone Alley",
    "Pomegranate Garden", "Desert Dunes", "Qanat Waterfall", "Caravanserai Gate", "Tiled Courtyard",
    "Walnut Grove", "Olive Orchard", "Tea Plantation", "Saffron Fields", "Pistachio Orchard",
    "Badgir Tower", "Windcatcher Alley", "Blue Mosque Entrance", "Traditional Hammam", "Ceramic Workshop",
    "Persian Garden", "Cypress Avenue", "Pool reflections", "Carpet Weaver Shop", "Spice Market Corner",
    "Old Teahouse", "Sugarcane Juice Stand", "Chelo Kababi Alley", "Grand Bazaar Corridor", "Minaret Viewpoint",
    "Ziggurat Steps", "Fortress Wall", "Cave Entrance", "Hot Spring Pool", "Salt Lake Shore",
    "Rice Paddy Trail", "Fishing Village Pier", "Lighthouse Point", "Mud Brick Village", "Pottery Kiln",
    "Bridge at Dawn", "Hafez Tomb Garden", "Nasir al-Mulk Interior", "Vakil Bazaar Arch", "Fin Garden Pool",
    "Pink Lake Shore", "Dasht-e Kavir Edge", "Canyon Pass", "Glacier Viewpoint", "Alpine Meadow",
    "Nomad Tent Camp", "Camel Caravan Path", "Silk Road Inn", "Mudbrick Fortress", "Satellite Dish Rooftop",
    "Tram Line Alley", "Cypress of Abarkuh", "Shushtar Waterfall", "Bisotun Inscription", "Persepolis Columns",
    "Naqsh-e Jahan Square", "Ali Qapu Terrace", "Chehel Sotoun Reflection", "Hasht Behesht Pavilion", "Si-o-se-pol Bridge",
    "Tabriz Grand Bazaar", "Blue Lake Alanduj", "Kandovan Cave Village", "Masuleh Stepped Village", "Rudkhan Castle Path",
    "Anjili Cave", "Harrah Protected Forest", "Lut Desert Yardangs", "Kavir National Park", "Golestan Palace Mirror Hall",
    "Darband Trail Start", "Darakeh Riverside", "Tajrish Square Stairs", "Lavasan Valley", "Fasham Mountain Road",
    "Robat Karim Sunflowers", "Varamin Caravanserai", "Qeshm Salt Cave", "Hormuz Rainbow Valley", "Kish Coral Beach",
    "Chabahar Bazaar", "Ramsar Cable Car View", "Javaher Deh Forest", "Fandoghlu Forest Path", "Asalem to Khalkhal Road",
    "Shirak Village Morning", "Kandovan Sunrise Point", "Abyaneh Red Village", "Masjed Soleyman Oil Well", "Abadan Refinery Sunset",
]

STREETS = [
    "St.", "Ave.", "Blvd.", "Alley", "Lane", "Road", "Path", "Sq.", "Passage", "Dead-end"
]
STREET_NAMES = [
    "Vali Asr", "Enghelab", "Azadi", "Taleghani", "Mollasadra", " Ferdowsi", "Jamhouri", "Mohtasham",
    "Chaharbagh", "Pamenar", "Laleh", "Park", "Darband", "Tajrish", "Saadi", "Hafez", "Zand",
    "Karim Khan", "Setareh", "Shirazi", "Isfahani", "Khorasani", "Tabrizi", "Shoushtari"
]

CITIES_DATA = {
    "Tehran": (35.6892, 51.3890),
    "Isfahan": (32.6546, 51.6680),
    "Shiraz": (29.5918, 52.5836),
    "Tabriz": (38.0800, 46.2919),
    "Mashhad": (36.2972, 59.6067),
    "Kerman": (30.2839, 57.0834),
    "Yazd": (31.8974, 54.3569),
    "Rasht": (37.2808, 49.5832),
    "Ahvaz": (31.3183, 48.6706),
    "Kish": (26.5611, 54.0183),
}

NEIGHBORHOODS_TEHRAN = [
    "نواب", "ونک", "تجریش", "ولنجک", "اندرزگو", "دیباجی", "سعادت‌آباد", "شهرک غرب",
    "گیشا", "پونک", "صدف", "جنت‌آباد", "پیروزی", "نارمک", "تهرانپارس", "هفت‌چنار",
    "بازار", "سنگلک", "امیرآباد", "انقلاب", "آریاشهر", "شهرری", " دولاب", "شادآباد",
]

NEIGHBORHOODS_ISFAHAN = ["نقش جهان", "جاده اصفهان-تهران", "میدان نقش جهان", "سی و سه پل", "کاخ عالی قاپو"]
NEIGHBORHOODS_SHIRAZ = ["حافظیه", "حافظ", "دروازه قرآن", "vakil", "نادری"]

def get_neighborhood(city):
    if city == "Tehran":
        return random.choice(NEIGHBORHOODS_TEHRAN)
    elif city == "Isfahan":
        return random.choice(NEIGHBORHOODS_ISFAHAN)
    elif city == "Shiraz":
        return random.choice(NEIGHBORHOODS_SHIRAZ)
    return ""

async def seed():
    async with async_session() as db:
        # Create users
        users = []
        phones = [f"0912{random.randint(1000000, 9999999)}" for _ in range(20)]
        for i, phone in enumerate(phones):
            u = User(phone=phone, name=f"Photographer {i+1}", coins=random.randint(5, 50))
            db.add(u)
            users.append(u)
        await db.flush()

        cities_list = list(CITIES_DATA.items())
        now = datetime.utcnow()

        for i in range(100):
            title = TITLES[i % len(TITLES)]
            if i >= len(TITLES):
                title += f" #{i+1}"

            city_name, (base_lat, base_lon) = random.choice(cities_list)
            lat = base_lat + random.uniform(-0.05, 0.05)
            lon = base_lon + random.uniform(-0.05, 0.05)

            neighborhood = get_neighborhood(city_name) if city_name == "Tehran" else ""
            street = f"{random.choice(STREET_NAMES)} {random.choice(STREETS)} {random.randint(1, 200)}"
            province_map = {
                "Tehran": "تهران", "Isfahan": "اصفهان", "Shiraz": "فارس",
                "Tabriz": "آذربایجان شرقی", "Mashhad": "خراسان رضوی",
                "Kerman": "کرمان", "Yazd": "یزد", "Rasht": "گیلان",
                "Ahvaz": "خوزستان", "Kish": "هرمزگان",
            }

            loc = Location(
                title=title,
                description=f"Beautiful portrait photography spot in {city_name}. Great lighting conditions during golden hour.",
                latitude=round(lat, 6),
                longitude=round(lon, 6),
                address=street,
                province=province_map.get(city_name, ""),
                city=city_name,
                neighborhood=neighborhood,
                status="approved",
                approved_at=now - timedelta(days=random.randint(1, 30)),
                user_id=random.choice(users).id,
                created_at=now - timedelta(days=random.randint(1, 60)),
            )
            db.add(loc)
            await db.flush()

            # Add image
            img = Image(
                filename="b46443decab6401682318f8046f2c44f.jpg",
                original_name=f"photo_{i+1}.jpg",
                location_id=loc.id,
                uploaded_at=loc.created_at,
            )
            db.add(img)

            # Add some ratings
            if random.random() < 0.4:
                num_ratings = random.randint(1, 4)
                raters = random.sample(users, min(num_ratings, len(users)))
                for rater in raters:
                    rating = Rating(
                        user_id=rater.id,
                        location_id=loc.id,
                        stars=random.randint(2, 5),
                        comment=random.choice([
                            None,
                            "Great spot for golden hour shots!",
                            "Beautiful light in the morning.",
                            "A bit crowded on weekends but worth it.",
                            "Perfect backdrop for portraits.",
                            "Amazing colors during sunset.",
                            "Good natural light, recommended.",
                            "The atmosphere is incredible here.",
                            "Not bad, but best visited off-season.",
                            "One of my favorite spots in the city.",
                            "Excellent location for backlit portraits.",
                            "Soft light all day long — perfect.",
                        ]),
                        created_at=now - timedelta(days=random.randint(0, 14)),
                    )
                    db.add(rating)

        await db.commit()
        print(f"Seeded {100} locations with images and ratings")

if __name__ == "__main__":
    asyncio.run(seed())
