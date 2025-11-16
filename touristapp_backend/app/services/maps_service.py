import math
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models.tourist_spot import TouristSpotInDB
from bson import ObjectId

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees) using Haversine formula
    Returns distance in kilometers
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    
    # Radius of earth in kilometers
    r = 6371
    return c * r

async def find_nearby_spots(
    latitude: float, 
    longitude: float, 
    radius_km: float, 
    limit: int = 10
) -> List[Dict[str, Any]]:
    """Find tourist spots within a given radius of a location"""
    db = get_db()
    collection = db["tourist_spots"]
    
    # Get all tourist spots
    cursor = collection.find({})
    all_spots = await cursor.to_list(length=None)
    
    nearby_spots = []
    
    for spot_data in all_spots:
        # Calculate distance to each spot
        if "location" in spot_data and "latitude" in spot_data["location"]:
            spot_lat = spot_data["location"]["latitude"]
            spot_lon = spot_data["location"]["longitude"]
            
            distance = calculate_distance(latitude, longitude, spot_lat, spot_lon)
            
            if distance <= radius_km:
                spot_dict = {
                    "id": str(spot_data["_id"]),
                    "name": spot_data["name"],
                    "description": spot_data["description"],
                    "location": spot_data["location"],
                    "region": spot_data["region"],
                    "categories": spot_data["categories"],
                    "rating": spot_data.get("rating", 0.0),
                    "distance_km": round(distance, 2),
                    "entry_fee": spot_data.get("entry_fee", 0.0),
                    "opening_hours": spot_data.get("opening_hours"),
                    "image_urls": spot_data.get("image_urls", [])
                }
                nearby_spots.append(spot_dict)
    
    # Sort by distance and limit results
    nearby_spots.sort(key=lambda x: x["distance_km"])
    return nearby_spots[:limit]

async def get_route_directions(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    travel_mode: str = "driving"
) -> Dict[str, Any]:
    """
    Get route directions between two points
    This is a simplified implementation. In production, you'd use a service like Google Maps API
    """
    distance = calculate_distance(start_lat, start_lon, end_lat, end_lon)
    
    # Simplified duration calculation based on travel mode
    speed_kmh = {
        "driving": 50,
        "walking": 5,
        "transit": 30
    }
    
    duration_hours = distance / speed_kmh.get(travel_mode, 50)
    duration_minutes = int(duration_hours * 60)
    
    # Generate simplified route points (in reality, this would come from a routing service)
    route_points = [
        {"latitude": start_lat, "longitude": start_lon},
        {"latitude": end_lat, "longitude": end_lon}
    ]
    
    # Generate basic instructions
    bearing = calculate_bearing(start_lat, start_lon, end_lat, end_lon)
    direction = get_direction_from_bearing(bearing)
    
    instructions = [
        f"Head {direction} for {distance:.1f} km",
        "Arrive at destination"
    ]
    
    return {
        "distance_km": round(distance, 2),
        "duration_minutes": duration_minutes,
        "duration_text": format_duration(duration_minutes),
        "route_points": route_points,
        "instructions": instructions,
        "travel_mode": travel_mode
    }

async def get_navigation_data(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
    travel_mode: str = "driving"
) -> Dict[str, Any]:
    """Get comprehensive navigation data"""
    route_data = await get_route_directions(start_lat, start_lon, end_lat, end_lon, travel_mode)
    
    return {
        "route": route_data,
        "current_location": {
            "latitude": start_lat,
            "longitude": start_lon
        },
        "destination": {
            "latitude": end_lat,
            "longitude": end_lon
        }
    }

def calculate_bearing(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the bearing between two points"""
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    dlon = lon2 - lon1
    
    y = math.sin(dlon) * math.cos(lat2)
    x = math.cos(lat1) * math.sin(lat2) - math.sin(lat1) * math.cos(lat2) * math.cos(dlon)
    
    bearing = math.atan2(y, x)
    bearing = math.degrees(bearing)
    bearing = (bearing + 360) % 360
    
    return bearing

def get_direction_from_bearing(bearing: float) -> str:
    """Convert bearing to cardinal direction"""
    directions = [
        "North", "North-East", "East", "South-East",
        "South", "South-West", "West", "North-West"
    ]
    
    index = int((bearing + 22.5) / 45) % 8
    return directions[index]

def format_duration(minutes: int) -> str:
    """Format duration in minutes to human readable format"""
    if minutes < 60:
        return f"{minutes} min"
    else:
        hours = minutes // 60
        remaining_minutes = minutes % 60
        if remaining_minutes == 0:
            return f"{hours} hr"
        else:
            return f"{hours} hr {remaining_minutes} min"

async def get_spots_in_bounding_box(
    north: float,
    south: float,
    east: float,
    west: float
) -> List[Dict[str, Any]]:
    """Get all tourist spots within a bounding box"""
    db = get_db()
    collection = db["tourist_spots"]
    
    # MongoDB query for spots within bounding box
    query = {
        "location.latitude": {"$gte": south, "$lte": north},
        "location.longitude": {"$gte": west, "$lte": east}
    }
    
    cursor = collection.find(query)
    spots = await cursor.to_list(length=None)
    
    result = []
    for spot_data in spots:
        spot_dict = {
            "id": str(spot_data["_id"]),
            "name": spot_data["name"],
            "location": spot_data["location"],
            "categories": spot_data["categories"],
            "rating": spot_data.get("rating", 0.0)
        }
        result.append(spot_dict)
    
    return result
