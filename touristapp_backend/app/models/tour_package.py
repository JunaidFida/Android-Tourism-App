from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class PackageStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class Location(BaseModel):
    latitude: float
    longitude: float
    address: str


class ItineraryDay(BaseModel):
    day: int
    title: str
    description: str


class TourPackageBase(BaseModel):
    name: str = Field(..., alias="title")
    description: str
    location: Location
    price: float
    duration_days: int
    max_participants: int = Field(default=10, alias="group_size")
    current_participants: int = 0
    category: str
    difficulty_level: str
    destinations: List[str] = []
    included_spots: List[str] = []
    includes: List[str] = []
    excludes: List[str] = []
    itinerary: List[ItineraryDay] = []
    image_urls: List[str] = []
    status: PackageStatus = PackageStatus.ACTIVE
    rating: float = 0.0
    average_rating: float = 0.0
    total_ratings: int = 0
    available_dates: List[datetime] = []
    travel_company_id: Optional[str] = None
    created_by: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True


class TourPackageCreate(TourPackageBase):
    pass


class TourPackageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, alias="title")
    description: Optional[str] = None
    location: Optional[Location] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    max_participants: Optional[int] = Field(default=None, alias="group_size")
    current_participants: Optional[int] = None
    category: Optional[str] = None
    difficulty_level: Optional[str] = None
    destinations: Optional[List[str]] = None
    included_spots: Optional[List[str]] = None
    includes: Optional[List[str]] = None
    excludes: Optional[List[str]] = None
    itinerary: Optional[List[ItineraryDay]] = None
    image_urls: Optional[List[str]] = None
    status: Optional[PackageStatus] = None
    rating: Optional[float] = None
    average_rating: Optional[float] = None
    total_ratings: Optional[int] = None
    available_dates: Optional[List[datetime]] = None
    travel_company_id: Optional[str] = None
    created_by: Optional[str] = None
    updated_at: Optional[datetime] = None

    class Config:
        populate_by_name = True
        use_enum_values = True


class TourPackageInDB(TourPackageBase):
    id: str = Field(alias="_id")

    class Config:
        from_attributes = True
        populate_by_name = True
        use_enum_values = True

    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to TourPackageInDB model"""
        if not data:
            return None
        # Convert ObjectId to string for the id field
        if "_id" in data:
            data["id"] = str(data["_id"])
            data.pop("_id", None)

        # Build/patch location if split fields exist
        if "location" not in data:
            lat = data.get("latitude")
            lon = data.get("longitude")
            addr = data.get("address", "")
            if lat is not None and lon is not None:
                data["location"] = {
                    "latitude": float(lat),
                    "longitude": float(lon),
                    "address": addr,
                }
        # If still missing, provide a safe default location
        data.setdefault("location", {"latitude": 0.0, "longitude": 0.0, "address": ""})

        # Ensure newly added fields have defaults when absent
        data.setdefault("name", data.get("title", ""))
        data.setdefault("max_participants", data.get("group_size", 0))
        data.setdefault("current_participants", 0)

        status_value = data.get("status", PackageStatus.ACTIVE.value)
        if isinstance(status_value, PackageStatus):
            status_value = status_value.value
        data["status"] = status_value

        data.setdefault("average_rating", data.get("rating", 0.0))
        data.setdefault("travel_company_id", data.get("created_by"))
        data.setdefault("destinations", data.get("included_spots", []))

        return cls(**data)
