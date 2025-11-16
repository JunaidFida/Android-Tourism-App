from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client = AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.MONGODB_NAME]

def get_db():
    return db


async def get_database():
    """Async-compatible accessor for the shared MongoDB database."""
    return db