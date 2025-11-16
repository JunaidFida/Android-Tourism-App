#!/usr/bin/env python3
"""
Database seeding script for TouristApp
This script populates the database with sample data for testing
"""

import asyncio
import motor.motor_asyncio
from datetime import datetime, timedelta
from bson import ObjectId

# Sample data for different collections
SAMPLE_TOURIST_SPOTS = [
    {
        "name": "Badshahi Mosque",
        "description": "The Badshahi Mosque is a Mughal-era congregational mosque in Lahore, Punjab, Pakistan. It was built between 1671 and 1673 during the rule of Aurangzeb.",
        "location": {
            "latitude": 31.5879,
            "longitude": 74.3095,
            "address": "Fort Rd, Walled City of Lahore, Lahore, Punjab, Pakistan"
        },
        "region": "Punjab",
        "categories": ["historical", "religious"],
        "image_urls": [
            "https://example.com/images/badshahi_mosque_1.jpg",
            "https://example.com/images/badshahi_mosque_2.jpg"
        ],
        "rating": 4.5,
        "total_ratings": 1250,
        "entry_fee": 0.0,
        "opening_hours": "5:00 AM - 10:00 PM",
        "best_time_to_visit": "October to March"
    },
    {
        "name": "Hunza Valley",
        "description": "Hunza Valley is a mountainous valley in the Gilgit-Baltistan region of Pakistan. Known for its stunning natural beauty and the longevity of its people.",
        "location": {
            "latitude": 36.3167,
            "longitude": 74.6500,
            "address": "Hunza Valley, Gilgit-Baltistan, Pakistan"
        },
        "region": "Gilgit-Baltistan",
        "categories": ["natural", "adventure"],
        "image_urls": [
            "https://example.com/images/hunza_valley_1.jpg",
            "https://example.com/images/hunza_valley_2.jpg"
        ],
        "rating": 4.8,
        "total_ratings": 2100,
        "entry_fee": 500.0,
        "opening_hours": "24/7",
        "best_time_to_visit": "April to October"
    },
    {
        "name": "Shalimar Gardens",
        "description": "Shalimar Gardens is a Mughal garden complex located in Lahore, Punjab, Pakistan. It was built by the Mughal emperor Shah Jahan in 1641.",
        "location": {
            "latitude": 31.5947,
            "longitude": 74.3911,
            "address": "Grand Trunk Rd, Baghbanpura, Lahore, Punjab, Pakistan"
        },
        "region": "Punjab",
        "categories": ["historical", "cultural"],
        "image_urls": [
            "https://example.com/images/shalimar_gardens_1.jpg",
            "https://example.com/images/shalimar_gardens_2.jpg"
        ],
        "rating": 4.2,
        "total_ratings": 850,
        "entry_fee": 50.0,
        "opening_hours": "8:00 AM - 6:00 PM",
        "best_time_to_visit": "November to February"
    },
    {
        "name": "K2 Base Camp",
        "description": "K2 Base Camp is the starting point for climbing K2, the second highest mountain in the world. A challenging trek through the Karakoram mountains.",
        "location": {
            "latitude": 35.8825,
            "longitude": 76.5133,
            "address": "Karakoram Range, Gilgit-Baltistan, Pakistan"
        },
        "region": "Gilgit-Baltistan",
        "categories": ["adventure", "natural"],
        "image_urls": [
            "https://example.com/images/k2_base_camp_1.jpg",
            "https://example.com/images/k2_base_camp_2.jpg"
        ],
        "rating": 4.9,
        "total_ratings": 450,
        "entry_fee": 15000.0,
        "opening_hours": "Seasonal (June to September)",
        "best_time_to_visit": "June to September"
    },
    {
        "name": "Mohenjo-daro",
        "description": "Mohenjo-daro is an archaeological site in the province of Sindh, Pakistan. Built around 2500 BCE, it was one of the largest settlements of the ancient Indus Valley Civilization.",
        "location": {
            "latitude": 27.3244,
            "longitude": 68.1378,
            "address": "Larkana District, Sindh, Pakistan"
        },
        "region": "Sindh",
        "categories": ["historical", "cultural"],
        "image_urls": [
            "https://example.com/images/mohenjo_daro_1.jpg",
            "https://example.com/images/mohenjo_daro_2.jpg"
        ],
        "rating": 4.3,
        "total_ratings": 720,
        "entry_fee": 100.0,
        "opening_hours": "8:00 AM - 5:00 PM",
        "best_time_to_visit": "November to March"
    }
]

SAMPLE_TOUR_PACKAGES = [
    {
        "title": "Northern Pakistan Adventure",
        "description": "Explore the stunning landscapes of northern Pakistan including Hunza Valley, Skardu, and the Karakoram Highway. Perfect for adventure seekers and nature lovers.",
        "location": {
            "latitude": 36.3167,
            "longitude": 74.6500,
            "address": "Northern Pakistan"
        },
        "price": 85000.0,
        "duration_days": 10,
        "group_size": 15,
        "category": "adventure",
        "difficulty_level": "moderate",
        "included_spots": ["67507f5b7a4a4b001234567a", "67507f5b7a4a4b001234567d"],  # Will be updated with actual IDs
        "includes": [
            "Transportation",
            "Accommodation",
            "Meals",
            "Professional Guide",
            "Entry Permits"
        ],
        "excludes": [
            "International Flights",
            "Personal Expenses",
            "Travel Insurance"
        ],
        "itinerary": [
            {"day": 1, "title": "Arrival in Islamabad", "description": "Arrival and city tour"},
            {"day": 2, "title": "Drive to Hunza", "description": "Journey through Karakoram Highway"},
            {"day": 3, "title": "Hunza Exploration", "description": "Visit Altit and Baltit forts"}
        ],
        "image_urls": [
            "https://example.com/images/northern_pakistan_1.jpg",
            "https://example.com/images/northern_pakistan_2.jpg"
        ],
        "rating": 4.7,
        "total_ratings": 125,
        "available_dates": [
            datetime.now() + timedelta(days=30),
            datetime.now() + timedelta(days=60),
            datetime.now() + timedelta(days=90)
        ],
        "is_active": True,
        "created_by": "67507f5b7a4a4b001234568a",  # Will be updated with actual company ID
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    },
    {
        "title": "Cultural Heritage Tour",
        "description": "Discover Pakistan's rich cultural heritage visiting historical sites including Lahore Fort, Badshahi Mosque, and Shalimar Gardens.",
        "location": {
            "latitude": 31.5879,
            "longitude": 74.3095,
            "address": "Lahore, Punjab"
        },
        "price": 25000.0,
        "duration_days": 5,
        "group_size": 20,
        "category": "cultural",
        "difficulty_level": "easy",
        "included_spots": ["67507f5b7a4a4b001234567b", "67507f5b7a4a4b001234567c"],  # Will be updated with actual IDs
        "includes": [
            "Transportation",
            "Accommodation",
            "Breakfast",
            "Guided Tours"
        ],
        "excludes": [
            "Lunch and Dinner",
            "Personal Expenses",
            "Entry Fees"
        ],
        "itinerary": [
            {"day": 1, "title": "Lahore Fort", "description": "Explore the historic Lahore Fort"},
            {"day": 2, "title": "Badshahi Mosque", "description": "Visit the magnificent Badshahi Mosque"},
            {"day": 3, "title": "Shalimar Gardens", "description": "Stroll through the beautiful Mughal gardens"}
        ],
        "image_urls": [
            "https://example.com/images/cultural_tour_1.jpg",
            "https://example.com/images/cultural_tour_2.jpg"
        ],
        "rating": 4.4,
        "total_ratings": 85,
        "available_dates": [
            datetime.now() + timedelta(days=15),
            datetime.now() + timedelta(days=45),
            datetime.now() + timedelta(days=75)
        ],
        "is_active": True,
        "created_by": "67507f5b7a4a4b001234568a",  # Will be updated with actual company ID
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
]

SAMPLE_TRAVEL_COMPANY = {
    "email": "adventure.tours@example.com",
    "full_name": "Adventure Tours Pakistan",
    "phone_number": "+92-321-1234567",
    "role": "travel_company",
    "hashed_password": "$2b$12$example_hashed_password_here",  # Will be set properly
    "is_active": True,
    "preferences": {
        "preferred_categories": ["adventure", "cultural"],
        "preferred_regions": ["Punjab", "Gilgit-Baltistan"]
    },
    "created_at": datetime.now().isoformat(),
    "last_login": None
}

SAMPLE_TOURIST = {
    "email": "tourist@example.com",
    "full_name": "John Doe",
    "phone_number": "+92-300-9876543",
    "role": "tourist",
    "hashed_password": "$2b$12$example_hashed_password_here",  # Will be set properly
    "is_active": True,
    "preferences": {
        "preferred_categories": ["historical", "natural"],
        "budget_range": {"min": 20000, "max": 100000},
        "preferred_regions": ["Punjab", "Sindh"],
        "travel_style": "cultural",
        "group_size_preference": 10
    },
    "created_at": datetime.now().isoformat(),
    "last_login": None
}

async def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    import bcrypt
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

async def seed_database():
    """Main function to seed the database with sample data"""
    try:
        # Connect to MongoDB
        client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
        db = client["touristapp"]
        
        print("🔗 Connected to MongoDB")
        
        # Clear existing data (optional - comment out if you want to keep existing data)
        # await db.tourist_spots.delete_many({})
        # await db.tour_packages.delete_many({})
        # await db.users.delete_many({"role": {"$ne": "admin"}})  # Keep admin user
        # print("🗑️ Cleared existing data")
        
        # Hash passwords for sample users
        SAMPLE_TRAVEL_COMPANY["hashed_password"] = await hash_password("company123")
        SAMPLE_TOURIST["hashed_password"] = await hash_password("tourist123")
        
        # Insert sample users
        company_result = await db.users.insert_one(SAMPLE_TRAVEL_COMPANY)
        tourist_result = await db.users.insert_one(SAMPLE_TOURIST)
        print(f"👥 Created sample users:")
        print(f"   Travel Company: {SAMPLE_TRAVEL_COMPANY['email']} (password: company123)")
        print(f"   Tourist: {SAMPLE_TOURIST['email']} (password: tourist123)")
        
        # Insert tourist spots
        spots_result = await db.tourist_spots.insert_many(SAMPLE_TOURIST_SPOTS)
        spot_ids = spots_result.inserted_ids
        print(f"🏛️ Created {len(spot_ids)} tourist spots")
        
        # Update tour packages with actual spot IDs and company ID
        for i, package in enumerate(SAMPLE_TOUR_PACKAGES):
            # Assign some random spots to each package
            if i == 0:  # Northern Pakistan Adventure
                package["included_spots"] = [str(spot_ids[1]), str(spot_ids[3])]  # Hunza Valley, K2 Base Camp
            else:  # Cultural Heritage Tour
                package["included_spots"] = [str(spot_ids[0]), str(spot_ids[2])]  # Badshahi Mosque, Shalimar Gardens
            
            package["created_by"] = str(company_result.inserted_id)
        
        # Insert tour packages
        packages_result = await db.tour_packages.insert_many(SAMPLE_TOUR_PACKAGES)
        package_ids = packages_result.inserted_ids
        print(f"📦 Created {len(package_ids)} tour packages")
        
        # Create some sample bookings
        sample_bookings = [
            {
                "package_id": str(package_ids[0]),
                "user_id": str(tourist_result.inserted_id),
                "booking_date": datetime.now(),
                "travel_date": datetime.now() + timedelta(days=30),
                "travelers": 2,
                "total_amount": 170000.0,  # 2 people * 85000
                "status": "confirmed",
                "payment_status": "paid",
                "special_requests": "Vegetarian meals preferred",
                "created_at": datetime.now(),
                "updated_at": datetime.now()
            }
        ]
        
        bookings_result = await db.bookings.insert_many(sample_bookings)
        print(f"🎫 Created {len(bookings_result.inserted_ids)} sample bookings")
        
        # Create some sample ratings
        sample_ratings = [
            {
                "package_id": str(package_ids[0]),
                "user_id": str(tourist_result.inserted_id),
                "rating": 5,
                "review": "Absolutely amazing experience! The views were breathtaking and the guide was very knowledgeable.",
                "created_at": datetime.now()
            },
            {
                "package_id": str(package_ids[1]),
                "user_id": str(tourist_result.inserted_id),
                "rating": 4,
                "review": "Great cultural tour, learned a lot about Pakistan's history. Would recommend!",
                "created_at": datetime.now()
            }
        ]
        
        ratings_result = await db.ratings.insert_many(sample_ratings)
        print(f"⭐ Created {len(ratings_result.inserted_ids)} sample ratings")
        
        print("\n✅ Database seeding completed successfully!")
        print("\n📋 Sample Accounts Created:")
        print("   Admin: admin@touristapp.com (password: admin123)")
        print("   Travel Company: adventure.tours@example.com (password: company123)")
        print("   Tourist: tourist@example.com (password: tourist123)")
        
        # Close connection
        client.close()
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        raise e

if __name__ == "__main__":
    asyncio.run(seed_database())
