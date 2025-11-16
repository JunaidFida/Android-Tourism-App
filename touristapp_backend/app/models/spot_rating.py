from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SpotRatingBase(BaseModel):
    tourist_spot_id: str
    tourist_id: str
    rating: int = Field(..., ge=1, le=5, description="Rating between 1 and 5")
    review: Optional[str] = None

class SpotRatingCreate(SpotRatingBase):
    pass

class SpotRatingInDB(SpotRatingBase):
    id: str = Field(alias="_id")
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to SpotRatingInDB model"""
        if not data:
            return None
        # Convert ObjectId to string for the id field
        if "_id" in data:
            data["id"] = str(data["_id"])
            data.pop("_id", None)
        return cls(**data)

