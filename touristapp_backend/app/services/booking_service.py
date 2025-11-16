from typing import List, Optional
from datetime import datetime, timezone
from app.models.booking import (
    BookingCreate,
    BookingInDB,
    BookingStatus,
    BookingSummary,
    RelatedTourPackage,
    RelatedUser,
)
from app.models.tour_package import TourPackageInDB, PackageStatus
from app.database import get_db
from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, status
import random
import string
import logging

logger = logging.getLogger(__name__)

async def create_booking(booking: BookingCreate, tourist_id: str):
    logger.info("=== BOOKING SERVICE: CREATE BOOKING ===")
    logger.info(f"Tourist ID: {tourist_id}")
    logger.info(f"Booking request: {booking.dict()}")
    
    db = get_db()

    try:
        tourist_object_id = ObjectId(tourist_id)
        package_object_id = ObjectId(booking.tour_package_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid identifier provided"
        )

    # Get the tour package
    logger.info(f"Looking for tour package with ID: {booking.tour_package_id}")
    package_doc = await db.tour_packages.find_one({"_id": package_object_id})
    if not package_doc:
        logger.error(f"Tour package not found: {booking.tour_package_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    
    # Use from_mongo method to handle ObjectId conversion properly
    package = TourPackageInDB.from_mongo(package_doc)
    if not package:
        logger.error(f"Failed to parse tour package: {booking.tour_package_id}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to parse tour package"
        )
    logger.info(f"Found package: {package.name} (Status: {package.status})")
    
    # Check if package is active
    if package.status != PackageStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This tour package is not currently available"
        )
    
    # Check availability
    available_slots = package.max_participants - package.current_participants
    logger.info(f"Package availability: {available_slots} slots (Max: {package.max_participants}, Current: {package.current_participants})")
    if booking.number_of_people > available_slots:
        logger.warning(f"Insufficient slots: requested {booking.number_of_people}, available {available_slots}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {available_slots} slots available"
        )
    
    # Calculate total price
    total_price = package.price * booking.number_of_people
    logger.info(f"Calculated total price: ${total_price} ({package.price} x {booking.number_of_people})")
    
    # Generate booking reference
    booking_reference = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
    logger.info(f"Generated booking reference: {booking_reference}")
    
    booking_data = {
        "tour_package_id": package_object_id,
        "tourist_id": tourist_object_id,
        "booking_date": datetime.now(timezone.utc),
        "travel_date": booking.travel_date,
        "number_of_people": booking.number_of_people,
        "total_price": total_price,
        "status": BookingStatus.PENDING.value,
        "booking_reference": booking_reference,
        "contact_phone": booking.contact_phone,
        "emergency_contact_name": booking.emergency_contact_name,
        "emergency_contact_number": booking.emergency_contact_number,
        "special_requests": booking.special_requests
    }
    
    logger.info(f"Inserting booking data: {booking_data}")
    result = await db.bookings.insert_one(booking_data)
    logger.info(f"Booking inserted with ID: {result.inserted_id}")
    
    created_booking = await db.bookings.find_one({"_id": result.inserted_id})
    logger.info(f"Retrieved created booking: {created_booking}")
    
    # Convert ObjectId to string for Pydantic model
    if created_booking:
        created_booking["id"] = str(created_booking["_id"])
        # Convert ObjectId fields to strings
        for field in ["tour_package_id", "tourist_id"]:
            if field in created_booking and isinstance(created_booking[field], ObjectId):
                created_booking[field] = str(created_booking[field])
        del created_booking["_id"]
    
    # Update package participants count
    logger.info(f"Updating package participants count: +{booking.number_of_people}")
    await db.tour_packages.update_one(
        {"_id": package_object_id},
        {"$inc": {"current_participants": booking.number_of_people}}
    )
    
    logger.info("Booking created successfully")
    return BookingInDB.from_mongo(created_booking)

async def get_booking(booking_id: str):
    db = get_db()
    booking = await db.bookings.find_one({"_id": ObjectId(booking_id)})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    return BookingInDB.from_mongo(booking)

async def list_user_bookings(user_id: str, status: Optional[BookingStatus] = None):
    db = get_db()
    try:
        tourist_object_id = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user identifier"
        )

    query = {"tourist_id": tourist_object_id}
    if status:
        query["status"] = status.value
    
    bookings = await db.bookings.find(query).to_list(None)
    return [BookingInDB.from_mongo(booking) for booking in bookings]

async def update_booking_status(booking_id: str, new_status: BookingStatus):
    db = get_db()

    try:
        booking_object_id = ObjectId(booking_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid booking identifier"
        )

    valid_transitions = {
        "pending": ["confirmed", "cancelled"],
        "confirmed": ["completed", "cancelled"],
        "cancelled": [],
        "completed": []
    }
    
    # Get current booking status
    booking = await db.bookings.find_one({"_id": booking_object_id})
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    current_status = booking["status"]
    
    new_status_value = new_status.value

    if new_status_value not in valid_transitions[current_status]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition from {current_status} to {new_status_value}"
        )
    
    result = await db.bookings.update_one(
        {"_id": booking_object_id},
        {"$set": {"status": new_status_value}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or no changes made"
        )
    
    # If cancelled, free up the slots in the package
    if new_status_value == "cancelled":
        package_identifier = booking["tour_package_id"]
        package_object_id = package_identifier if isinstance(package_identifier, ObjectId) else ObjectId(package_identifier)
        await db.tour_packages.update_one(
            {"_id": package_object_id},
            {"$inc": {"current_participants": -booking["number_of_people"]}}
        )
    
    updated_booking = await db.bookings.find_one({"_id": booking_object_id})
    return BookingInDB.from_mongo(updated_booking)

async def list_company_bookings(company_id: str, status: Optional[BookingStatus] = None):
    """Get all bookings for packages owned by a travel company"""
    try:
        db = get_db()
        
        # First, get all packages owned by this company
        logger.info(f"Looking for packages with company_id: {company_id}")
        
        # Convert company_id to ObjectId for comparison
        try:
            company_object_id = ObjectId(company_id)
        except InvalidId:
            logger.error(f"Invalid company_id format: {company_id}")
            return []
        
        # Try both travel_company_id and created_by fields (both as string and ObjectId)
        company_packages = await db.tour_packages.find({
            "$or": [
                {"travel_company_id": company_id},
                {"created_by": company_id},
                {"travel_company_id": company_object_id},
                {"created_by": company_object_id}
            ]
        }).to_list(None)
        
        package_ids = [package["_id"] for package in company_packages]
        
        logger.info(f"Found {len(package_ids)} packages for company {company_id}")
        if company_packages:
            logger.info(f"Sample package fields: _id={company_packages[0].get('_id')}, created_by={company_packages[0].get('created_by')}, travel_company_id={company_packages[0].get('travel_company_id')}")
        
        if not package_ids:
            logger.warning(f"No packages found for company {company_id}")
            return []
    except Exception as e:
        logger.error(f"Error in list_company_bookings: {str(e)}")
        raise
    
    # Build query for bookings
    query = {"tour_package_id": {"$in": package_ids}}
    if status:
        query["status"] = status.value
    
    # Get bookings with user and package details
    pipeline = [
        {"$match": query},
        {
            "$lookup": {
                "from": "users",
                "localField": "tourist_id",
                "foreignField": "_id",
                "as": "user"
            }
        },
        {
            "$lookup": {
                "from": "tour_packages",
                "localField": "tour_package_id",
                "foreignField": "_id",
                "as": "tour_package"
            }
        },
        {
            "$unwind": {
                "path": "$user",
                "preserveNullAndEmptyArrays": True
            }
        },
        {
            "$unwind": {
                "path": "$tour_package",
                "preserveNullAndEmptyArrays": True
            }
        }
    ]
    
    bookings = await db.bookings.aggregate(pipeline).to_list(None)

    summaries: List[BookingSummary] = []
    for booking in bookings:
        try:
            booking_payload = {
                "_id": booking["_id"],
                "tour_package_id": booking.get("tour_package_id"),
                "tourist_id": booking.get("tourist_id"),
                "booking_date": booking.get("booking_date", datetime.now(timezone.utc)),
                "travel_date": booking.get("travel_date", datetime.now(timezone.utc)),
                "number_of_people": booking.get("number_of_people", 1),
                "total_price": booking.get("total_price", 0),
                "status": booking.get("status", "pending"),
                "booking_reference": booking.get("booking_reference", ""),
                "contact_phone": booking.get("contact_phone", ""),
                "emergency_contact_name": booking.get("emergency_contact_name", ""),
                "emergency_contact_number": booking.get("emergency_contact_number", ""),
                "special_requests": booking.get("special_requests"),
            }

            booking_model = BookingInDB.from_mongo(booking_payload)
        except Exception as e:
            logger.error(f"Error creating booking model: {str(e)}, booking: {booking}")
            continue

        user_model = None
        user_doc = booking.get("user")
        if user_doc:
            user_model = RelatedUser(
                id=str(user_doc.get("_id")),
                full_name=user_doc.get("full_name"),
                email=user_doc.get("email"),
                phone_number=user_doc.get("phone_number"),
            )

        package_model = None
        package_doc = booking.get("tour_package")
        if package_doc:
            package_model = RelatedTourPackage(
                id=str(package_doc.get("_id")),
                name=package_doc.get("name"),
                description=package_doc.get("description"),
                price=package_doc.get("price"),
                duration_days=package_doc.get("duration_days"),
                destinations=package_doc.get("destinations", []),
            )

        summaries.append(BookingSummary(booking=booking_model, user=user_model, tour_package=package_model))

    return summaries