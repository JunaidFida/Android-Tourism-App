import apiService from './apiService';
import { ApiResponse } from '../config/api';

// Ensure URLSearchParams is available
if (typeof URLSearchParams === 'undefined') {
  global.URLSearchParams = require('react-native-url-polyfill/auto').URLSearchParams;
}

export interface RecommendedSpot {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  category: string;
  rating: number;
  image_urls: string[];
  region: string;
  popularity_score?: number;
  distance?: number;
}

export interface RecommendedPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  rating: number;
  average_rating: number;
  total_ratings: number;
  image_urls: string[];
  category: string;
  difficulty_level: string;
  max_participants: number;
  current_participants: number;
  status: string;
}

class RecommendationService {
  // Get personalized tourist spot recommendations
  async getPersonalizedSpots(useAI: boolean = true, limit: number = 10): Promise<ApiResponse<RecommendedSpot[]>> {
    try {
      const response = await apiService.get<any>(`/recommendations/spots?use_ai=${useAI}&limit=${limit}`);

      if (response.success && response.data?.recommendations) {
        return {
          success: true,
          data: response.data.recommendations
        };
      }

      // If AI recommendations fail, fallback to popular spots
      if (!response.success && useAI) {
        console.log('AI recommendations failed, falling back to popular spots');
        return this.getPopularSpots(limit);
      }

      return response;
    } catch (error) {
      console.error('Error getting personalized spots:', error);
      // Fallback to popular spots
      return this.getPopularSpots(limit);
    }
  }

  // Get popular tourist spots as fallback
  async getPopularSpots(limit: number = 10): Promise<ApiResponse<RecommendedSpot[]>> {
    try {
      const queryParams = new URLSearchParams({
        limit: limit.toString(),
        sort: 'rating',
        order: 'desc'
      });

      const response = await apiService.get(`/tourist-spots/?${queryParams.toString()}`);

      if (response.success && response.data && Array.isArray(response.data)) {
        // Add popularity score based on rating and other factors
        const spotsWithScore = response.data.map((spot: any) => ({
          ...spot,
          popularity_score: this.calculatePopularityScore(spot)
        }));

        return {
          success: true,
          data: spotsWithScore.slice(0, limit)
        };
      }

      return {
        success: false,
        message: 'Failed to load popular spots'
      };
    } catch (error) {
      console.error('Error getting popular spots:', error);
      return {
        success: false,
        message: 'Failed to load popular spots'
      };
    }
  }

  // Get personalized package recommendations
  async getPersonalizedPackages(useAI: boolean = true, limit: number = 10): Promise<ApiResponse<RecommendedPackage[]>> {
    try {
      const response = await apiService.get<any>(`/recommendations/packages?use_ai=${useAI}&limit=${limit}`);

      if (response.success && response.data?.recommendations) {
        return {
          success: true,
          data: response.data.recommendations
        };
      }

      // If AI recommendations fail, fallback to featured packages
      if (!response.success && useAI) {
        console.log('AI package recommendations failed, falling back to featured packages');
        return this.getFeaturedPackages(limit);
      }

      return response;
    } catch (error) {
      console.error('Error getting personalized packages:', error);
      // Fallback to featured packages
      return this.getFeaturedPackages(limit);
    }
  }

  // Get featured packages as fallback
  async getFeaturedPackages(limit: number = 10): Promise<ApiResponse<RecommendedPackage[]>> {
    try {
      const queryParams = new URLSearchParams({
        limit: (limit * 2).toString(), // Get more to filter and sort
        status: 'active'
      });

      const response = await apiService.get(`/tour-packages/?${queryParams.toString()}`);

      if (response.success && response.data && Array.isArray(response.data)) {
        // Sort by rating and popularity to get featured packages
        const featuredPackages = response.data
          .filter((pkg: any) => pkg.status === 'active' || pkg.is_active)
          .sort((a: any, b: any) => {
            // Sort by average rating first, then by total ratings (popularity)
            const ratingA = a.average_rating || a.rating || 0;
            const ratingB = b.average_rating || b.rating || 0;

            if (ratingB !== ratingA) {
              return ratingB - ratingA;
            }

            const popularityA = (a.total_ratings || 0) + (a.current_participants || 0);
            const popularityB = (b.total_ratings || 0) + (b.current_participants || 0);

            return popularityB - popularityA;
          })
          .slice(0, limit);

        return {
          success: true,
          data: featuredPackages
        };
      }

      return {
        success: false,
        message: 'Failed to load featured packages'
      };
    } catch (error) {
      console.error('Error getting featured packages:', error);
      return {
        success: false,
        message: 'Failed to load featured packages'
      };
    }
  }

  // Get trending spots
  async getTrendingSpots(limit: number = 10): Promise<ApiResponse<RecommendedSpot[]>> {
    try {
      const response = await apiService.get<any>(`/recommendations/trending/spots?limit=${limit}`);

      if (response.success && response.data?.trending_spots) {
        return {
          success: true,
          data: response.data.trending_spots
        };
      }

      // If trending API fails, fallback to popular spots
      if (!response.success) {
        console.log('Trending spots API failed, falling back to popular spots');
        return this.getPopularSpots(limit);
      }

      return response;
    } catch (error) {
      console.error('Error getting trending spots:', error);
      return this.getPopularSpots(limit);
    }
  }

  // Get similar spots for a given spot
  async getSimilarSpots(spotId: string, limit: number = 5): Promise<ApiResponse<RecommendedSpot[]>> {
    try {
      const response = await apiService.get<any>(`/recommendations/spots/${spotId}/similar?limit=${limit}`);

      if (response.success && response.data?.similar_spots) {
        return {
          success: true,
          data: response.data.similar_spots
        };
      }

      // If similar spots API fails, get spots from same category
      if (!response.success) {
        console.log('Similar spots API failed, falling back to category-based recommendations');
        return this.getSpotsByCategory(spotId, limit);
      }

      return response;
    } catch (error) {
      console.error('Error getting similar spots:', error);
      return this.getSpotsByCategory(spotId, limit);
    }
  }

  // Fallback: Get spots from same category
  private async getSpotsByCategory(spotId: string, limit: number = 5): Promise<ApiResponse<RecommendedSpot[]>> {
    try {
      // First get the original spot to know its category
      const spotResponse = await apiService.get(`/tourist-spots/${spotId}`);

      if (!spotResponse.success || !spotResponse.data) {
        return {
          success: false,
          message: 'Could not find similar spots'
        };
      }

      const category = (spotResponse.data as any).category || '';

      // Get spots from same category
      const queryParams = new URLSearchParams({
        category,
        limit: (limit + 1).toString() // Get one extra to exclude the original
      });

      const categoryResponse = await apiService.get(`/tourist-spots/?${queryParams.toString()}`);

      if (categoryResponse.success && categoryResponse.data && Array.isArray(categoryResponse.data)) {
        // Filter out the original spot
        const similarSpots = categoryResponse.data
          .filter((spot: any) => spot.id !== spotId)
          .slice(0, limit);

        return {
          success: true,
          data: similarSpots
        };
      }

      return {
        success: false,
        message: 'Failed to load similar spots'
      };
    } catch (error) {
      console.error('Error getting spots by category:', error);
      return {
        success: false,
        message: 'Failed to load similar spots'
      };
    }
  }

  // Update user preferences for better recommendations
  async updateUserPreferences(preferences: {
    preferred_categories?: string[];
    budget_range?: { min: number; max: number };
    preferred_difficulty?: string;
    travel_style?: string;
  }): Promise<ApiResponse<any>> {
    try {
      return await apiService.post('/recommendations/update-preferences', preferences);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      return {
        success: false,
        message: 'Failed to update preferences'
      };
    }
  }

  // Calculate popularity score for spots
  private calculatePopularityScore(spot: any): number {
    const rating = spot.rating || 0;
    const totalRatings = spot.total_ratings || 0;
    const recentViews = spot.recent_views || 0;

    // Weighted score: rating (40%) + total ratings (30%) + recent views (30%)
    return (rating * 0.4) + (Math.min(totalRatings / 10, 5) * 0.3) + (Math.min(recentViews / 100, 5) * 0.3);
  }

  // Search recommendations based on query
  async searchRecommendations(query: string, type: 'spots' | 'packages' = 'spots', limit: number = 10): Promise<ApiResponse<any[]>> {
    try {
      const queryParams = new URLSearchParams({
        search: query,
        limit: limit.toString()
      });

      if (type === 'spots') {
        return await apiService.get(`/tourist-spots/?${queryParams.toString()}`);
      } else {
        return await apiService.get(`/tour-packages/?${queryParams.toString()}`);
      }
    } catch (error) {
      console.error('Error searching recommendations:', error);
      return {
        success: false,
        message: 'Search failed'
      };
    }
  }
}

export const recommendationService = new RecommendationService();
export default recommendationService;