from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.tourist_spot import TouristSpotInDB
from app.services.tourist_spot_service import get_tourist_spot, list_tourist_spots
from app.services.maps_service import (
    calculate_distance,
    get_route_directions,
    find_nearby_spots,
    get_navigation_data
)
from app.utils.security import get_current_user
from app.models.user import UserInDB
from typing import List, Optional
from pydantic import BaseModel

router = APIRouter(prefix="/maps", tags=["maps"])

class LocationRequest(BaseModel):
    latitude: float
    longitude: float

class RouteRequest(BaseModel):
    start_latitude: float
    start_longitude: float
    end_latitude: float
    end_longitude: float
    travel_mode: str = "driving"  # driving, walking, transit

class NavigationResponse(BaseModel):
    distance: float
    duration: str
    route_points: List[dict]
    instructions: List[str]

@router.post("/distance")
async def calculate_distance_between_points(
    start: LocationRequest,
    end: LocationRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Calculate distance between two GPS coordinates"""
    distance = calculate_distance(
        start.latitude, start.longitude,
        end.latitude, end.longitude
    )
    return {
        "distance_km": round(distance, 2),
        "distance_miles": round(distance * 0.621371, 2)
    }

@router.get("/nearby-spots")
async def get_nearby_tourist_spots(
    latitude: float = Query(..., description="Current latitude"),
    longitude: float = Query(..., description="Current longitude"),
    radius_km: float = Query(10, description="Search radius in kilometers"),
    limit: int = Query(10, description="Maximum number of spots to return"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Find tourist spots near a given location"""
    nearby_spots = await find_nearby_spots(latitude, longitude, radius_km, limit)
    return nearby_spots

@router.post("/route")
async def get_route_to_destination(
    route_request: RouteRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get navigation route between two points"""
    try:
        route_data = await get_route_directions(
            route_request.start_latitude,
            route_request.start_longitude,
            route_request.end_latitude,
            route_request.end_longitude,
            route_request.travel_mode
        )
        return route_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get route: {str(e)}"
        )

@router.get("/navigation/{spot_id}")
async def get_navigation_to_spot(
    spot_id: str,
    user_latitude: float = Query(..., description="User's current latitude"),
    user_longitude: float = Query(..., description="User's current longitude"),
    travel_mode: str = Query("driving", description="Travel mode"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get navigation data to a specific tourist spot"""
    # Get the tourist spot
    spot = await get_tourist_spot(spot_id)
    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    
    # Get navigation data
    navigation_data = await get_navigation_data(
        user_latitude, user_longitude,
        spot.location.latitude, spot.location.longitude,
        travel_mode
    )
    
    return {
        "destination": {
            "name": spot.name,
            "address": spot.location.address,
            "coordinates": {
                "latitude": spot.location.latitude,
                "longitude": spot.location.longitude
            }
        },
        "navigation": navigation_data
    }

@router.get("/spots-along-route")
async def get_spots_along_route(
    start_lat: float = Query(..., description="Start latitude"),
    start_lng: float = Query(..., description="Start longitude"),
    end_lat: float = Query(..., description="End latitude"),
    end_lng: float = Query(..., description="End longitude"),
    radius_km: float = Query(5, description="Search radius from route"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Find tourist spots along a route"""
    # This is a simplified implementation
    # In a real-world scenario, you'd use a proper routing service
    
    # Calculate midpoint
    mid_lat = (start_lat + end_lat) / 2
    mid_lng = (start_lng + end_lng) / 2
    
    # Find spots near the route
    spots_along_route = await find_nearby_spots(mid_lat, mid_lng, radius_km, 20)
    
    return {
        "route": {
            "start": {"latitude": start_lat, "longitude": start_lng},
            "end": {"latitude": end_lat, "longitude": end_lng}
        },
        "spots": spots_along_route
    }
