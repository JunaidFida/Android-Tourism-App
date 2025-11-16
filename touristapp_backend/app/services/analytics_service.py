from typing import Dict, Any, List
from app.database import get_db
from datetime import datetime, timedelta
from bson import ObjectId

class AnalyticsService:
    """Service for generating analytics and insights"""
    
    @staticmethod
    async def get_company_overview(company_id: str) -> Dict[str, Any]:
        """Get overview statistics for a travel company"""
        db = get_db()
        
        # Get company's packages
        packages = await db["tour_packages"].find({"travel_company_id": company_id}).to_list(length=None)
        package_ids = [str(pkg["_id"]) for pkg in packages]
        
        # Get bookings for company's packages
        bookings = await db["bookings"].find({"tour_package_id": {"$in": package_ids}}).to_list(length=None)
        
        # Get ratings for company's packages
        ratings = await db["ratings"].find({"tour_package_id": {"$in": package_ids}}).to_list(length=None)
        
        # Calculate metrics
        total_packages = len(packages)
        active_packages = len([p for p in packages if p.get("status") == "active"])
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b.get("status") == "confirmed"])
        completed_bookings = len([b for b in bookings if b.get("status") == "completed"])
        
        total_revenue = sum(booking.get("total_amount", 0) for booking in bookings if booking.get("status") in ["confirmed", "completed"])
        
        average_rating = 0.0
        if ratings:
            average_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings)
        
        # Recent activity (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        recent_bookings = [b for b in bookings if datetime.fromisoformat(b.get("booking_date", "1970-01-01")) > thirty_days_ago]
        
        return {
            "total_packages": total_packages,
            "active_packages": active_packages,
            "total_bookings": total_bookings,
            "confirmed_bookings": confirmed_bookings,
            "completed_bookings": completed_bookings,
            "total_revenue": round(total_revenue, 2),
            "average_rating": round(average_rating, 2),
            "total_ratings": len(ratings),
            "recent_bookings_30d": len(recent_bookings),
            "booking_conversion_rate": round((confirmed_bookings / max(total_bookings, 1)) * 100, 2)
        }
    
    @staticmethod
    async def get_booking_analytics(company_id: str, days: int = 30) -> Dict[str, Any]:
        """Get booking analytics for specified time period"""
        db = get_db()
        
        # Get company's packages
        packages = await db["tour_packages"].find({"travel_company_id": company_id}).to_list(length=None)
        package_ids = [str(pkg["_id"]) for pkg in packages]
        
        # Get bookings within time period
        start_date = datetime.now() - timedelta(days=days)
        bookings = await db["bookings"].find({
            "tour_package_id": {"$in": package_ids},
            "booking_date": {"$gte": start_date.isoformat()}
        }).to_list(length=None)
        
        # Group bookings by status
        status_counts = {}
        for booking in bookings:
            status = booking.get("status", "unknown")
            status_counts[status] = status_counts.get(status, 0) + 1
        
        # Group bookings by day
        daily_bookings = {}
        for booking in bookings:
            booking_date = datetime.fromisoformat(booking.get("booking_date", "1970-01-01")).date()
            daily_bookings[str(booking_date)] = daily_bookings.get(str(booking_date), 0) + 1
        
        # Most popular packages
        package_bookings = {}
        for booking in bookings:
            pkg_id = booking.get("tour_package_id")
            package_bookings[pkg_id] = package_bookings.get(pkg_id, 0) + 1
        
        popular_packages = []
        for pkg in packages:
            pkg_id = str(pkg["_id"])
            booking_count = package_bookings.get(pkg_id, 0)
            if booking_count > 0:
                popular_packages.append({
                    "package_id": pkg_id,
                    "package_name": pkg.get("name"),
                    "booking_count": booking_count
                })
        
        popular_packages.sort(key=lambda x: x["booking_count"], reverse=True)
        
        return {
            "period_days": days,
            "total_bookings": len(bookings),
            "status_breakdown": status_counts,
            "daily_bookings": daily_bookings,
            "popular_packages": popular_packages[:5],
            "average_daily_bookings": round(len(bookings) / max(days, 1), 2)
        }
    
    @staticmethod
    async def get_revenue_analytics(company_id: str, days: int = 30) -> Dict[str, Any]:
        """Get revenue analytics for specified time period"""
        db = get_db()
        
        # Get company's packages
        packages = await db["tour_packages"].find({"travel_company_id": company_id}).to_list(length=None)
        package_ids = [str(pkg["_id"]) for pkg in packages]
        
        # Get bookings within time period
        start_date = datetime.now() - timedelta(days=days)
        bookings = await db["bookings"].find({
            "tour_package_id": {"$in": package_ids},
            "booking_date": {"$gte": start_date.isoformat()},
            "status": {"$in": ["confirmed", "completed"]}
        }).to_list(length=None)
        
        total_revenue = sum(booking.get("total_amount", 0) for booking in bookings)
        
        # Daily revenue breakdown
        daily_revenue = {}
        for booking in bookings:
            booking_date = datetime.fromisoformat(booking.get("booking_date", "1970-01-01")).date()
            amount = booking.get("total_amount", 0)
            daily_revenue[str(booking_date)] = daily_revenue.get(str(booking_date), 0) + amount
        
        # Revenue by package
        package_revenue = {}
        for booking in bookings:
            pkg_id = booking.get("tour_package_id")
            amount = booking.get("total_amount", 0)
            package_revenue[pkg_id] = package_revenue.get(pkg_id, 0) + amount
        
        revenue_by_package = []
        for pkg in packages:
            pkg_id = str(pkg["_id"])
            revenue = package_revenue.get(pkg_id, 0)
            if revenue > 0:
                revenue_by_package.append({
                    "package_id": pkg_id,
                    "package_name": pkg.get("name"),
                    "revenue": revenue,
                    "price": pkg.get("price", 0)
                })
        
        revenue_by_package.sort(key=lambda x: x["revenue"], reverse=True)
        
        return {
            "period_days": days,
            "total_revenue": round(total_revenue, 2),
            "average_daily_revenue": round(total_revenue / max(days, 1), 2),
            "daily_revenue": daily_revenue,
            "revenue_by_package": revenue_by_package[:10],
            "total_bookings": len(bookings)
        }
    
    @staticmethod
    async def get_package_performance(company_id: str) -> Dict[str, Any]:
        """Get performance metrics for all company packages"""
        db = get_db()
        
        # Get company's packages
        packages = await db["tour_packages"].find({"travel_company_id": company_id}).to_list(length=None)
        
        performance_data = []
        
        for package in packages:
            pkg_id = str(package["_id"])
            
            # Get bookings for this package
            bookings = await db["bookings"].find({"tour_package_id": pkg_id}).to_list(length=None)
            
            # Get ratings for this package
            ratings = await db["ratings"].find({"tour_package_id": pkg_id}).to_list(length=None)
            
            total_bookings = len(bookings)
            confirmed_bookings = len([b for b in bookings if b.get("status") == "confirmed"])
            completed_bookings = len([b for b in bookings if b.get("status") == "completed"])
            
            total_revenue = sum(b.get("total_amount", 0) for b in bookings if b.get("status") in ["confirmed", "completed"])
            
            average_rating = 0.0
            if ratings:
                average_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings)
            
            # Calculate occupancy rate
            max_participants = package.get("max_participants", 1)
            current_participants = package.get("current_participants", 0)
            occupancy_rate = (current_participants / max_participants) * 100 if max_participants > 0 else 0
            
            performance_data.append({
                "package_id": pkg_id,
                "package_name": package.get("name"),
                "price": package.get("price", 0),
                "duration_days": package.get("duration_days", 0),
                "status": package.get("status", "inactive"),
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "completed_bookings": completed_bookings,
                "total_revenue": round(total_revenue, 2),
                "average_rating": round(average_rating, 2),
                "total_ratings": len(ratings),
                "occupancy_rate": round(occupancy_rate, 2),
                "max_participants": max_participants,
                "current_participants": current_participants
            })
        
        # Sort by revenue
        performance_data.sort(key=lambda x: x["total_revenue"], reverse=True)
        
        return {
            "total_packages": len(packages),
            "package_performance": performance_data
        }
    
    @staticmethod
    async def get_system_analytics() -> Dict[str, Any]:
        """Get system-wide analytics (admin only)"""
        db = get_db()
        
        # Count documents in each collection
        users_count = await db["users"].count_documents({})
        tourist_count = await db["users"].count_documents({"role": "tourist"})
        company_count = await db["users"].count_documents({"role": "travel_company"})
        admin_count = await db["users"].count_documents({"role": "admin"})
        
        packages_count = await db["tour_packages"].count_documents({})
        active_packages = await db["tour_packages"].count_documents({"status": "active"})
        
        spots_count = await db["tourist_spots"].count_documents({})
        bookings_count = await db["bookings"].count_documents({})
        ratings_count = await db["ratings"].count_documents({})
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.now() - timedelta(days=7)
        recent_users = await db["users"].count_documents({
            "created_at": {"$gte": seven_days_ago.isoformat()}
        })
        recent_bookings = await db["bookings"].count_documents({
            "booking_date": {"$gte": seven_days_ago.isoformat()}
        })
        
        # Top performing packages
        pipeline = [
            {
                "$lookup": {
                    "from": "bookings",
                    "localField": "_id",
                    "foreignField": "tour_package_id",
                    "as": "bookings"
                }
            },
            {
                "$addFields": {
                    "booking_count": {"$size": "$bookings"},
                    "total_revenue": {
                        "$sum": {
                            "$map": {
                                "input": "$bookings",
                                "as": "booking",
                                "in": "$$booking.total_amount"
                            }
                        }
                    }
                }
            },
            {
                "$sort": {"total_revenue": -1}
            },
            {
                "$limit": 5
            }
        ]
        
        top_packages = await db["tour_packages"].aggregate(pipeline).to_list(length=None)
        
        return {
            "users": {
                "total": users_count,
                "tourists": tourist_count,
                "companies": company_count,
                "admins": admin_count,
                "recent_signups_7d": recent_users
            },
            "packages": {
                "total": packages_count,
                "active": active_packages,
                "inactive": packages_count - active_packages
            },
            "tourist_spots": spots_count,
            "bookings": {
                "total": bookings_count,
                "recent_7d": recent_bookings
            },
            "ratings": ratings_count,
            "top_performing_packages": [
                {
                    "package_id": str(pkg["_id"]),
                    "name": pkg.get("name"),
                    "booking_count": pkg.get("booking_count", 0),
                    "total_revenue": pkg.get("total_revenue", 0)
                }
                for pkg in top_packages
            ]
        }
    
    @staticmethod
    async def get_user_activity(days: int = 30) -> Dict[str, Any]:
        """Get user login and activity analytics"""
        db = get_db()
        
        # Get all users
        users = await db["users"].find({}).to_list(length=None)
        
        # Calculate activity metrics
        start_date = datetime.now() - timedelta(days=days)
        
        # Users created in period
        new_users = [u for u in users if datetime.fromisoformat(u.get("created_at", "1970-01-01")) > start_date]
        
        # Active users (users with recent bookings or ratings)
        recent_bookings = await db["bookings"].find({
            "booking_date": {"$gte": start_date.isoformat()}
        }).to_list(length=None)
        
        recent_ratings = await db["ratings"].find({
            "created_at": {"$gte": start_date.isoformat()}
        }).to_list(length=None)
        
        active_user_ids = set()
        for booking in recent_bookings:
            active_user_ids.add(booking.get("tourist_id"))
        for rating in recent_ratings:
            active_user_ids.add(rating.get("user_id"))
        
        # Group by role
        role_activity = {
            "tourist": 0,
            "travel_company": 0,
            "admin": 0
        }
        
        for user in users:
            if str(user["_id"]) in active_user_ids:
                role = user.get("role", "tourist")
                role_activity[role] = role_activity.get(role, 0) + 1
        
        return {
            "period_days": days,
            "total_users": len(users),
            "new_users": len(new_users),
            "active_users": len(active_user_ids),
            "activity_by_role": role_activity,
            "user_growth_rate": round((len(new_users) / max(len(users) - len(new_users), 1)) * 100, 2)
        }
    
    @staticmethod
    async def get_popular_spots(limit: int = 10) -> Dict[str, Any]:
        """Get most visited/popular tourist spots"""
        db = get_db()
        
        # Get all tourist spots
        spots = await db["tourist_spots"].find({}).to_list(length=None)
        
        # Get ratings for each spot to determine popularity
        spot_popularity = []
        
        for spot in spots:
            spot_id = str(spot["_id"])
            
            # Count ratings as a proxy for visits
            ratings = await db["ratings"].find({"tourist_spot_id": spot_id}).to_list(length=None)
            rating_count = len(ratings)
            
            # Calculate average rating
            avg_rating = 0.0
            if ratings:
                avg_rating = sum(r.get("rating", 0) for r in ratings) / len(ratings)
            
            # Count bookings that include this spot
            bookings_with_spot = await db["bookings"].count_documents({
                "destinations": {"$in": [spot.get("name")]}
            })
            
            # Calculate popularity score (weighted combination)
            popularity_score = (rating_count * 2) + (bookings_with_spot * 3) + (avg_rating * 10)
            
            spot_popularity.append({
                "spot_id": spot_id,
                "name": spot.get("name"),
                "region": spot.get("region", "Unknown"),
                "category": spot.get("category", "general"),
                "rating_count": rating_count,
                "average_rating": round(avg_rating, 2),
                "booking_count": bookings_with_spot,
                "popularity_score": round(popularity_score, 2),
                "visit_count": rating_count + bookings_with_spot  # Approximate visits
            })
        
        # Sort by popularity score
        spot_popularity.sort(key=lambda x: x["popularity_score"], reverse=True)
        
        return {
            "total_spots": len(spots),
            "popular_spots": spot_popularity[:limit]
        }
