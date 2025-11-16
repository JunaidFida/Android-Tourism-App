from typing import List, Optional
from app.models.spot_rating import SpotRatingCreate, SpotRatingInDB
from app.database import get_db
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

async def create_spot_rating(rating: SpotRatingCreate):
    db = get_db()
    
    # Validate tourist spot exists
    try:
        spot_object_id = ObjectId(rating.tourist_spot_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid tourist spot identifier provided"
        )
    
    # Check if spot exists
    spot = await db.tourist_spots.find_one({"_id": spot_object_id})
    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    
    # Check if user has already rated this spot
    existing_rating = await db.spot_ratings.find_one({
        "tourist_spot_id": rating.tourist_spot_id,
        "tourist_id": rating.tourist_id
    })
    
    if existing_rating:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You've already rated this tourist spot"
        )
    
    # Validate rating value
    if not 1 <= rating.rating <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    # Create rating payload
    rating_payload = rating.dict()
    rating_payload["created_at"] = datetime.utcnow()
    
    # Insert rating
    result = await db.spot_ratings.insert_one(rating_payload)
    created_rating = await db.spot_ratings.find_one({"_id": result.inserted_id})
    
    # Update spot's average rating
    await update_spot_average_rating(rating.tourist_spot_id)
    
    return SpotRatingInDB.from_mongo(created_rating)

async def update_spot_average_rating(spot_id: str):
    """Calculate and update the average rating for a tourist spot"""
    db = get_db()
    
    try:
        spot_object_id = ObjectId(spot_id)
    except Exception:
        return
    
    # Calculate new average rating
    pipeline = [
        {"$match": {"tourist_spot_id": spot_id}},
        {"$group": {
            "_id": None,
            "average_rating": {"$avg": "$rating"},
            "count": {"$sum": 1}
        }}
    ]
    
    result = await db.spot_ratings.aggregate(pipeline).to_list(length=1)
    
    if result:
        avg_rating = round(result[0]["average_rating"], 1)
        count = result[0]["count"]
        
        await db.tourist_spots.update_one(
            {"_id": spot_object_id},
            {"$set": {
                "rating": avg_rating,
                "total_ratings": count
            }}
        )
    else:
        # No ratings, set to 0
        await db.tourist_spots.update_one(
            {"_id": spot_object_id},
            {"$set": {
                "rating": 0.0,
                "total_ratings": 0
            }}
        )

async def get_spot_ratings(spot_id: str) -> List[SpotRatingInDB]:
    """Get all ratings for a tourist spot"""
    db = get_db()
    ratings = await db.spot_ratings.find({"tourist_spot_id": spot_id}).sort("created_at", -1).to_list(None)
    return [SpotRatingInDB.from_mongo(rating) for rating in ratings]

async def get_user_spot_ratings(user_id: str) -> List[SpotRatingInDB]:
    """Get all spot ratings by a user"""
    db = get_db()
    ratings = await db.spot_ratings.find({"tourist_id": user_id}).sort("created_at", -1).to_list(None)
    return [SpotRatingInDB.from_mongo(rating) for rating in ratings]

async def update_spot_rating(rating_id: str, tourist_id: str, rating: int, review: Optional[str] = None) -> SpotRatingInDB:
    """Update an existing spot rating"""
    db = get_db()
    
    try:
        rating_object_id = ObjectId(rating_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rating identifier provided"
        )
    
    # Validate rating value
    if not 1 <= rating <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    # Find and update rating (only if owned by user)
    existing_rating = await db.spot_ratings.find_one({
        "_id": rating_object_id,
        "tourist_id": tourist_id
    })
    
    if not existing_rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found or you don't have permission to update it"
        )
    
    # Update rating
    update_data = {"rating": rating}
    if review is not None:
        update_data["review"] = review
    
    await db.spot_ratings.update_one(
        {"_id": rating_object_id},
        {"$set": update_data}
    )
    
    # Update spot's average rating
    await update_spot_average_rating(existing_rating["tourist_spot_id"])
    
    # Return updated rating
    updated_rating = await db.spot_ratings.find_one({"_id": rating_object_id})
    return SpotRatingInDB.from_mongo(updated_rating)

async def delete_spot_rating(rating_id: str, tourist_id: str) -> bool:
    """Delete a spot rating"""
    db = get_db()
    
    try:
        rating_object_id = ObjectId(rating_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid rating identifier provided"
        )
    
    # Find rating (only if owned by user)
    existing_rating = await db.spot_ratings.find_one({
        "_id": rating_object_id,
        "tourist_id": tourist_id
    })
    
    if not existing_rating:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rating not found or you don't have permission to delete it"
        )
    
    spot_id = existing_rating["tourist_spot_id"]
    
    # Delete rating
    result = await db.spot_ratings.delete_one({"_id": rating_object_id})
    
    if result.deleted_count == 0:
        return False
    
    # Update spot's average rating
    await update_spot_average_rating(spot_id)
    
    return True

