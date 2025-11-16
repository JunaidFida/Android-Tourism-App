from fastapi import APIRouter, Depends, HTTPException, status
from datetime import timedelta
from app.models.user import UserCreate, UserInDB, UserRole
from app.services.user_service import create_user, get_user_by_email, update_user
from app.utils.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)
from app.config import settings
from pydantic import BaseModel, EmailStr

class PasswordChange(BaseModel):
    old_password: str
    new_password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=UserInDB)
async def signup(user: UserCreate):
    db_user = await get_user_by_email(user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return await create_user(user)

@router.post("/login")
async def login(credentials: LoginRequest):
    """Login endpoint according to UC-02 specifications"""
    
    # Validate email format
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, credentials.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address format"
        )
    
    # Find user by email (case-insensitive)
    user = await get_user_by_email(credentials.email.lower())
    
    # Check if user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No account found with this email address. Please check your email or sign up for a new account.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password. Please check your credentials and try again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is active
    if not user.is_active:
        if user.role == UserRole.TRAVEL_COMPANY:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your travel company account is pending admin approval. Please wait for approval notification.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Your account is inactive. Please contact support for assistance.",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    # Update last login timestamp
    from datetime import datetime
    from app.models.user import UserUpdate
    await update_user(str(user.id), UserUpdate(last_login=datetime.now().isoformat()))
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email, "id": str(user.id), "role": user.role},
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "phone_number": user.phone_number,
            "profile_picture": user.profile_picture
        }
    }

@router.post("/change-password")
async def change_password(
    password_change: PasswordChange,
    current_user: UserInDB = Depends(get_current_user)
):
    # Verify old password
    if not verify_password(password_change.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password"
        )
    
    # Hash new password and update user
    new_hashed_password = get_password_hash(password_change.new_password)
    from app.models.user import UserUpdate
    user_update = UserUpdate(hashed_password=new_hashed_password)
    
    updated_user = await update_user(str(current_user.id), user_update)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update password"
        )
    
    return {"message": "Password changed successfully"}

@router.get("/me", response_model=UserInDB)
async def read_users_me(current_user: UserInDB = Depends(get_current_user)):
    return current_user