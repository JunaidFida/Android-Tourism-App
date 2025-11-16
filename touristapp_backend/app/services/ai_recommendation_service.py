import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.database import get_db
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import math

class AIRecommendationEngine:
    """AI-powered recommendation engine using machine learning algorithms"""
    
    def __init__(self):
        self.tfidf_vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.scaler = StandardScaler()
        self.user_clusters = None
        self.spot_clusters = None
        
    async def build_user_profiles(self) -> pd.DataFrame:
        """Build user profiles for collaborative filtering"""
        db = get_db()
        
        # Get all users with preferences
        users = []
        async for user in db["users"].find({"preferences": {"$exists": True}}):
            profile = {
                "user_id": str(user["_id"]),
                "budget_min": user["preferences"].get("budget_range", {}).get("min", 0),
                "budget_max": user["preferences"].get("budget_range", {}).get("max", 100000),
                "group_size": user["preferences"].get("group_size_preference", 2),
                "travel_style": user["preferences"].get("travel_style", "cultural"),
                "preferred_categories": ",".join(user["preferences"].get("preferred_categories", [])),
                "preferred_regions": ",".join(user["preferences"].get("preferred_regions", []))
            }
            users.append(profile)
        
        return pd.DataFrame(users)
    
    async def build_spot_features(self) -> pd.DataFrame:
        """Build feature matrix for tourist spots"""
        db = get_db()
        
        spots = []
        async for spot in db["tourist_spots"].find():
            # Get average rating and booking count
            ratings_count = await db["ratings"].count_documents({"spot_id": str(spot["_id"])})
            
            # Calculate popularity score
            recent_bookings = await db["bookings"].count_documents({
                "tour_package_id": {"$in": await self._get_packages_for_spot(str(spot["_id"]))},
                "booking_date": {"$gte": (datetime.now() - timedelta(days=30)).isoformat()}
            })
            
            feature = {
                "spot_id": str(spot["_id"]),
                "name": spot["name"],
                "description": spot["description"],
                "categories": ",".join(spot.get("categories", [])),
                "region": spot.get("region", ""),
                "rating": spot.get("rating", 0),
                "total_ratings": spot.get("total_ratings", 0),
                "entry_fee": spot.get("entry_fee", 0),
                "latitude": spot["location"]["latitude"],
                "longitude": spot["location"]["longitude"],
                "popularity_score": recent_bookings,
                "ratings_count": ratings_count
            }
            spots.append(feature)
        
        return pd.DataFrame(spots)
    
    async def _get_packages_for_spot(self, spot_name: str) -> List[str]:
        """Get package IDs that include a specific spot"""
        db = get_db()
        packages = []
        async for package in db["tour_packages"].find({"destinations": spot_name}):
            packages.append(str(package["_id"]))
        return packages
    
    async def train_content_based_model(self):
        """Train content-based recommendation model"""
        spots_df = await self.build_spot_features()
        
        if spots_df.empty:
            return
        
        # Create text features for TF-IDF
        text_features = spots_df['description'] + ' ' + spots_df['categories'] + ' ' + spots_df['region']
        
        # Fit TF-IDF vectorizer
        tfidf_matrix = self.tfidf_vectorizer.fit_transform(text_features)
        
        # Numerical features
        numerical_features = spots_df[['rating', 'entry_fee', 'latitude', 'longitude', 'popularity_score']].fillna(0)
        numerical_scaled = self.scaler.fit_transform(numerical_features)
        
        # Combine features
        combined_features = np.hstack([tfidf_matrix.toarray(), numerical_scaled])
        
        # Cluster spots for better recommendations
        if len(spots_df) > 3:
            n_clusters = min(5, len(spots_df))
            self.spot_clusters = KMeans(n_clusters=n_clusters, random_state=42)
            self.spot_clusters.fit(combined_features)
    
    async def train_collaborative_model(self):
        """Train collaborative filtering model"""
        users_df = await self.build_user_profiles()
        
        if users_df.empty:
            return
        
        # Create user feature matrix
        categorical_features = pd.get_dummies(users_df[['travel_style']])
        numerical_features = users_df[['budget_min', 'budget_max', 'group_size']].fillna(0)
        
        # Combine features
        user_features = pd.concat([numerical_features, categorical_features], axis=1)
        user_features_scaled = self.scaler.fit_transform(user_features)
        
        # Cluster users with similar preferences
        if len(users_df) > 3:
            n_clusters = min(3, len(users_df))
            self.user_clusters = KMeans(n_clusters=n_clusters, random_state=42)
            self.user_clusters.fit(user_features_scaled)
    
    async def get_ai_spot_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get AI-powered spot recommendations"""
        db = get_db()
        
        # Get user data
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("preferences"):
            return await self._get_fallback_recommendations(limit)
        
        # Train models if not already trained
        await self.train_content_based_model()
        await self.train_collaborative_model()
        
        # Get content-based recommendations
        content_recs = await self._get_content_based_recommendations(user, limit)
        
        # Get collaborative recommendations
        collab_recs = await self._get_collaborative_recommendations(user_id, limit)
        
        # Combine and rank recommendations
        combined_recs = self._combine_recommendations(content_recs, collab_recs, limit)
        
        return combined_recs
    
    async def _get_content_based_recommendations(self, user: Dict, limit: int) -> List[Dict[str, Any]]:
        """Get content-based recommendations"""
        db = get_db()
        spots_df = await self.build_spot_features()
        
        if spots_df.empty:
            return []
        
        user_prefs = user["preferences"]
        preferred_categories = set(user_prefs.get("preferred_categories", []))
        preferred_regions = set(user_prefs.get("preferred_regions", []))
        budget_max = user_prefs.get("budget_range", {}).get("max", 100000)
        
        recommendations = []
        
        for _, spot in spots_df.iterrows():
            score = 0
            
            # Category matching
            spot_categories = set(spot["categories"].split(",")) if spot["categories"] else set()
            category_match = len(preferred_categories.intersection(spot_categories)) / max(len(preferred_categories), 1)
            score += category_match * 0.4
            
            # Region matching
            region_match = 1 if spot["region"] in preferred_regions else 0
            score += region_match * 0.2
            
            # Budget compatibility
            budget_score = 1 if spot["entry_fee"] <= budget_max else 0.5
            score += budget_score * 0.2
            
            # Rating and popularity
            rating_score = spot["rating"] / 5.0
            popularity_score = min(spot["popularity_score"] / 10.0, 1.0)
            score += (rating_score * 0.1) + (popularity_score * 0.1)
            
            recommendations.append({
                "spot_id": spot["spot_id"],
                "name": spot["name"],
                "score": score,
                "rating": spot["rating"],
                "categories": spot["categories"].split(",") if spot["categories"] else []
            })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:limit]
    
    async def _get_collaborative_recommendations(self, user_id: str, limit: int) -> List[Dict[str, Any]]:
        """Get collaborative filtering recommendations"""
        db = get_db()
        
        # Find similar users based on booking history
        user_bookings = []
        async for booking in db["bookings"].find({"user_id": user_id}):
            user_bookings.append(booking["tour_package_id"])
        
        if not user_bookings:
            return []
        
        # Find users with similar booking patterns
        similar_users = []
        async for user in db["users"].find({"_id": {"$ne": ObjectId(user_id)}}):
            other_user_bookings = []
            async for booking in db["bookings"].find({"user_id": str(user["_id"])}):
                other_user_bookings.append(booking["tour_package_id"])
            
            # Calculate Jaccard similarity
            if other_user_bookings:
                intersection = len(set(user_bookings).intersection(set(other_user_bookings)))
                union = len(set(user_bookings).union(set(other_user_bookings)))
                similarity = intersection / union if union > 0 else 0
                
                if similarity > 0.1:  # Threshold for similarity
                    similar_users.append({
                        "user_id": str(user["_id"]),
                        "similarity": similarity,
                        "bookings": other_user_bookings
                    })
        
        # Get recommendations from similar users
        recommendations = {}
        for similar_user in similar_users:
            for package_id in similar_user["bookings"]:
                if package_id not in user_bookings:
                    # Get spots from this package
                    package = await db["tour_packages"].find_one({"_id": ObjectId(package_id)})
                    if package:
                        for destination in package.get("destinations", []):
                            if destination not in recommendations:
                                recommendations[destination] = 0
                            recommendations[destination] += similar_user["similarity"]
        
        # Convert to list format
        collab_recs = []
        for spot_name, score in recommendations.items():
            spot = await db["tourist_spots"].find_one({"name": spot_name})
            if spot:
                collab_recs.append({
                    "spot_id": str(spot["_id"]),
                    "name": spot["name"],
                    "score": score,
                    "rating": spot.get("rating", 0),
                    "categories": spot.get("categories", [])
                })
        
        collab_recs.sort(key=lambda x: x["score"], reverse=True)
        return collab_recs[:limit]
    
    def _combine_recommendations(self, content_recs: List, collab_recs: List, limit: int) -> List[Dict[str, Any]]:
        """Combine content-based and collaborative recommendations"""
        combined = {}
        
        # Add content-based recommendations with weight
        for rec in content_recs:
            spot_id = rec["spot_id"]
            combined[spot_id] = {
                **rec,
                "final_score": rec["score"] * 0.7  # 70% weight for content-based
            }
        
        # Add collaborative recommendations with weight
        for rec in collab_recs:
            spot_id = rec["spot_id"]
            if spot_id in combined:
                # Combine scores
                combined[spot_id]["final_score"] += rec["score"] * 0.3  # 30% weight for collaborative
            else:
                combined[spot_id] = {
                    **rec,
                    "final_score": rec["score"] * 0.3
                }
        
        # Convert to list and sort
        final_recs = list(combined.values())
        final_recs.sort(key=lambda x: x["final_score"], reverse=True)
        
        return final_recs[:limit]
    
    async def _get_fallback_recommendations(self, limit: int) -> List[Dict[str, Any]]:
        """Get fallback recommendations for users without preferences"""
        db = get_db()
        
        recommendations = []
        async for spot in db["tourist_spots"].find().sort("rating", -1).limit(limit):
            recommendations.append({
                "spot_id": str(spot["_id"]),
                "name": spot["name"],
                "score": spot.get("rating", 0) / 5.0,
                "rating": spot.get("rating", 0),
                "categories": spot.get("categories", [])
            })
        
        return recommendations
    
    async def get_ai_package_recommendations(self, user_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get AI-powered package recommendations"""
        db = get_db()
        
        user = await db["users"].find_one({"_id": ObjectId(user_id)})
        if not user or not user.get("preferences"):
            return await self._get_fallback_package_recommendations(limit)
        
        user_prefs = user["preferences"]
        preferred_categories = set(user_prefs.get("preferred_categories", []))
        budget_range = user_prefs.get("budget_range", {})
        budget_min = budget_range.get("min", 0)
        budget_max = budget_range.get("max", 100000)
        group_size = user_prefs.get("group_size_preference", 2)
        
        recommendations = []
        
        async for package in db["tour_packages"].find({"status": "active"}):
            score = 0
            
            # Budget compatibility
            if budget_min <= package["price"] <= budget_max:
                score += 0.3
            elif package["price"] < budget_min:
                score += 0.1  # Too cheap might be suspicious
            else:
                score -= 0.2  # Too expensive
            
            # Group size compatibility
            if package["max_participants"] >= group_size:
                score += 0.2
            
            # Destination category matching
            destination_score = 0
            for destination in package.get("destinations", []):
                spot = await db["tourist_spots"].find_one({"name": destination})
                if spot:
                    spot_categories = set(spot.get("categories", []))
                    category_match = len(preferred_categories.intersection(spot_categories))
                    destination_score += category_match
            
            if package.get("destinations"):
                score += (destination_score / len(package["destinations"])) * 0.3
            
            # Availability score
            availability = (package["max_participants"] - package["current_participants"]) / package["max_participants"]
            score += availability * 0.1
            
            # Duration preference (assume moderate duration is preferred)
            duration_score = 1 - abs(package["duration_days"] - 7) / 14  # Optimal around 7 days
            score += max(0, duration_score) * 0.1
            
            recommendations.append({
                "package_id": str(package["_id"]),
                "name": package["name"],
                "price": package["price"],
                "duration_days": package["duration_days"],
                "destinations": package["destinations"],
                "score": max(0, score),  # Ensure non-negative score
                "availability": availability
            })
        
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:limit]
    
    async def _get_fallback_package_recommendations(self, limit: int) -> List[Dict[str, Any]]:
        """Get fallback package recommendations"""
        db = get_db()
        
        recommendations = []
        async for package in db["tour_packages"].find({"status": "active"}).sort("current_participants", -1).limit(limit):
            availability = (package["max_participants"] - package["current_participants"]) / package["max_participants"]
            recommendations.append({
                "package_id": str(package["_id"]),
                "name": package["name"],
                "price": package["price"],
                "duration_days": package["duration_days"],
                "destinations": package["destinations"],
                "score": availability,
                "availability": availability
            })
        
        return recommendations

# Global instance
ai_recommendation_engine = AIRecommendationEngine()
