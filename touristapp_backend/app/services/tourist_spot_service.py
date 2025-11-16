from typing import List, Optional
from app.models.tourist_spot import TouristSpotCreate, TouristSpotInDB, TouristSpotUpdate, SpotCategory, SpotStatus
from app.database import get_db
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

async def create_tourist_spot(spot: TouristSpotCreate, created_by: Optional[str] = None, company_id: Optional[str] = None):
    db = get_db()
    spot_data = spot.dict()
    
    # Convert status enum to string value if it's an enum
    if "status" in spot_data and isinstance(spot_data["status"], SpotStatus):
        spot_data["status"] = spot_data["status"].value
    
    # Convert categories to lowercase strings and validate against enum
    if "categories" in spot_data and spot_data["categories"]:
        valid_category_values = {cat.value for cat in SpotCategory}
        validated_categories = []
        for cat in spot_data["categories"]:
            if isinstance(cat, SpotCategory):
                validated_categories.append(cat.value)
            else:
                cat_lower = str(cat).lower()
                if cat_lower in valid_category_values:
                    validated_categories.append(cat_lower)
        spot_data["categories"] = validated_categories
    
    # Set created_by and company_id if provided
    if created_by:
        spot_data["created_by"] = created_by
    if company_id:
        spot_data["company_id"] = company_id
    
    # Set timestamps
    spot_data["created_at"] = datetime.utcnow()
    spot_data["updated_at"] = datetime.utcnow()
    
    # Ensure status is set (default to PENDING for company-created spots, APPROVED for admin-created)
    if "status" not in spot_data or spot_data["status"] is None:
        spot_data["status"] = SpotStatus.APPROVED.value if not company_id else SpotStatus.PENDING.value
    elif isinstance(spot_data["status"], SpotStatus):
        spot_data["status"] = spot_data["status"].value
    
    result = await db.tourist_spots.insert_one(spot_data)
    created_spot = await db.tourist_spots.find_one({"_id": result.inserted_id})
    return TouristSpotInDB.from_mongo(created_spot)

async def get_tourist_spot(spot_id: str):
    db = get_db()
    
    # Validate spot_id
    if not spot_id or spot_id == "undefined" or spot_id == "null":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID"
        )
    
    try:
        spot_object_id = ObjectId(spot_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID format"
        )
    
    spot = await db.tourist_spots.find_one({"_id": spot_object_id})
    if not spot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    return TouristSpotInDB.from_mongo(spot)

async def list_tourist_spots(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    region: Optional[str] = None,
    categories: Optional[List[SpotCategory]] = None,
    status: Optional[SpotStatus] = None,
    include_pending: bool = False
):
    """
    List tourist spots with filtering.
    By default, only returns approved spots unless include_pending=True or status is specified.
    """
    db = get_db()
    query = {}
    
    # Filter by status - default to approved only for public access
    if status:
        query["status"] = status.value
    elif not include_pending:
        # Only show approved spots by default
        query["status"] = SpotStatus.APPROVED.value
    
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"location.address": {"$regex": search, "$options": "i"}}
        ]
    
    if region:
        query["region"] = {"$regex": region, "$options": "i"}
    
    if categories:
        query["categories"] = {"$all": [cat.value if isinstance(cat, SpotCategory) else cat for cat in categories]}
    
    spots = await db.tourist_spots.find(query).skip(skip).limit(limit).to_list(None)
    return [TouristSpotInDB.from_mongo(spot) for spot in spots]

async def update_tourist_spot(spot_id: str, spot_update: TouristSpotUpdate):
    db = get_db()
    update_data = spot_update.dict(exclude_unset=True)
    
    if len(update_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for update"
        )
    
    # Convert status enum to string if present
    if "status" in update_data and isinstance(update_data["status"], SpotStatus):
        update_data["status"] = update_data["status"].value
    
    # Update timestamp
    update_data["updated_at"] = datetime.utcnow()
    
    result = await db.tourist_spots.update_one(
        {"_id": ObjectId(spot_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found or no changes made"
        )
    
    updated_spot = await db.tourist_spots.find_one({"_id": ObjectId(spot_id)})
    return TouristSpotInDB.from_mongo(updated_spot)

async def delete_tourist_spot(spot_id: str):
    db = get_db()
    
    # Validate spot_id
    if not spot_id or spot_id == "undefined" or spot_id == "null":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID"
        )
    
    try:
        spot_object_id = ObjectId(spot_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID format"
        )
    
    result = await db.tourist_spots.delete_one({"_id": spot_object_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    return True

async def get_company_spots(company_id: str):
    """Get all spots created by a company"""
    db = get_db()
    spots = await db.tourist_spots.find({"company_id": company_id}).to_list(None)
    return [TouristSpotInDB.from_mongo(spot) for spot in spots]

async def update_spot_status(spot_id: str, new_status: SpotStatus):
    """Update the status of a tourist spot (for admin approval/rejection)"""
    db = get_db()
    
    # Validate spot_id
    if not spot_id or spot_id == "undefined" or spot_id == "null":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID"
        )
    
    try:
        spot_object_id = ObjectId(spot_id)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid spot ID format"
        )
    
    result = await db.tourist_spots.update_one(
        {"_id": spot_object_id},
        {"$set": {
            "status": new_status.value,
            "updated_at": datetime.utcnow()
        }}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tourist spot not found"
        )
    
    updated_spot = await db.tourist_spots.find_one({"_id": spot_object_id})
    return TouristSpotInDB.from_mongo(updated_spot)

async def get_pending_spots():
    """Get all pending spots (for admin review)"""
    db = get_db()
    spots = await db.tourist_spots.find({"status": SpotStatus.PENDING.value}).to_list(None)
    return [TouristSpotInDB.from_mongo(spot) for spot in spots]