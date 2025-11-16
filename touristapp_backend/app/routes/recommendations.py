from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.services.recommendation_service import RecommendationEngine
from app.services.ai_recommendation_service import ai_recommendation_engine
from app.utils.security import get_current_user
from app.models.user import UserInDB
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/recommendations", tags=["recommendations"])

class LocationInput(BaseModel):
    latitude: float
    longitude: float

@router.get("/spots")
async def get_personalized_spot_recommendations(
    limit: int = Query(10, description="Number of recommendations to return"),
    use_ai: bool = Query(True, description="Use AI-powered recommendations"),
    latitude: Optional[float] = Query(None, description="User's current latitude"),
    longitude: Optional[float] = Query(None, description="User's current longitude"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get personalized tourist spot recommendations with AI"""
    user_location = None
    if latitude is not None and longitude is not None:
        user_location = {"latitude": latitude, "longitude": longitude}
    
    if use_ai:
        recommendations = await ai_recommendation_engine.get_ai_spot_recommendations(
            current_user.id, limit
        )
    else:
        recommendations = await RecommendationEngine.get_personalized_spots(
            user=current_user,
            limit=limit,
            user_location=user_location
        )
    
    return {
        "user_id": current_user.id,
        "recommendations": recommendations,
        "total": len(recommendations),
        "ai_powered": use_ai
    }

@router.get("/packages")
async def get_personalized_package_recommendations(
    limit: int = Query(10, description="Number of recommendations to return"),
    use_ai: bool = Query(True, description="Use AI-powered recommendations"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get personalized tour package recommendations with AI"""
    if use_ai:
        recommendations = await ai_recommendation_engine.get_ai_package_recommendations(
            current_user.id, limit
        )
    else:
        recommendations = await RecommendationEngine.get_personalized_packages(
            user=current_user,
            limit=limit
        )
    
    return {
        "user_id": current_user.id,
        "recommendations": recommendations,
        "total": len(recommendations),
        "ai_powered": use_ai
    }

@router.get("/spots/{spot_id}/similar")
async def get_similar_spots(
    spot_id: str,
    limit: int = Query(5, description="Number of similar spots to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get spots similar to a given spot"""
    similar_spots = await RecommendationEngine.get_similar_spots(
        spot_id=spot_id,
        limit=limit
    )
    
    if not similar_spots:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No similar spots found or spot does not exist"
        )
    
    return {
        "reference_spot_id": spot_id,
        "similar_spots": similar_spots,
        "total": len(similar_spots)
    }

@router.get("/trending/spots")
async def get_trending_spots(
    limit: int = Query(10, description="Number of trending spots to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get currently trending tourist spots"""
    trending_spots = await RecommendationEngine.get_trending_spots(limit=limit)
    
    return {
        "trending_spots": trending_spots,
        "total": len(trending_spots)
    }

@router.get("/for-budget")
async def get_budget_friendly_recommendations(
    max_budget: float = Query(..., description="Maximum budget for recommendations"),
    limit: int = Query(10, description="Number of recommendations to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get recommendations within a specific budget"""
    # Update user's budget preference temporarily for this request
    temp_user = current_user
    if not temp_user.preferences:
        from app.models.user import UserPreferences
        temp_user.preferences = UserPreferences()
    
    temp_user.preferences.budget_range = {"min": 0, "max": max_budget}
    
    spot_recommendations = await RecommendationEngine.get_personalized_spots(
        user=temp_user,
        limit=limit//2
    )
    
    package_recommendations = await RecommendationEngine.get_personalized_packages(
        user=temp_user,
        limit=limit//2
    )
    
    return {
        "budget_limit": max_budget,
        "spot_recommendations": spot_recommendations,
        "package_recommendations": package_recommendations
    }

@router.get("/by-category")
async def get_recommendations_by_category(
    categories: List[str] = Query(..., description="Categories to filter by"),
    limit: int = Query(10, description="Number of recommendations to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get recommendations filtered by specific categories"""
    # Update user preferences temporarily
    temp_user = current_user
    if not temp_user.preferences:
        from app.models.user import UserPreferences
        temp_user.preferences = UserPreferences()
    
    temp_user.preferences.preferred_categories = categories
    
    recommendations = await RecommendationEngine.get_personalized_spots(
        user=temp_user,
        limit=limit
    )
    
    return {
        "categories": categories,
        "recommendations": recommendations,
        "total": len(recommendations)
    }

@router.post("/update-preferences")
async def update_user_preferences(
    preferences: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update user preferences for better recommendations"""
    from app.database import get_db
    from app.models.user import UserPreferences
    from bson import ObjectId
    
    try:
        # Validate and create preferences object
        user_preferences = UserPreferences(**preferences)
        
        # Update user in database
        db = get_db()
        users_collection = db["users"]
        
        result = await users_collection.update_one(
            {"_id": ObjectId(current_user.id)},
            {"$set": {"preferences": user_preferences.dict()}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or preferences not updated"
            )
        
        return {
            "message": "Preferences updated successfully",
            "preferences": user_preferences.dict()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid preferences format: {str(e)}"
        )
