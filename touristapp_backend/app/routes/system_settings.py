from fastapi import APIRouter, Depends, HTTPException, status
from app.utils.security import get_current_user
from app.models.user import UserInDB, UserRole
from app.database import get_db
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/admin/system-settings", tags=["system-settings"])

class SystemSettings(BaseModel):
    allowUserRegistration: bool
    autoApproveCompanies: bool
    autoApproveTouristSpots: bool
    maintenanceMode: bool

class UpdateSettingRequest(BaseModel):
    key: str
    value: bool

@router.get("")
async def get_system_settings(
    current_user: UserInDB = Depends(get_current_user)
):
    """Get current system settings (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can access system settings"
        )
    
    db = get_db()
    
    # Get settings from database or return defaults
    settings_doc = await db["system_settings"].find_one({"_id": "global"})
    
    if not settings_doc:
        # Return default settings
        return {
            "allowUserRegistration": True,
            "autoApproveCompanies": False,
            "autoApproveTouristSpots": False,
            "maintenanceMode": False
        }
    
    return {
        "allowUserRegistration": settings_doc.get("allowUserRegistration", True),
        "autoApproveCompanies": settings_doc.get("autoApproveCompanies", False),
        "autoApproveTouristSpots": settings_doc.get("autoApproveTouristSpots", False),
        "maintenanceMode": settings_doc.get("maintenanceMode", False)
    }

@router.put("")
async def update_system_setting(
    request: UpdateSettingRequest,
    current_user: UserInDB = Depends(get_current_user)
):
    """Update a system setting (admin only)"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can update system settings"
        )
    
    # Validate setting key
    valid_keys = ["allowUserRegistration", "autoApproveCompanies", "autoApproveTouristSpots", "maintenanceMode"]
    if request.key not in valid_keys:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid setting key. Must be one of: {', '.join(valid_keys)}"
        )
    
    db = get_db()
    
    # Update or create settings document
    await db["system_settings"].update_one(
        {"_id": "global"},
        {"$set": {request.key: request.value}},
        upsert=True
    )
    
    return {
        "success": True,
        "message": f"{request.key} has been {'enabled' if request.value else 'disabled'}",
        "key": request.key,
        "value": request.value
    }

@router.get("/check-maintenance")
async def check_maintenance_mode():
    """Check if system is in maintenance mode (public endpoint)"""
    db = get_db()
    settings_doc = await db["system_settings"].find_one({"_id": "global"})
    
    maintenance_mode = settings_doc.get("maintenanceMode", False) if settings_doc else False
    
    return {
        "maintenanceMode": maintenance_mode,
        "message": "System is currently under maintenance" if maintenance_mode else "System is operational"
    }
