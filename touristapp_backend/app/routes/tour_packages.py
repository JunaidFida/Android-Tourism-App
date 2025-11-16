from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.models.tour_package import (
    TourPackageCreate,
    TourPackageInDB,
    TourPackageUpdate,
    PackageStatus
)
from app.services.tour_package_service import (
    create_tour_package,
    get_tour_package,
    list_tour_packages,
    update_tour_package,
    delete_tour_package as service_delete_tour_package,
    get_tour_packages_by_company
)
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from typing import List, Optional

router = APIRouter(prefix="/tour-packages", tags=["tour-packages"])

@router.post("/", response_model=TourPackageInDB)
async def create_new_tour_package(
    package: TourPackageCreate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only travel companies can create packages
    if current_user.role != UserRole.TRAVEL_COMPANY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only travel companies can create tour packages"
        )
    
    # Ensure the travel company is creating their own package
    if package.created_by != str(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only create packages for your own company"
        )
    
    return await create_tour_package(package)

@router.get("/", response_model=List[TourPackageInDB])
async def get_all_tour_packages(
    skip: int = 0,
    limit: int = 10,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    duration: Optional[int] = None,
    status: Optional[PackageStatus] = None
):
    return await list_tour_packages(
        skip=skip,
        limit=limit,
        search=search,
        min_price=min_price,
        max_price=max_price,
        duration=duration,
        status=status
    )

@router.get("/{package_id}", response_model=TourPackageInDB)
async def get_single_tour_package(package_id: str):
    package = await get_tour_package(package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    return package

@router.put("/{package_id}", response_model=TourPackageInDB)
async def update_tour_package_details(
    package_id: str,
    package_update: TourPackageUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Get the package first to check ownership
    package = await get_tour_package(package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    
    # Only the owning travel company or admin can update
    if (current_user.role != UserRole.ADMIN and 
        str(current_user.id) != package.created_by):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this tour package"
        )
    
    return await update_tour_package(package_id, package_update)

@router.delete("/{package_id}")
async def delete_tour_package(
    package_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Get the package first to check ownership
    package = await get_tour_package(package_id)
    if not package:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tour package not found"
        )
    
    # Only the owning travel company or admin can delete
    if (current_user.role != UserRole.ADMIN and 
        str(current_user.id) != package.created_by):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this tour package"
        )
    
    success = await service_delete_tour_package(package_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete tour package"
        )
    return {"message": "Tour package deleted successfully"}

@router.get("/company/{company_id}", response_model=List[TourPackageInDB])
async def get_tour_packages_by_travel_company(
    company_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only the company itself or admin can view their packages
    if (current_user.role != UserRole.ADMIN and 
        str(current_user.id) != company_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view these tour packages"
        )
    
    return await get_tour_packages_by_company(company_id)