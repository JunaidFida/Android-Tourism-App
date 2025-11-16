from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field
from enum import Enum
from bson import ObjectId

class UserRole(str, Enum):
    TOURIST = "tourist"
    TRAVEL_COMPANY = "travel_company"
    ADMIN = "admin"

class UserPreferences(BaseModel):
    preferred_categories: List[str] = []
    budget_range: Optional[dict] = None  # {"min": 100, "max": 1000}
    preferred_regions: List[str] = []
    travel_style: Optional[str] = None  # "budget", "luxury", "adventure", "family"
    group_size_preference: Optional[int] = None
    
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: str
    role: UserRole
    preferences: Optional[UserPreferences] = None
    profile_picture: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    profile_picture: Optional[str] = None
    preferences: Optional[UserPreferences] = None
    hashed_password: Optional[str] = None
    last_login: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    is_active: bool = True
    created_at: Optional[str] = None
    last_login: Optional[str] = None

    class Config:
        from_attributes = True
        populate_by_name = True
        
    @classmethod
    def from_mongo(cls, data: dict):
        """Convert MongoDB document to UserInDB model"""
        if not data:
            return None
        # Convert ObjectId to string for the id field
        if "_id" in data:
            data["id"] = str(data["_id"])
            # Remove the _id field to avoid conflicts
            data.pop("_id", None)
        return cls(**data)
