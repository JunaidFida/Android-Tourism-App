from fastapi import APIRouter, Depends, HTTPException, status, Query
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole, UserUpdate
from app.models.tourist_spot import TouristSpotInDB, SpotStatus
from app.services.admin_service import AdminService
from app.services.tourist_spot_service import update_spot_status, get_pending_spots
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/admin", tags=["admin"])

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserRoleUpdate(BaseModel):
    role: UserRole

@router.get("/users")
async def get_all_users(
    skip: int = Query(0, description="Number of users to skip"),
    limit: int = Query(50, description="Maximum number of users to return"),
    role: Optional[UserRole] = Query(None, description="Filter by user role"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all users with filtering options (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access user management"
        )
    
    users = await AdminService.get_all_users(
        skip=skip,
        limit=limit,
        role=role,
        is_active=is_active,
        search=search
    )
    
    return {
        "users": users,
        "total": len(users)
    }

@router.get("/users/{user_id}")
async def get_user_details(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Get detailed information about a specific user (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access user details"
        )
    
    user_details = await AdminService.get_user_details(user_id)
    if not user_details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user_details

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: str,
    status_update: UserStatusUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Activate or deactivate a user account (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update user status"
        )
    
    # Prevent admin from deactivating themselves
    if user_id == current_user.id and not status_update.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    success = await AdminService.update_user_status(user_id, status_update.is_active)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    action = "activated" if status_update.is_active else "deactivated"
    return {"message": f"User {action} successfully"}

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a user's role (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update user roles"
        )
    
    # Prevent admin from changing their own role
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    success = await AdminService.update_user_role(user_id, role_update.role)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": f"User role updated to {role_update.role}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    force: bool = Query(False, description="Force delete even if user has active bookings"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Delete a user account (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can delete users"
        )
    
    # Prevent admin from deleting themselves
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    result = await AdminService.delete_user(user_id, force)
    
    if result["success"]:
        return {"message": "User deleted successfully"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    days: int = Query(30, description="Number of days to look back"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get user activity summary (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access user activity"
        )
    
    activity = await AdminService.get_user_activity(user_id, days)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return activity

@router.get("/dashboard")
async def get_admin_dashboard(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get admin dashboard with system overview (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access dashboard"
        )
    
    dashboard_data = await AdminService.get_admin_dashboard()
    return dashboard_data

@router.post("/users/{user_id}/send-notification")
async def send_user_notification(
    user_id: str,
    notification: dict,
    current_user: UserInDB = Depends(get_current_user)
):
    """Send notification to a specific user (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can send notifications"
        )
    
    # This would integrate with a notification service
    # For now, just return success
    return {
        "message": "Notification sent successfully",
        "user_id": user_id,
        "notification": notification
    }

@router.get("/reports/users")
async def generate_user_report(
    format: str = Query("json", description="Report format: json, csv"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Generate user statistics report (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can generate reports"
        )
    
    report = await AdminService.generate_user_report()
    return report

# Tourist Spot Management Routes
@router.get("/tourist-spots")
async def get_all_tourist_spots_admin(
    skip: int = Query(0, description="Number of spots to skip"),
    limit: int = Query(100, description="Maximum number of spots to return"),
    search: Optional[str] = Query(None, description="Search by name or description"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all tourist spots with filtering (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view all tourist spots"
        )
    
    from app.services.tourist_spot_service import list_tourist_spots
    from app.services.user_service import get_user_by_id
    from app.database import get_db
    from bson import ObjectId
    
    # Convert status string to enum if provided
    status_enum = None
    if status:
        try:
            status_enum = SpotStatus(status.lower())
        except ValueError:
            pass  # Invalid status, will return all
    
    # Admin can see all spots regardless of status
    spots = await list_tourist_spots(
        skip=skip,
        limit=limit,
        search=search,
        status=status_enum,
        include_pending=True  # Admin can see all statuses
    )
    
    # Enrich spots with company names
    db = get_db()
    enriched_spots = []
    for spot in spots:
        # Convert spot to dict, using by_alias=True to get 'id' instead of '_id'
        if hasattr(spot, 'dict'):
            spot_dict = spot.dict(by_alias=True)
        elif hasattr(spot, '__dict__'):
            spot_dict = spot.__dict__.copy()
        else:
            spot_dict = dict(spot) if isinstance(spot, dict) else {}
        
        # Ensure id field is present
        if 'id' not in spot_dict and hasattr(spot, 'id'):
            spot_dict['id'] = str(spot.id)
        elif '_id' in spot_dict and 'id' not in spot_dict:
            spot_dict['id'] = str(spot_dict['_id'])
        
        # Get company name if company_id exists
        company_id = spot_dict.get('company_id')
        if company_id:
            try:
                company = await db.users.find_one({"_id": ObjectId(str(company_id))})
                if company:
                    spot_dict['company_name'] = company.get('full_name', 'Unknown Company')
                else:
                    spot_dict['company_name'] = 'Unknown Company'
            except Exception as e:
                print(f"Error fetching company for spot {spot_dict.get('id')}: {e}")
                spot_dict['company_name'] = 'Unknown Company'
        else:
            spot_dict['company_name'] = 'Admin'
        
        # Ensure all required fields are present with correct types
        if 'review_count' not in spot_dict:
            spot_dict['review_count'] = spot_dict.get('total_ratings', 0)
        if 'entry_fee' not in spot_dict:
            spot_dict['entry_fee'] = 0
        if 'rating' not in spot_dict:
            spot_dict['rating'] = 0.0
        if 'status' in spot_dict and hasattr(spot_dict['status'], 'value'):
            spot_dict['status'] = spot_dict['status'].value
        if 'categories' in spot_dict:
            # Convert categories to strings if they're enums
            spot_dict['categories'] = [
                cat.value if hasattr(cat, 'value') else str(cat)
                for cat in spot_dict['categories']
            ]
        
        # Convert datetime objects to strings for JSON serialization
        if 'created_at' in spot_dict and isinstance(spot_dict['created_at'], datetime):
            spot_dict['created_at'] = spot_dict['created_at'].isoformat()
        if 'updated_at' in spot_dict and isinstance(spot_dict['updated_at'], datetime):
            spot_dict['updated_at'] = spot_dict['updated_at'].isoformat()
        
        enriched_spots.append(spot_dict)
    
    return {"spots": enriched_spots}

@router.get("/tourist-spots/pending", response_model=List[TouristSpotInDB])
async def get_pending_tourist_spots(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get all pending tourist spots for review (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can view pending tourist spots"
        )
    
    return await get_pending_spots()

@router.put("/tourist-spots/{spot_id}/approve", response_model=TouristSpotInDB)
async def approve_tourist_spot(
    spot_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Approve a tourist spot (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can approve tourist spots"
        )
    
    return await update_spot_status(spot_id, SpotStatus.APPROVED)

@router.put("/tourist-spots/{spot_id}/reject", response_model=TouristSpotInDB)
async def reject_tourist_spot(
    spot_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    """Reject a tourist spot (Admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can reject tourist spots"
        )
    
    return await update_spot_status(spot_id, SpotStatus.REJECTED)
