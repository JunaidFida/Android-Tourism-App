from typing import List, Optional
from app.models.tour_package import TourPackageCreate, TourPackageInDB, TourPackageUpdate, PackageStatus
from app.database import get_db
from bson import ObjectId
from fastapi import HTTPException, status
from datetime import datetime

async def create_tour_package(package: TourPackageCreate):
    db = get_db()
    
    # Check if travel company exists
    travel_company = await db.users.find_one({
        "_id": ObjectId(package.created_by),
        "role": "travel_company"
    })
    if not travel_company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Travel company not found"
        )
    
    package_dict = package.dict()
    package_dict.setdefault("current_participants", 0)
    package_dict.setdefault("status", PackageStatus.ACTIVE.value)
    package_dict.setdefault("travel_company_id", package.created_by)

    result = await db.tour_packages.insert_one(package_dict)
    created_package = await db.tour_packages.find_one({"_id": result.inserted_id})
    return TourPackageInDB.from_mongo(created_package)

async def get_tour_package(package_id: str):
    db = get_db()
    package = await db.tour_packages.find_one({"_id": ObjectId(package_id)})
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    
    # Get company information if available
    company_id = package.get("travel_company_id") or package.get("created_by")
    if company_id:
        try:
            company = await db.users.find_one({"_id": ObjectId(company_id)})
            if company:
                package["company_name"] = company.get("full_name", "Unknown Company")
        except Exception:
            pass  # If company lookup fails, continue without company name
    
    return TourPackageInDB.from_mongo(package)

async def list_tour_packages(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    duration: Optional[int] = None,
    status: Optional[PackageStatus] = None
):
    db = get_db()
    
    # Build base query
    base_query = {}
    
    if search:
        base_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"title": {"$regex": search, "$options": "i"}},  # Support legacy field
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}}
        ]
    
    if min_price is not None or max_price is not None:
        base_query["price"] = {}
        if min_price is not None:
            base_query["price"]["$gte"] = min_price
        if max_price is not None:
            base_query["price"]["$lte"] = max_price
    
    if duration:
        base_query["duration_days"] = duration
    
    if status:
        base_query["status"] = status.value
    
    # First, get all active company IDs
    active_companies = await db.users.find(
        {"role": "travel_company", "is_active": True},
        {"_id": 1}
    ).to_list(None)
    
    active_company_ids = [str(company["_id"]) for company in active_companies]
    active_company_object_ids = [company["_id"] for company in active_companies]
    
    # Build company filter
    company_filter = {
        "$or": [
            {"travel_company_id": {"$in": active_company_ids}},
            {"created_by": {"$in": active_company_ids}},
            {"travel_company_id": {"$in": active_company_object_ids}},
            {"created_by": {"$in": active_company_object_ids}}
        ]
    }
    
    # Combine base query with company filter
    if active_company_ids:
        if "$or" in base_query:
            # If search was used, combine with $and
            query = {
                "$and": [
                    base_query,
                    company_filter
                ]
            }
        else:
            # Merge company filter into base query
            query = {**base_query, **company_filter}
    else:
        # No active companies, return empty list
        return []
    
    # Get packages with company information
    packages_cursor = db.tour_packages.find(query).skip(skip).limit(limit)
    packages = []
    
    async for package in packages_cursor:
        # Get company name
        company_id = package.get("travel_company_id") or package.get("created_by")
        if company_id:
            try:
                company_obj_id = ObjectId(company_id) if isinstance(company_id, str) else company_id
                company = await db.users.find_one({"_id": company_obj_id})
                if company and company.get("is_active"):
                    package["company_name"] = company.get("full_name", "Unknown Company")
                else:
                    continue  # Skip packages from inactive companies
            except Exception:
                continue  # Skip if company lookup fails
        
        packages.append(TourPackageInDB.from_mongo(package))
    
    return packages

async def update_tour_package(package_id: str, package_update: TourPackageUpdate):
    db = get_db()
    update_data = package_update.dict(exclude_unset=True)
    
    if len(update_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for update"
        )

    if "status" in update_data and isinstance(update_data["status"], PackageStatus):
        update_data["status"] = update_data["status"].value
    
    result = await db.tour_packages.update_one(
        {"_id": ObjectId(package_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found or no changes made"
        )
    
    updated_package = await db.tour_packages.find_one({"_id": ObjectId(package_id)})
    return TourPackageInDB.from_mongo(updated_package)

async def delete_tour_package(package_id: str):
    db = get_db()
    
    # Check if there are any active bookings for this package
    active_bookings = await db.bookings.count_documents({
        "tour_package_id": package_id,
        "status": {"$in": ["pending", "confirmed"]}
    })
    
    if active_bookings > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete package with active bookings"
        )
    
    result = await db.tour_packages.delete_one({"_id": ObjectId(package_id)})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    return True

async def get_tour_packages_by_company(company_id: str):
    db = get_db()
    packages = await db.tour_packages.find({"created_by": company_id}).to_list(None)
    return [TourPackageInDB.from_mongo(package) for package in packages]
