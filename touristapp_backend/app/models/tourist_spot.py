from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime

class SpotCategory(str, Enum):
    HISTORICAL = "historical"
    NATURAL = "natural"
    RELIGIOUS = "religious"
    CULTURAL = "cultural"
    ADVENTURE = "adventure"

class SpotStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class Location(BaseModel):
    latitude: float = Field(..., ge=-90, le=90, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude coordinate")
    address: str = Field(..., description="Full address of the location")

class TouristSpotBase(BaseModel):
    name: str
    description: str
    location: Location
    region: str
    categories: List[SpotCategory]
    image_urls: List[str] = []
    rating: float = 0.0
    total_ratings: int = 0
    best_time_to_visit: Optional[str] = None
    status: SpotStatus = SpotStatus.PENDING
    company_id: Optional[str] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class TouristSpotCreate(TouristSpotBase):
    pass

class TouristSpotUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    location: Optional[Location] = None
    region: Optional[str] = None
    categories: Optional[List[SpotCategory]] = None
    image_urls: Optional[List[str]] = None
    best_time_to_visit: Optional[str] = None
    status: Optional[SpotStatus] = None

class TouristSpotInDB(TouristSpotBase):
    id: str = Field(alias="_id")

    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to TouristSpotInDB model"""
        if not data:
            return None
        # Convert ObjectId to string for the id field
        if "_id" in data:
            data["id"] = str(data["_id"])
            # Remove the _id field to avoid conflicts
            data.pop("_id", None)
        # Set default status if not present
        if "status" not in data:
            data["status"] = SpotStatus.APPROVED.value  # Default to approved for existing spots
        # Convert status string to enum if needed
        if isinstance(data.get("status"), str):
            try:
                data["status"] = SpotStatus(data["status"])
            except ValueError:
                data["status"] = SpotStatus.APPROVED
        return cls(**data)
