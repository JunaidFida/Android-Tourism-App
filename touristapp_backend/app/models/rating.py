from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class RatingBase(BaseModel):
    tour_package_id: str
    tourist_id: str
    rating: int  # 1-5
    review: Optional[str] = None
    booking_id: Optional[str] = None

class RatingCreate(RatingBase):
    pass

class RatingInDB(RatingBase):
    id: str = Field(alias="_id")
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to RatingInDB model"""
        if not data:
            return None
        # Convert ObjectId to string for the id field
        if "_id" in data:
            data["id"] = str(data["_id"])
            data.pop("_id", None)
        return cls(**data)