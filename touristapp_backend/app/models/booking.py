from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from bson import ObjectId

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"

class BookingBase(BaseModel):
    tour_package_id: str
    tourist_id: str
    booking_date: datetime
    travel_date: datetime
    number_of_people: int
    total_price: float
    status: BookingStatus = BookingStatus.PENDING
    contact_phone: str
    emergency_contact_name: str
    emergency_contact_number: str
    special_requests: Optional[str] = None

    class Config:
        use_enum_values = True
        populate_by_name = True

class BookingCreate(BaseModel):
    tour_package_id: str
    travel_date: datetime
    number_of_people: int
    contact_phone: str
    emergency_contact_name: str
    emergency_contact_number: str
    special_requests: Optional[str] = None

class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    number_of_people: Optional[int] = None

class BookingInDB(BookingBase):
    id: str = Field(alias="_id")
    booking_reference: str

    class Config:
        from_attributes = True
        populate_by_name = True
        use_enum_values = True

    @classmethod
    def from_mongo(cls, data: Optional[dict]):
        if not data:
            return None

        payload = data.copy()

        if "_id" in payload:
            payload["id"] = str(payload.pop("_id"))

        for key in ("tour_package_id", "tourist_id"):
            value = payload.get(key)
            if isinstance(value, ObjectId):
                payload[key] = str(value)

        return cls(**payload)


class RelatedUser(BaseModel):
    id: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone_number: Optional[str] = None


class RelatedTourPackage(BaseModel):
    id: str
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    destinations: List[str] = []


class BookingSummary(BaseModel):
    booking: BookingInDB
    user: Optional[RelatedUser] = None
    tour_package: Optional[RelatedTourPackage] = None