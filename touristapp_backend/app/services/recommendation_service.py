from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from app.models.user import UserInDB
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import random
import math
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
import pandas as pd
from app.services.maps_service import calculate_distance
import asyncio

class RecommendationEngine:
    """Advanced recommendation engine for tourist spots and tour packages"""
    
    @staticmethod
    async def get_personalized_spots(
        user: UserInDB, 
        limit: int = 10,
        user_location: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """Get personalized tourist spot recommendations for a user"""
        db = get_db()
        spots_collection = db["tourist_spots"]
        bookings_collection = db["bookings"]
        ratings_collection = db["ratings"]
        
        # Get user's booking and rating history
        user_history = await RecommendationEngine._get_user_history(user.id)
        
        # Get all tourist spots
        all_spots = await spots_collection.find({}).to_list(length=None)
        
        recommendations = []
        for spot_data in all_spots:
            score = await RecommendationEngine._calculate_spot_score(
                spot_data, user, user_history, user_location
            )
            
            if score > 0:
                spot_dict = {
                    "id": str(spot_data["_id"]),
                    "name": spot_data["name"],
                    "description": spot_data["description"],
                    "location": spot_data["location"],
                    "region": spot_data["region"],
                    "categories": spot_data["categories"],
                    "rating": spot_data.get("rating", 0.0),
                    "total_ratings": spot_data.get("total_ratings", 0),
                    "entry_fee": spot_data.get("entry_fee", 0.0),
                    "image_urls": spot_data.get("image_urls", []),
                    "recommendation_score": round(score, 2),
                    "recommendation_reasons": RecommendationEngine._get_recommendation_reasons(
                        spot_data, user, user_history
                    )
                }
                
                # Add distance if user location provided
                if user_location and "location" in spot_data:
                    distance = calculate_distance(
                        user_location["latitude"], user_location["longitude"],
                        spot_data["location"]["latitude"], spot_data["location"]["longitude"]
                    )
                    spot_dict["distance_km"] = round(distance, 2)
                
                recommendations.append(spot_dict)
        
        # Sort by recommendation score and return top results
        recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    async def get_personalized_packages(
        user: UserInDB, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get personalized tour package recommendations"""
        db = get_db()
        packages_collection = db["tour_packages"]
        
        user_history = await RecommendationEngine._get_user_history(user.id)
        all_packages = await packages_collection.find({"status": "active"}).to_list(length=None)
        
        recommendations = []
        for package_data in all_packages:
            score = await RecommendationEngine._calculate_package_score(
                package_data, user, user_history
            )
            
            if score > 0:
                package_dict = {
                    "id": str(package_data["_id"]),
                    "name": package_data["name"],
                    "description": package_data["description"],
                    "price": package_data["price"],
                    "duration_days": package_data["duration_days"],
                    "destinations": package_data["destinations"],
                    "max_participants": package_data["max_participants"],
                    "current_participants": package_data.get("current_participants", 0),
                    "recommendation_score": round(score, 2),
                    "recommendation_reasons": RecommendationEngine._get_package_recommendation_reasons(
                        package_data, user, user_history
                    )
                }
                recommendations.append(package_dict)
        
        recommendations.sort(key=lambda x: x["recommendation_score"], reverse=True)
        return recommendations[:limit]
    
    @staticmethod
    async def get_similar_spots(spot_id: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Get spots similar to a given spot"""
        db = get_db()
        spots_collection = db["tourist_spots"]
        
        # Get the reference spot
        reference_spot = await spots_collection.find_one({"_id": ObjectId(spot_id)})
        if not reference_spot:
            return []
        
        # Find similar spots based on categories and region
        similar_spots = []
        all_spots = await spots_collection.find({
            "_id": {"$ne": ObjectId(spot_id)}
        }).to_list(length=None)
        
        for spot_data in all_spots:
            similarity_score = RecommendationEngine._calculate_spot_similarity(
                reference_spot, spot_data
            )
            
            if similarity_score > 0.3:  # Threshold for similarity
                spot_dict = {
                    "id": str(spot_data["_id"]),
                    "name": spot_data["name"],
                    "description": spot_data["description"],
                    "location": spot_data["location"],
                    "categories": spot_data["categories"],
                    "rating": spot_data.get("rating", 0.0),
                    "similarity_score": round(similarity_score, 2)
                }
                similar_spots.append(spot_dict)
        
        similar_spots.sort(key=lambda x: x["similarity_score"], reverse=True)
        return similar_spots[:limit]
    
    @staticmethod
    async def get_trending_spots(limit: int = 10) -> List[Dict[str, Any]]:
        """Get trending tourist spots based on recent bookings and ratings"""
        db = get_db()
        spots_collection = db["tourist_spots"]
        bookings_collection = db["bookings"]
        ratings_collection = db["ratings"]
        
        # Get spots with high ratings and recent activity
        pipeline = [
            {
                "$match": {
                    "rating": {"$gte": 4.0},
                    "total_ratings": {"$gte": 5}
                }
            },
            {
                "$sort": {
                    "rating": -1,
                    "total_ratings": -1
                }
            },
            {
                "$limit": limit
            }
        ]
        
        trending_spots = await spots_collection.aggregate(pipeline).to_list(length=None)
        
        result = []
        for spot_data in trending_spots:
            spot_dict = {
                "id": str(spot_data["_id"]),
                "name": spot_data["name"],
                "description": spot_data["description"],
                "location": spot_data["location"],
                "categories": spot_data["categories"],
                "rating": spot_data.get("rating", 0.0),
                "total_ratings": spot_data.get("total_ratings", 0),
                "trending_score": spot_data.get("rating", 0.0) * (1 + spot_data.get("total_ratings", 0) / 100)
            }
            result.append(spot_dict)
        
        return result
    
    @staticmethod
    async def _get_user_history(user_id: str) -> Dict[str, Any]:
        """Get user's booking and rating history"""
        db = get_db()
        bookings_collection = db["bookings"]
        ratings_collection = db["ratings"]
        
        # Get user bookings
        bookings = await bookings_collection.find({"user_id": user_id}).to_list(length=None)
        
        # Get user ratings
        ratings = await ratings_collection.find({"tourist_id": user_id}).to_list(length=None)
        
        return {
            "bookings": bookings,
            "ratings": ratings,
            "visited_categories": RecommendationEngine._extract_categories_from_history(bookings),
            "preferred_price_range": RecommendationEngine._extract_price_preferences(bookings),
            "average_rating_given": RecommendationEngine._calculate_average_rating(ratings)
        }
    
    @staticmethod
    async def _calculate_spot_score(
        spot_data: Dict[str, Any], 
        user: UserInDB, 
        user_history: Dict[str, Any],
        user_location: Optional[Dict[str, float]] = None
    ) -> float:
        """Calculate recommendation score for a tourist spot"""
        score = 0.0
        
        # Base score from spot rating
        score += spot_data.get("rating", 0.0) * 0.3
        
        # Category preference matching
        if user.preferences and user.preferences.preferred_categories:
            spot_categories = [cat.lower() for cat in spot_data.get("categories", [])]
            user_categories = [cat.lower() for cat in user.preferences.preferred_categories]
            
            category_match = len(set(spot_categories) & set(user_categories))
            score += category_match * 2.0
        
        # Region preference matching
        if user.preferences and user.preferences.preferred_regions:
            if spot_data.get("region", "").lower() in [r.lower() for r in user.preferences.preferred_regions]:
                score += 1.5
        
        # Historical category preferences
        if user_history["visited_categories"]:
            spot_categories = set(cat.lower() for cat in spot_data.get("categories", []))
            history_categories = set(user_history["visited_categories"])
            
            if spot_categories & history_categories:
                score += 1.0
        
        # Distance factor (closer is better if location provided)
        if user_location and "location" in spot_data:
            distance = calculate_distance(
                user_location["latitude"], user_location["longitude"],
                spot_data["location"]["latitude"], spot_data["location"]["longitude"]
            )
            # Reduce score for very distant spots
            if distance > 100:
                score *= 0.5
            elif distance > 50:
                score *= 0.8
        
        # Budget consideration
        entry_fee = spot_data.get("entry_fee", 0.0)
        if user.preferences and user.preferences.budget_range:
            budget_max = user.preferences.budget_range.get("max", 1000)
            if entry_fee <= budget_max:
                score += 0.5
            else:
                score *= 0.3  # Penalize expensive spots if over budget
        
        return max(0.0, score)
    
    @staticmethod
    async def _calculate_package_score(
        package_data: Dict[str, Any], 
        user: UserInDB, 
        user_history: Dict[str, Any]
    ) -> float:
        """Calculate recommendation score for a tour package"""
        score = 0.0
        
        # Budget matching
        package_price = package_data.get("price", 0)
        if user.preferences and user.preferences.budget_range:
            budget_min = user.preferences.budget_range.get("min", 0)
            budget_max = user.preferences.budget_range.get("max", 10000)
            
            if budget_min <= package_price <= budget_max:
                score += 3.0
            elif package_price > budget_max:
                score *= 0.2  # Heavy penalty for over-budget packages
        
        # Duration preferences (based on travel style)
        duration = package_data.get("duration_days", 1)
        if user.preferences and user.preferences.travel_style:
            if user.preferences.travel_style == "quick" and duration <= 3:
                score += 1.0
            elif user.preferences.travel_style == "extended" and duration >= 7:
                score += 1.0
            elif user.preferences.travel_style == "standard" and 3 <= duration <= 7:
                score += 1.0
        
        # Group size matching
        if user.preferences and user.preferences.group_size_preference:
            max_participants = package_data.get("max_participants", 1)
            if max_participants >= user.preferences.group_size_preference:
                score += 0.5
        
        # Historical preferences
        if user_history["preferred_price_range"]:
            hist_min, hist_max = user_history["preferred_price_range"]
            if hist_min <= package_price <= hist_max:
                score += 1.0
        
        return max(0.0, score)
    
    @staticmethod
    def _calculate_spot_similarity(spot1: Dict[str, Any], spot2: Dict[str, Any]) -> float:
        """Calculate similarity between two spots"""
        similarity = 0.0
        
        # Category similarity
        cats1 = set(spot1.get("categories", []))
        cats2 = set(spot2.get("categories", []))
        
        if cats1 and cats2:
            category_similarity = len(cats1 & cats2) / len(cats1 | cats2)
            similarity += category_similarity * 0.6
        
        # Region similarity
        if spot1.get("region") == spot2.get("region"):
            similarity += 0.3
        
        # Rating similarity
        rating1 = spot1.get("rating", 0.0)
        rating2 = spot2.get("rating", 0.0)
        rating_diff = abs(rating1 - rating2)
        rating_similarity = max(0, 1 - rating_diff / 5.0)
        similarity += rating_similarity * 0.1
        
        return similarity
    
    @staticmethod
    def _extract_categories_from_history(bookings: List[Dict[str, Any]]) -> List[str]:
        """Extract preferred categories from booking history"""
        # This would require joining with tour packages to get destinations
        # For now, return empty list - would need more complex query
        return []
    
    @staticmethod
    def _extract_price_preferences(bookings: List[Dict[str, Any]]) -> Optional[tuple]:
        """Extract price preferences from booking history"""
        if not bookings:
            return None
        
        prices = [booking.get("total_amount", 0) for booking in bookings if booking.get("total_amount")]
        if not prices:
            return None
        
        return (min(prices), max(prices))
    
    @staticmethod
    def _calculate_average_rating(ratings: List[Dict[str, Any]]) -> float:
        """Calculate average rating given by user"""
        if not ratings:
            return 0.0
        
        total_rating = sum(rating.get("rating", 0) for rating in ratings)
        return total_rating / len(ratings)
    
    @staticmethod
    def _get_recommendation_reasons(
        spot_data: Dict[str, Any], 
        user: UserInDB, 
        user_history: Dict[str, Any]
    ) -> List[str]:
        """Generate human-readable reasons for recommendation"""
        reasons = []
        
        if spot_data.get("rating", 0) >= 4.5:
            reasons.append("Highly rated by other travelers")
        
        if user.preferences and user.preferences.preferred_categories:
            spot_categories = [cat.lower() for cat in spot_data.get("categories", [])]
            user_categories = [cat.lower() for cat in user.preferences.preferred_categories]
            
            matches = set(spot_categories) & set(user_categories)
            if matches:
                reasons.append(f"Matches your interest in {', '.join(matches)}")
        
        if user.preferences and user.preferences.preferred_regions:
            if spot_data.get("region", "").lower() in [r.lower() for r in user.preferences.preferred_regions]:
                reasons.append(f"Located in your preferred region: {spot_data.get('region')}")
        
        entry_fee = spot_data.get("entry_fee", 0.0)
        if entry_fee == 0:
            reasons.append("Free entry")
        elif entry_fee < 10:
            reasons.append("Affordable entry fee")
        
        if not reasons:
            reasons.append("Popular destination")
        
        return reasons
    
    @staticmethod
    def _get_package_recommendation_reasons(
        package_data: Dict[str, Any], 
        user: UserInDB, 
        user_history: Dict[str, Any]
    ) -> List[str]:
        """Generate reasons for package recommendations"""
        reasons = []
        
        if user.preferences and user.preferences.budget_range:
            package_price = package_data.get("price", 0)
            budget_max = user.preferences.budget_range.get("max", 10000)
            
            if package_price <= budget_max:
                reasons.append("Within your budget")
        
        duration = package_data.get("duration_days", 1)
        if duration <= 3:
            reasons.append("Perfect for a short getaway")
        elif duration >= 7:
            reasons.append("Great for an extended vacation")
        else:
            reasons.append("Ideal duration for a memorable trip")
        
        if package_data.get("current_participants", 0) < package_data.get("max_participants", 1):
            reasons.append("Available spots remaining")
        
        if not reasons:
            reasons.append("Popular tour package")
        
        return reasons
