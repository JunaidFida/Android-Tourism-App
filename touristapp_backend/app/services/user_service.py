from typing import Optional
from app.models.user import UserCreate, UserInDB, UserUpdate, UserRole
from app.utils.security import get_password_hash
from app.database import get_db
from bson import ObjectId
from fastapi import HTTPException, status

def validate_password_strength(password: str) -> bool:
    """Validate password strength according to UC-01 requirements"""
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters long"
        )
    
    import re
    has_upper = bool(re.search(r'[A-Z]', password))
    has_lower = bool(re.search(r'[a-z]', password))
    has_digit = bool(re.search(r'\d', password))
    
    if not (has_upper and has_lower and has_digit):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must contain at least one uppercase letter, one lowercase letter, and one number"
        )
    
    return True

def validate_email_format(email: str) -> bool:
    """Validate email format according to UC-01 requirements"""
    import re
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_pattern, email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please enter a valid email address format"
        )
    return True

async def create_user(user: UserCreate):
    """Create user according to UC-01 specifications"""
    db = get_db()
    
    # UC-01 Step 4: Validate entered data
    validate_email_format(user.email)
    validate_password_strength(user.password)
    
    # Check if email is already registered (UC-01 Step 4)
    existing_user = await db.users.find_one({"email": user.email.lower()})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered. Please use a different email address or try logging in."
        )
    
    # Validate full name
    if not user.full_name or not user.full_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name is required"
        )
    
    # Hash password and prepare user data
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict(exclude={"password"})
    user_dict["email"] = user.email.lower()  # Store email in lowercase
    user_dict["full_name"] = user.full_name.strip()
    user_dict["hashed_password"] = hashed_password
    
    # Set creation timestamp
    from datetime import datetime
    user_dict["created_at"] = datetime.now().isoformat()
    
    # UC-01: Travel companies start as inactive and need admin approval
    if user.role == UserRole.TRAVEL_COMPANY:
        user_dict["is_active"] = False
    else:
        user_dict["is_active"] = True
    
    # UC-01 Step 5: Successfully create user account and store in database
    result = await db.users.insert_one(user_dict)
    created_user = await db.users.find_one({"_id": result.inserted_id})
    return UserInDB.from_mongo(created_user)

async def get_user_by_email(email: str):
    db = get_db()
    user = await db.users.find_one({"email": email})
    if not user:
        return None
    return UserInDB.from_mongo(user)

async def get_user_by_id(user_id: str):
    db = get_db()
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return None
    return UserInDB.from_mongo(user)

async def update_user(user_id: str, user_update: UserUpdate):
    db = get_db()
    update_data = user_update.dict(exclude_unset=True)
    
    if len(update_data) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No data provided for update"
        )
    
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or no changes made"
        )
    
    updated_user = await db.users.find_one({"_id": ObjectId(user_id)})
    return UserInDB.from_mongo(updated_user)

async def deactivate_user(user_id: str):
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": False}}
    )
    return result.modified_count > 0

async def activate_user(user_id: str):
    db = get_db()
    result = await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"is_active": True}}
    )
    return result.modified_count > 0