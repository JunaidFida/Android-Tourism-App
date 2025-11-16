import api from './api';
import { TourPackage } from '@/types';

export const TourPackageService = {
  async getAll(filters: { minPrice?: number; maxPrice?: number; duration?: number; category?: string } = {}): Promise<TourPackage[]> {
    const params = new URLSearchParams();
    
    if (filters.minPrice) params.append('min_price', filters.minPrice.toString());
    if (filters.maxPrice) params.append('max_price', filters.maxPrice.toString());
    if (filters.duration) params.append('duration', filters.duration.toString());
    if (filters.category) params.append('category', filters.category);
    
    const response = await api.get(`/tour-packages?${params.toString()}`) as TourPackage[];
    return response;
  },

  async getById(id: string): Promise<TourPackage> {
    const response = await api.get(`/tour-packages/${id}`) as TourPackage;
    return response;
  },

  async search(query: string): Promise<TourPackage[]> {
    const response = await api.get(`/tour-packages/search?q=${encodeURIComponent(query)}`) as TourPackage[];
    return response;
  },

  async getFeatured(): Promise<TourPackage[]> {
    const response = await api.get('/tour-packages/featured') as TourPackage[];
    return response;
  },

  async getRecommended(userId?: string): Promise<TourPackage[]> {
    const url = userId ? `/tour-packages/recommended?user_id=${userId}` : '/tour-packages/recommended';
    const response = await api.get(url) as TourPackage[];
    return response;
  },

  async getPopular(): Promise<TourPackage[]> {
    const response = await api.get('/tour-packages/popular') as TourPackage[];
    return response;
  },

  async bookPackage(packageId: string, bookingData: {
    bookingDate: string;
    numberOfGuests: number;
    totalAmount: number;
  }): Promise<any> {
    const response = await api.post(`/tour-packages/${packageId}/book`, bookingData);
    return response;
  },

  async addToWishlist(packageId: string): Promise<void> {
    await api.post(`/tour-packages/${packageId}/wishlist`);
  },

  async removeFromWishlist(packageId: string): Promise<void> {
    await api.delete(`/tour-packages/${packageId}/wishlist`);
  },

  async getWishlist(): Promise<TourPackage[]> {
    const response = await api.get('/tour-packages/wishlist') as TourPackage[];
    return response;
  },

  async ratePackage(packageId: string, rating: number, review?: string): Promise<void> {
    await api.post(`/tour-packages/${packageId}/rating`, { rating, review });
  },

  async getPackageRatings(packageId: string): Promise<any[]> {
    const response = await api.get(`/tour-packages/${packageId}/ratings`) as any[];
    return response;
  },
};
