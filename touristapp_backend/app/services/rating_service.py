from typing import List
from app.models.rating import RatingCreate, RatingInDB
from app.models.booking import BookingStatus
from app.database import get_db
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

async def create_rating(rating: RatingCreate):
    db = get_db()
    
    # Check if the user has booked this package
    try:
        package_object_id = ObjectId(rating.tour_package_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tour package identifier provided"
        )

    booking_query = {
        "tour_package_id": package_object_id,
        "tourist_id": rating.tourist_id,
        "status": "completed"
    }

    if rating.booking_id:
        try:
            booking_query["_id"] = ObjectId(rating.booking_id)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid booking identifier provided"
            )

    booking = await db.bookings.find_one(booking_query)
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can only rate packages you've completed"
        )
    
    # Check if user has already rated this package
    existing_rating = await db.ratings.find_one({
        "tour_package_id": rating.tour_package_id,
        "tourist_id": rating.tourist_id
    })
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You've already rated this package"
        )
    
    # Validate rating value
    if not 1 <= rating.rating <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    rating_payload = rating.dict()
    rating_payload["tour_package_id"] = rating.tour_package_id

    # make sure chained string/None values don't break ObjectId-sensitive fields
    rating_payload["booking_id"] = rating.booking_id or (
        str(booking["_id"]) if booking else None
    )

    # Add created_at timestamp
    rating_payload["created_at"] = datetime.utcnow()
    
    result = await db.ratings.insert_one(rating_payload)
    created_rating = await db.ratings.find_one({"_id": result.inserted_id})
    
    # Update package average rating
    await update_package_rating(rating.tour_package_id)
    
    return RatingInDB.from_mongo(created_rating)

async def update_package_rating(package_id: str):
    db = get_db()
    
    try:
        package_object_id = ObjectId(package_id)
    except Exception:
        return
    
    # Calculate new average rating
    pipeline = [
        {"$match": {"tour_package_id": package_id}},
        {"$group": {
            "_id": None,
            "average_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.ratings.aggregate(pipeline).to_list(length=1)
    
    if result:
        avg_rating = round(result[0]["average_rating"], 1)
        count = result[0]["count"]
        
        await db.tour_packages.update_one(
            {"_id": package_object_id},
            {"$set": {
                "average_rating": avg_rating,
                "rating_count": count
            }}
        )
    else:
        # No ratings, set to 0
        await db.tour_packages.update_one(
            {"_id": package_object_id},
            {"$set": {
                "average_rating": 0.0,
                "rating_count": 0
            }}
        )

async def get_ratings_for_package(package_id: str):
    db = get_db()
    ratings = await db.ratings.find({"tour_package_id": package_id}).sort("created_at", -1).to_list(None)
    return [RatingInDB.from_mongo(rating) for rating in ratings]

async def get_user_ratings(user_id: str):
    db = get_db()
    ratings = await db.ratings.find({"tourist_id": user_id}).sort("created_at", -1).to_list(None)
    return [RatingInDB.from_mongo(rating) for rating in ratings]