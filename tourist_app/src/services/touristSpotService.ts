import api from './api';
import { TouristSpot } from '@/types';

export const TouristSpotService = {
  async getAll(filters: { category?: string; location?: string; minRating?: number } = {}): Promise<TouristSpot[]> {
    const params = new URLSearchParams();
    
    if (filters.category) params.append('category', filters.category);
    if (filters.location) params.append('location', filters.location);
    if (filters.minRating) params.append('min_rating', filters.minRating.toString());
    
    const response = await api.get<TouristSpot[]>(`/tourist-spots?${params.toString()}`);
    return response;
  },

  async getById(id: string): Promise<TouristSpot> {
    const response = await api.get<TouristSpot>(`/tourist-spots/${id}`);
    return response;
  },

  async search(query: string): Promise<TouristSpot[]> {
    const response = await api.get<TouristSpot[]>(`/tourist-spots/search?q=${encodeURIComponent(query)}`);
    return response;
  },

  async getNearby(latitude: number, longitude: number, radius: number = 10): Promise<TouristSpot[]> {
    const response = await api.get<TouristSpot[]>(`/tourist-spots/nearby?lat=${latitude}&lon=${longitude}&radius=${radius}`);
    return response;
  },

  async getFeatured(): Promise<TouristSpot[]> {
    const response = await api.get<TouristSpot[]>('/tourist-spots/featured');
    return response;
  },

  async getRecommended(userId?: string): Promise<TouristSpot[]> {
    const url = userId ? `/tourist-spots/recommended?user_id=${userId}` : '/tourist-spots/recommended';
    const response = await api.get<TouristSpot[]>(url);
    return response;
  },

  async addToFavorites(spotId: string): Promise<void> {
    await api.post(`/tourist-spots/${spotId}/favorite`);
  },

  async removeFromFavorites(spotId: string): Promise<void> {
    await api.delete(`/tourist-spots/${spotId}/favorite`);
  },

  async getFavorites(): Promise<TouristSpot[]> {
    const response = await api.get<TouristSpot[]>('/tourist-spots/favorites');
    return response;
  },

  async rateSpot(spotId: string, rating: number, review?: string): Promise<void> {
    await api.post(`/tourist-spots/${spotId}/rating`, { rating, review });
  },

  async getSpotRatings(spotId: string): Promise<any[]> {
    const response = await api.get<any[]>(`/tourist-spots/${spotId}/ratings`);
    return response;
  },
};
