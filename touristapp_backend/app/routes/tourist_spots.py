from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.requests import Request
from app.models.tourist_spot import (
    TouristSpotCreate,
    TouristSpotInDB,
    TouristSpotUpdate,
    SpotCategory,
    SpotStatus
)
from app.models.spot_rating import SpotRatingCreate, SpotRatingInDB
from app.services.tourist_spot_service import (
    create_tourist_spot,
    get_tourist_spot,
    list_tourist_spots,
    update_tourist_spot,
    delete_tourist_spot,
    get_company_spots,
    update_spot_status,
    get_pending_spots
)
from app.services.spot_rating_service import (
    create_spot_rating,
    get_spot_ratings,
    update_spot_rating,
    delete_spot_rating
)
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from typing import List, Optional
from pydantic import BaseModel as PydanticBaseModel

router = APIRouter(prefix="/tourist-spots", tags=["tourist-spots"])

@router.post("/", response_model=TouristSpotInDB)
async def create_new_tourist_spot(
    spot: TouristSpotCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin can create tourist spots directly (they are auto-approved)
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can create tourist spots"
        )
    
    return await create_tourist_spot(spot, created_by=str(current_user.id))

@router.get("/", response_model=List[TouristSpotInDB])
async def get_all_tourist_spots(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    region: Optional[str] = None,
    categories: Optional[List[SpotCategory]] = Query(None)
):
    return await list_tourist_spots(
        skip=skip,
        limit=limit,
        search=search,
        region=region,
        categories=categories
    )

@router.get("/{spot_id}", response_model=TouristSpotInDB)
async def get_single_tourist_spot(spot_id: str):
    spot = await get_tourist_spot(spot_id)
    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    return spot

@router.put("/{spot_id}", response_model=TouristSpotInDB)
async def update_tourist_spot_details(
    spot_id: str,
    spot_update: TouristSpotUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin can update tourist spots
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update tourist spots"
        )
    
    return await update_tourist_spot(spot_id, spot_update)

@router.delete("/{spot_id}")
async def delete_tourist_spot_route(
    spot_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin can delete tourist spots
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete tourist spots"
        )
    
    success = await delete_tourist_spot(spot_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tourist spot"
        )
    return {"message": "Tourist spot deleted successfully"}

@router.get("/check-location")
async def check_spot_location(
    latitude: float = Query(...),
    longitude: float = Query(...),
    radius: int = Query(100),
    current_user: UserInDB = Depends(get_current_user)
):
    """Check if a tourist spot exists at the given location within the specified radius."""
    try:
        from app.database import get_db
        from geopy.distance import geodesic
        
        db = get_db()
        
        # Get all spots
        spots_cursor = db.tourist_spots.find()
        existing_spots = []
        
        async for spot in spots_cursor:
            if 'location' in spot and 'latitude' in spot['location'] and 'longitude' in spot['location']:
                spot_location = (spot['location']['latitude'], spot['location']['longitude'])
                check_location = (latitude, longitude)
                distance = geodesic(spot_location, check_location).meters
                
                if distance <= radius:
                    existing_spots.append({
                        'id': str(spot['_id']),
                        'name': spot['name'],
                        'distance': distance,
                        'location': spot['location']
                    })
        
        if existing_spots:
            # Sort by distance and return the closest one
            existing_spots.sort(key=lambda x: x['distance'])
            return {
                'exists': True,
                'spot': existing_spots[0],
                'all_nearby': existing_spots
            }
        else:
            return {'exists': False}
            
    except Exception as e:
        print(f"Error checking location: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check location"
        )

# Spot Rating Request Models
class SpotRatingRequest(PydanticBaseModel):
    rating: int
    review: Optional[str] = None

class SpotRatingUpdateRequest(PydanticBaseModel):
    rating_id: str
    rating: int
    review: Optional[str] = None

# Spot Rating Routes
@router.post("/{spot_id}/rating", response_model=SpotRatingInDB)
async def create_spot_rating_route(
    spot_id: str,
    rating_data: SpotRatingRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Create a rating for a tourist spot"""
    # Only tourists can rate spots
    if current_user.role != UserRole.TOURIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can rate tourist spots"
        )
    
    # Create rating object
    spot_rating = SpotRatingCreate(
        tourist_spot_id=spot_id,
        tourist_id=str(current_user.id),
        rating=rating_data.rating,
        review=rating_data.review
    )
    
    return await create_spot_rating(spot_rating)

@router.get("/{spot_id}/ratings", response_model=List[SpotRatingInDB])
async def get_spot_ratings_route(spot_id: str):
    """Get all ratings for a tourist spot"""
    return await get_spot_ratings(spot_id)

@router.put("/{spot_id}/rating", response_model=SpotRatingInDB)
async def update_spot_rating_route(
    spot_id: str,
    rating_data: SpotRatingUpdateRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a rating for a tourist spot"""
    # Only tourists can update their ratings
    if current_user.role != UserRole.TOURIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can update ratings"
        )
    
    return await update_spot_rating(
        rating_id=rating_data.rating_id,
        tourist_id=str(current_user.id),
        rating=rating_data.rating,
        review=rating_data.review
    )

@router.delete("/{spot_id}/rating")
async def delete_spot_rating_route(
    spot_id: str,
    rating_id: str = Query(...),
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a rating for a tourist spot"""
    # Only tourists can delete their ratings
    if current_user.role != UserRole.TOURIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can delete ratings"
        )
    
    success = await delete_spot_rating(rating_id, str(current_user.id))
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete rating"
        )
    return {"message": "Rating deleted successfully"}

# Company Routes for Tourist Spots
@router.post("/company/add", response_model=TouristSpotInDB)
async def company_add_tourist_spot(
    request: Request,
    current_user: UserInDB = Depends(get_current_user)
):
    """Company or Admin creates a tourist spot (status: pending for companies, approved for admin)"""
    # Only travel companies and admin can create spots
    if current_user.role not in [UserRole.TRAVEL_COMPANY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies and admin can create tourist spots"
        )
    
    try:
        # Get request body as dict
        spot_data = await request.json()
        
        # Convert category strings to SpotCategory enums if needed
        if "categories" in spot_data and spot_data["categories"]:
            validated_categories = []
            for cat in spot_data["categories"]:
                if isinstance(cat, str):
                    cat_lower = cat.lower()
                    try:
                        validated_categories.append(SpotCategory(cat_lower))
                    except ValueError:
                        # Skip invalid categories
                        continue
                elif isinstance(cat, SpotCategory):
                    validated_categories.append(cat)
            spot_data["categories"] = validated_categories
        
        # Remove status from request data - we'll set it based on user role
        spot_data.pop("status", None)
        
        # Create Pydantic model from dict
        spot = TouristSpotCreate(**spot_data)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category or data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid spot data: {str(e)}"
        )
    
    # Admin creates spots as approved, companies create as pending
    company_id = str(current_user.id) if current_user.role == UserRole.TRAVEL_COMPANY else None
    
    # Create spot with company_id and status
    created_spot = await create_tourist_spot(
        spot,
        created_by=str(current_user.id),
        company_id=company_id
    )
    
    return created_spot

@router.get("/company/my-spots", response_model=List[TouristSpotInDB])
async def get_company_spots_route(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all spots created by the company"""
    # Only travel companies can access their spots
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access their spots"
        )
    
    return await get_company_spots(str(current_user.id))

@router.put("/company/{spot_id}", response_model=TouristSpotInDB)
async def company_update_tourist_spot(
    spot_id: str,
    spot_update: TouristSpotUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Company updates their own tourist spot"""
    # Only travel companies can update their spots
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can update their spots"
        )
    
    # Verify the spot belongs to this company
    spot = await get_tourist_spot(spot_id)
    if not spot.company_id or spot.company_id != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update your own tourist spots"
        )
    
    # Companies cannot change status (only admin can)
    if spot_update.status:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change the status of a tourist spot"
        )
    
    return await update_tourist_spot(spot_id, spot_update)

@router.delete("/company/{spot_id}")
async def company_delete_tourist_spot(
    spot_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Company deletes their own tourist spot"""
    # Only travel companies and admin can delete spots
    if current_user.role not in [UserRole.TRAVEL_COMPANY, UserRole.ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies and admin can delete spots"
        )
    
    # Validate spot_id
    if not spot_id or spot_id == "undefined" or spot_id == "null":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID"
        )
    
    try:
        from bson import ObjectId
        # Validate ObjectId format
        ObjectId(spot_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID format"
        )
    
    # Verify the spot belongs to this company (unless admin)
    if current_user.role != UserRole.ADMIN:
        try:
            spot = await get_tourist_spot(spot_id)
            if not spot.company_id or spot.company_id != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only delete your own tourist spots"
                )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tourist spot not found"
            )
    
    success = await delete_tourist_spot(spot_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tourist spot"
        )
    return {"message": "Tourist spot deleted successfully"}