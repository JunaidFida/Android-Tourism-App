from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import UserInDB, UserUpdate, UserRole
from app.services.user_service import (
    get_user_by_id,
    update_user,
    deactivate_user,
    activate_user,
    get_user_by_email
)
from app.utils.security import get_current_user
from typing import List

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/{user_id}", response_model=UserInDB)
async def read_user(user_id: str, current_user: UserInDB = Depends(get_current_user)):
    # Only admin or the user themselves can view user details
    if current_user.role != UserRole.ADMIN and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this user's information"
        )
    
    user = await get_user_by_id(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.put("/{user_id}", response_model=UserInDB)
async def update_user_profile(
    user_id: str,
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin or the user themselves can update the profile
    if current_user.role != UserRole.ADMIN and str(current_user.id) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user's profile"
        )
    
    return await update_user(user_id, user_update)

@router.post("/{user_id}/deactivate")
async def deactivate_user_account(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin can deactivate accounts (except their own)
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can deactivate accounts"
        )
    
    if str(current_user.id) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin cannot deactivate their own account"
        )
    
    success = await deactivate_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User account deactivated"}

@router.post("/{user_id}/activate")
async def activate_user_account(
    user_id: str,
    current_user: UserInDB = Depends(get_current_user)
):
    # Only admin can activate accounts
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can activate accounts"
        )
    
    success = await activate_user(user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"message": "User account activated"}

@router.get("/", response_model=List[UserInDB])
async def list_users(current_user: UserInDB = Depends(get_current_user)):
    # Only admin can list all users
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin can list all users"
        )
    
    # Implementation would go here
    # For brevity, we'll just return the current user
    return [current_user]