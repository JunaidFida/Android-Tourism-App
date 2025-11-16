from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import (
    auth,
    users,
    tour_packages,
    tourist_spots,
    bookings,
    ratings,
    maps,
    recommendations,
    analytics,
    admin,
    images,
    system_settings
)
from app.database import get_db
import motor.motor_asyncio
from app.models.user import UserCreate, UserRole
from app.services.user_service import create_user, get_user_by_email
from app.utils.security import get_password_hash

app = FastAPI(title="TouristApp Backend", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(tour_packages.router)
app.include_router(tourist_spots.router)
app.include_router(bookings.router)
app.include_router(ratings.router)
app.include_router(maps.router)
app.include_router(recommendations.router)
app.include_router(analytics.router)
app.include_router(admin.router)
app.include_router(images.router)
app.include_router(system_settings.router)

# Static files
from fastapi.staticfiles import StaticFiles
app.mount("/static", StaticFiles(directory="static"), name="static")

# Admin creation function
async def create_default_admin():
    """Create default admin user if it doesn't exist"""
    try:
        # Check if admin already exists
        admin_email = "admin@touristapp.com"
        existing_admin = await get_user_by_email(admin_email)
        
        if existing_admin:
            print(f"Admin user already exists: {admin_email}")
            return
        
        # Create default admin user
        admin_user = UserCreate(
            email=admin_email,
            full_name="System Administrator",
            phone_number="+1234567890",
            password="admin123",  # Change this in production!
            role=UserRole.ADMIN
        )
        
        await create_user(admin_user)
        print(f"Default admin user created: {admin_email}")
        print(f"Please change the default password for security!")
        
    except Exception as e:
        print(f"Error creating admin user: {e}")

# Health check endpoint
@app.get("/health-check", tags=["Root"])
async def health_check():
    return {"message": "API is up and running"}

@app.on_event("startup")
async def startup_db_client():
    try:
        app.mongodb_client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
        app.mongodb = app.mongodb_client["touristapp"]
        
        # Test the connection
        await app.mongodb_client.admin.command('ping')
        print("Connected to MongoDB successfully")
        
        # Create default admin user only
        await create_default_admin()
        print("Admin initialization completed")
        
    except Exception as e:
        print(f"Failed to connect to MongoDB: {e}")
        raise e

@app.on_event("shutdown")
async def shutdown_db_client():
    app.mongodb_client.close()

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to TouristApp Backend API"}