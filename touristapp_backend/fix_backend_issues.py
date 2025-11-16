#!/usr/bin/env python3
"""
Backend fixes for tourist app issues
Run this script to fix common backend issues
"""

import asyncio
import sys
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime
import logging

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def fix_tour_package_field_names():
    """Fix tour package field name inconsistencies"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tourist_app
    
    logger.info("Fixing tour package field names...")
    
    # Update packages that have 'title' but no 'name'
    result = await db.tour_packages.update_many(
        {"title": {"$exists": True}, "name": {"$exists": False}},
        [{"$set": {"name": "$title"}}]
    )
    logger.info(f"Updated {result.modified_count} packages with name field")
    
    # Update packages that have 'group_size' but no 'max_participants'
    result = await db.tour_packages.update_many(
        {"group_size": {"$exists": True}, "max_participants": {"$exists": False}},
        [{"$set": {"max_participants": "$group_size"}}]
    )
    logger.info(f"Updated {result.modified_count} packages with max_participants field")
    
    # Ensure all packages have current_participants field
    result = await db.tour_packages.update_many(
        {"current_participants": {"$exists": False}},
        {"$set": {"current_participants": 0}}
    )
    logger.info(f"Added current_participants to {result.modified_count} packages")
    
    # Ensure all packages have status field
    result = await db.tour_packages.update_many(
        {"status": {"$exists": False}},
        {"$set": {"status": "active"}}
    )
    logger.info(f"Added status to {result.modified_count} packages")
    
    # Ensure all packages have average_rating and total_ratings
    result = await db.tour_packages.update_many(
        {"average_rating": {"$exists": False}},
        {"$set": {"average_rating": 0.0, "total_ratings": 0}}
    )
    logger.info(f"Added rating fields to {result.modified_count} packages")
    
    await client.close()

async def fix_user_profile_fields():
    """Ensure all users have required profile fields"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tourist_app
    
    logger.info("Fixing user profile fields...")
    
    # Ensure all users have is_active field
    result = await db.users.update_many(
        {"is_active": {"$exists": False}},
        {"$set": {"is_active": True}}
    )
    logger.info(f"Added is_active to {result.modified_count} users")
    
    # Ensure all users have created_at field
    result = await db.users.update_many(
        {"created_at": {"$exists": False}},
        {"$set": {"created_at": datetime.now().isoformat()}}
    )
    logger.info(f"Added created_at to {result.modified_count} users")
    
    await client.close()

async def fix_booking_references():
    """Ensure all bookings have booking references"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tourist_app
    
    logger.info("Fixing booking references...")
    
    import random
    import string
    
    # Find bookings without booking_reference
    bookings = await db.bookings.find({"booking_reference": {"$exists": False}}).to_list(None)
    
    for booking in bookings:
        # Generate booking reference
        booking_reference = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        
        await db.bookings.update_one(
            {"_id": booking["_id"]},
            {"$set": {"booking_reference": booking_reference}}
        )
    
    logger.info(f"Added booking references to {len(bookings)} bookings")
    
    await client.close()

async def create_indexes():
    """Create necessary database indexes for performance"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tourist_app
    
    logger.info("Creating database indexes...")
    
    # User indexes
    await db.users.create_index("email", unique=True)
    await db.users.create_index("role")
    await db.users.create_index("is_active")
    
    # Tour package indexes
    await db.tour_packages.create_index("status")
    await db.tour_packages.create_index("category")
    await db.tour_packages.create_index("price")
    await db.tour_packages.create_index("created_by")
    await db.tour_packages.create_index([("name", "text"), ("description", "text")])
    
    # Booking indexes
    await db.bookings.create_index("tourist_id")
    await db.bookings.create_index("tour_package_id")
    await db.bookings.create_index("status")
    await db.bookings.create_index("booking_date")
    await db.bookings.create_index("booking_reference", unique=True)
    
    # Tourist spot indexes
    await db.tourist_spots.create_index("category")
    await db.tourist_spots.create_index("region")
    await db.tourist_spots.create_index([("name", "text"), ("description", "text")])
    await db.tourist_spots.create_index([("location.latitude", "2dsphere")])
    
    # Rating indexes
    await db.ratings.create_index("tourist_id")
    await db.ratings.create_index("tour_package_id")
    await db.ratings.create_index("tourist_spot_id")
    
    logger.info("Database indexes created successfully")
    
    await client.close()

async def validate_data_integrity():
    """Validate data integrity and fix common issues"""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.tourist_app
    
    logger.info("Validating data integrity...")
    
    # Check for orphaned bookings (bookings with non-existent packages or users)
    bookings = await db.bookings.find({}).to_list(None)
    orphaned_bookings = 0
    
    for booking in bookings:
        # Check if tour package exists
        package = await db.tour_packages.find_one({"_id": booking["tour_package_id"]})
        if not package:
            logger.warning(f"Orphaned booking {booking['_id']} - package not found")
            orphaned_bookings += 1
        
        # Check if user exists
        user = await db.users.find_one({"_id": booking["tourist_id"]})
        if not user:
            logger.warning(f"Orphaned booking {booking['_id']} - user not found")
            orphaned_bookings += 1
    
    logger.info(f"Found {orphaned_bookings} orphaned bookings")
    
    # Check for packages with invalid current_participants
    packages = await db.tour_packages.find({}).to_list(None)
    fixed_participants = 0
    
    for package in packages:
        # Count actual bookings
        actual_participants = await db.bookings.aggregate([
            {"$match": {
                "tour_package_id": package["_id"],
                "status": {"$in": ["confirmed", "pending"]}
            }},
            {"$group": {"_id": None, "total": {"$sum": "$number_of_people"}}}
        ]).to_list(1)
        
        actual_count = actual_participants[0]["total"] if actual_participants else 0
        current_count = package.get("current_participants", 0)
        
        if actual_count != current_count:
            await db.tour_packages.update_one(
                {"_id": package["_id"]},
                {"$set": {"current_participants": actual_count}}
            )
            fixed_participants += 1
            logger.info(f"Fixed participants count for package {package['_id']}: {current_count} -> {actual_count}")
    
    logger.info(f"Fixed participant counts for {fixed_participants} packages")
    
    await client.close()

async def main():
    """Run all backend fixes"""
    logger.info("Starting backend fixes...")
    
    try:
        await fix_tour_package_field_names()
        await fix_user_profile_fields()
        await fix_booking_references()
        await create_indexes()
        await validate_data_integrity()
        
        logger.info("All backend fixes completed successfully!")
        
    except Exception as e:
        logger.error(f"Error running backend fixes: {e}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())