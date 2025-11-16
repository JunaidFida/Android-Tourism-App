from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.models.booking import BookingCreate, BookingInDB, BookingStatus, BookingSummary
from app.services.booking_service import (
    create_booking,
    get_booking,
    list_user_bookings,
    list_company_bookings,
    update_booking_status as update_booking_status_service
)
from app.services.tour_package_service import get_tour_package
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from typing import List, Optional
import logging
from pydantic import BaseModel

router = APIRouter(prefix="/bookings", tags=["bookings"])
logger = logging.getLogger(__name__)

class BookingStatusPayload(BaseModel):
    status: BookingStatus

@router.post("/", response_model=BookingInDB)
async def create_new_booking(
    booking: BookingCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    logger.info("=== BOOKING CREATION STARTED ===")
    logger.info(f"User: {current_user.email} (Role: {current_user.role})")
    logger.info(f"Booking data: {booking.dict()}")
    
    # Only tourists can create bookings
    if current_user.role != UserRole.TOURIST:
        logger.warning(f"Non-tourist user {current_user.email} attempted to create booking")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can create bookings"
        )
    
    try:
        result = await create_booking(booking, str(current_user.id))
        logger.info(f"Booking created successfully: {result.id}")
        return result
    except Exception as e:
        logger.error(f"Failed to create booking: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create booking: {str(e)}"
        )

@router.get("/", response_model=List[BookingInDB])
async def get_user_bookings(
    booking_status: Optional[BookingStatus] = Query(None, alias="status"),
    current_user: UserInDB = Depends(get_current_user)
):
    # Tourists see their own bookings; other roles should use dedicated endpoints
    if current_user.role == UserRole.TOURIST:
        return await list_user_bookings(str(current_user.id), booking_status)
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Use the role-specific booking endpoints"
    )

# Moved this route to after specific routes to avoid conflicts

# Moved booking_id routes to the end to avoid conflicts

@router.get("/user", response_model=List[BookingInDB])
async def get_tourist_bookings(
    booking_status: Optional[BookingStatus] = Query(None, alias="status"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get bookings made by the current tourist user"""
    if current_user.role != UserRole.TOURIST:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only tourists can access this endpoint"
        )
    
    return await list_user_bookings(str(current_user.id), booking_status)

@router.get("/company", response_model=List[BookingSummary])
async def get_company_bookings(
    booking_status: Optional[BookingStatus] = Query(None, alias="status"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get bookings made by tourists for the current company's packages"""
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can access this endpoint"
        )
    
    return await list_company_bookings(str(current_user.id), booking_status)

# Generic booking_id route - must be last to avoid conflicts with specific routes
@router.get("/{booking_id}", response_model=BookingInDB)
async def get_single_booking(
    booking_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    booking = await get_booking(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Check authorization
    if (current_user.role == UserRole.TOURIST and 
        booking.tourist_id != str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this booking"
        )
    
    # For travel company, check if it's their package
    if current_user.role == UserRole.TRAVEL_COMPANY:
        package = await get_tour_package(booking.tour_package_id)
        if package.travel_company_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to view this booking"
            )
    
    return booking

@router.put("/{booking_id}/status")
async def update_booking_status_endpoint(
    booking_id: str,
    payload: BookingStatusPayload,
    current_user: UserInDB = Depends(get_current_user)
):
    booking = await get_booking(booking_id)
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    new_status = payload.status

    # Authorization checks
    if current_user.role == UserRole.TOURIST:
        # Tourists can only cancel their own bookings
        if booking.tourist_id != str(current_user.id) or new_status != BookingStatus.CANCELLED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to perform this action"
            )
    elif current_user.role == UserRole.TRAVEL_COMPANY:
        package = await get_tour_package(booking.tour_package_id)
        if package.travel_company_id != str(current_user.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to modify this booking"
            )
        if new_status not in {BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.COMPLETED}:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Travel companies can only confirm, complete, or cancel bookings"
            )

    updated_booking = await update_booking_status_service(booking_id, new_status)
    return {"message": "Booking status updated", "booking": updated_booking}