from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from app.models.user import UserRole
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import re

class AdminService:
    """Service for admin user management operations"""
    
    @staticmethod
    async def get_all_users(
        skip: int = 0,
        limit: int = 50,
        role: Optional[UserRole] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get all users with filtering options"""
        db = get_db()
        
        # Build query filter
        query = {}
        
        if role:
            query["role"] = role.value
        
        if is_active is not None:
            query["is_active"] = is_active
        
        if search:
            # Search in full_name and email using regex
            search_regex = re.compile(search, re.IGNORECASE)
            query["$or"] = [
                {"full_name": {"$regex": search_regex}},
                {"email": {"$regex": search_regex}}
            ]
        
        # Execute query
        cursor = db["users"].find(query).skip(skip).limit(limit)
        users = []
        
        async for user in cursor:
            # Remove sensitive information
            user_data = {
                "id": str(user["_id"]),
                "email": user["email"],
                "full_name": user["full_name"],
                "phone_number": user.get("phone_number"),
                "role": user["role"],
                "is_active": user["is_active"],
                "created_at": user.get("created_at"),
                "profile_picture": user.get("profile_picture")
            }
            users.append(user_data)
        
        return users
    
    @staticmethod
    async def get_user_details(user_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific user"""
        db = get_db()
        
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Get user statistics
            bookings_count = await db["bookings"].count_documents({"user_id": user_id})
            ratings_count = await db["ratings"].count_documents({"tourist_id": user_id})
            
            # Get recent bookings
            recent_bookings = []
            cursor = db["bookings"].find({"user_id": user_id}).sort("booking_date", -1).limit(5)
            async for booking in cursor:
                # Get package details
                package = await db["tour_packages"].find_one({"_id": ObjectId(booking["tour_package_id"])})
                recent_bookings.append({
                    "id": str(booking["_id"]),
                    "package_name": package["name"] if package else "Unknown Package",
                    "booking_date": booking["booking_date"],
                    "status": booking["status"],
                    "total_amount": booking["total_amount"]
                })
            
            user_details = {
                "id": str(user["_id"]),
                "email": user["email"],
                "full_name": user["full_name"],
                "phone_number": user.get("phone_number"),
                "role": user["role"],
                "is_active": user["is_active"],
                "created_at": user.get("created_at"),
                "profile_picture": user.get("profile_picture"),
                "preferences": user.get("preferences"),
                "statistics": {
                    "total_bookings": bookings_count,
                    "total_ratings": ratings_count
                },
                "recent_bookings": recent_bookings
            }
            
            return user_details
            
        except Exception:
            return None
    
    @staticmethod
    async def update_user_status(user_id: str, is_active: bool) -> bool:
        """Update user active status"""
        db = get_db()
        
        try:
            result = await db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"is_active": is_active}}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def update_user_role(user_id: str, role: UserRole) -> bool:
        """Update user role"""
        db = get_db()
        
        try:
            result = await db["users"].update_one(
                {"_id": ObjectId(user_id)},
                {"$set": {"role": role.value}}
            )
            return result.modified_count > 0
        except Exception:
            return False
    
    @staticmethod
    async def delete_user(user_id: str, force: bool = False) -> Dict[str, Any]:
        """Delete a user account"""
        db = get_db()
        
        try:
            # Check if user has active bookings
            active_bookings = await db["bookings"].count_documents({
                "user_id": user_id,
                "status": {"$in": ["pending", "confirmed"]}
            })
            
            if active_bookings > 0 and not force:
                return {
                    "success": False,
                    "message": f"User has {active_bookings} active bookings. Use force=true to delete anyway."
                }
            
            # Delete user and related data
            await db["users"].delete_one({"_id": ObjectId(user_id)})
            
            # Optionally delete related data (bookings, ratings)
            if force:
                await db["bookings"].delete_many({"user_id": user_id})
                await db["ratings"].delete_many({"tourist_id": user_id})
            
            return {"success": True, "message": "User deleted successfully"}
            
        except Exception as e:
            return {"success": False, "message": f"Error deleting user: {str(e)}"}
    
    @staticmethod
    async def get_user_activity(user_id: str, days: int = 30) -> Optional[Dict[str, Any]]:
        """Get user activity summary"""
        db = get_db()
        
        try:
            user = await db["users"].find_one({"_id": ObjectId(user_id)})
            if not user:
                return None
            
            # Calculate date range
            end_date = datetime.now()
            start_date = end_date - timedelta(days=days)
            
            # Get bookings in date range
            bookings_cursor = db["bookings"].find({
                "user_id": user_id,
                "booking_date": {
                    "$gte": start_date.isoformat(),
                    "$lte": end_date.isoformat()
                }
            })
            
            bookings = []
            total_spent = 0
            async for booking in bookings_cursor:
                bookings.append({
                    "id": str(booking["_id"]),
                    "booking_date": booking["booking_date"],
                    "status": booking["status"],
                    "total_amount": booking["total_amount"]
                })
                total_spent += booking["total_amount"]
            
            # Get ratings in date range
            ratings_count = await db["ratings"].count_documents({
                "tourist_id": user_id,
                "created_at": {
                    "$gte": start_date.isoformat(),
                    "$lte": end_date.isoformat()
                }
            })
            
            activity = {
                "user_id": user_id,
                "period_days": days,
                "bookings_count": len(bookings),
                "total_spent": total_spent,
                "ratings_given": ratings_count,
                "recent_bookings": bookings[:10]  # Limit to 10 most recent
            }
            
            return activity
            
        except Exception:
            return None
    
    @staticmethod
    async def get_admin_dashboard() -> Dict[str, Any]:
        """Get admin dashboard data"""
        db = get_db()
        
        # Get user statistics
        total_users = await db["users"].count_documents({})
        active_users = await db["users"].count_documents({"is_active": True})
        tourists = await db["users"].count_documents({"role": "tourist"})
        companies = await db["users"].count_documents({"role": "travel_company"})
        admins = await db["users"].count_documents({"role": "admin"})
        
        # Get booking statistics
        total_bookings = await db["bookings"].count_documents({})
        pending_bookings = await db["bookings"].count_documents({"status": "pending"})
        confirmed_bookings = await db["bookings"].count_documents({"status": "confirmed"})
        completed_bookings = await db["bookings"].count_documents({"status": "completed"})
        
        # Get package statistics
        total_packages = await db["tour_packages"].count_documents({})
        active_packages = await db["tour_packages"].count_documents({"status": "active"})
        
        # Get recent activity (last 7 days)
        seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
        new_users_week = await db["users"].count_documents({
            "created_at": {"$gte": seven_days_ago}
        })
        new_bookings_week = await db["bookings"].count_documents({
            "booking_date": {"$gte": seven_days_ago}
        })
        
        # Calculate total revenue
        revenue_pipeline = [
            {"$match": {"status": "completed"}},
            {"$group": {"_id": None, "total": {"$sum": "$total_amount"}}}
        ]
        revenue_result = await db["bookings"].aggregate(revenue_pipeline).to_list(1)
        total_revenue = revenue_result[0]["total"] if revenue_result else 0
        
        dashboard = {
            "users": {
                "total": total_users,
                "active": active_users,
                "tourists": tourists,
                "companies": companies,
                "admins": admins,
                "new_this_week": new_users_week
            },
            "bookings": {
                "total": total_bookings,
                "pending": pending_bookings,
                "confirmed": confirmed_bookings,
                "completed": completed_bookings,
                "new_this_week": new_bookings_week
            },
            "packages": {
                "total": total_packages,
                "active": active_packages
            },
            "revenue": {
                "total": total_revenue
            }
        }
        
        return dashboard
    
    @staticmethod
    async def generate_user_report() -> Dict[str, Any]:
        """Generate comprehensive user report"""
        db = get_db()
        
        # User distribution by role
        role_pipeline = [
            {"$group": {"_id": "$role", "count": {"$sum": 1}}}
        ]
        role_distribution = {}
        async for result in db["users"].aggregate(role_pipeline):
            role_distribution[result["_id"]] = result["count"]
        
        # User activity by month (last 12 months)
        monthly_signups = []
        for i in range(12):
            month_start = (datetime.now() - timedelta(days=30*i)).replace(day=1)
            month_end = (month_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
            
            count = await db["users"].count_documents({
                "created_at": {
                    "$gte": month_start.isoformat(),
                    "$lte": month_end.isoformat()
                }
            })
            
            monthly_signups.append({
                "month": month_start.strftime("%Y-%m"),
                "signups": count
            })
        
        # Top active users (by booking count)
        top_users_pipeline = [
            {"$group": {"_id": "$user_id", "booking_count": {"$sum": 1}}},
            {"$sort": {"booking_count": -1}},
            {"$limit": 10}
        ]
        
        top_users = []
        async for result in db["bookings"].aggregate(top_users_pipeline):
            user = await db["users"].find_one({"_id": ObjectId(result["_id"])})
            if user:
                top_users.append({
                    "user_id": result["_id"],
                    "name": user["full_name"],
                    "email": user["email"],
                    "booking_count": result["booking_count"]
                })
        
        report = {
            "generated_at": datetime.now().isoformat(),
            "role_distribution": role_distribution,
            "monthly_signups": monthly_signups,
            "top_active_users": top_users
        }
        
        return report
