from fastapi import APIRouter, Depends, HTTPException, status
from app.models.rating import RatingCreate, RatingInDB
from app.services.rating_service import (
    create_rating,
    get_ratings_for_package,
    get_user_ratings
)
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from typing import List

router = APIRouter(prefix="/ratings", tags=["ratings"])

@router.post("/", response_model=RatingInDB)
async def create_new_rating(
    rating: RatingCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only tourists can create ratings
    if current_user.role != UserRole.TOURIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can create ratings"
        )
    
    # Ensure the rating is being created by the logged-in user
    if rating.tourist_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create ratings for yourself"
        )
    
    return await create_rating(rating)

@router.get("/package/{package_id}", response_model=List[RatingInDB])
async def get_package_ratings(package_id: str):
    return await get_ratings_for_package(package_id)

@router.get("/user/{user_id}", response_model=List[RatingInDB])
async def get_user_ratings_list(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Users can only see their own ratings or admin can see all
    if current_user.role != UserRole.ADMIN and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these ratings"
        )
    
    return await get_user_ratings(user_id)