import api from './api';
import { Booking } from '@/types';

export const BookingService = {
  async getUserBookings(userId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/bookings/user/${userId}`);
    return response;
  },

  async getById(id: string): Promise<Booking> {
    const response = await api.get<Booking>(`/bookings/${id}`);
    return response;
  },

  async create(bookingData: {
    tourPackageId?: string;
    touristSpotId?: string;
    bookingDate: string;
    numberOfGuests: number;
    totalAmount: number;
  }): Promise<Booking> {
    const response = await api.post<Booking>('/bookings', bookingData);
    return response;
  },

  async cancel(bookingId: string): Promise<Booking> {
    const response = await api.put<Booking>(`/bookings/${bookingId}/cancel`);
    return response;
  },

  async confirm(bookingId: string): Promise<Booking> {
    const response = await api.put<Booking>(`/bookings/${bookingId}/confirm`);
    return response;
  },

  async getBookingHistory(userId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/bookings/user/${userId}/history`);
    return response;
  },

  async updateBooking(bookingId: string, updateData: {
    bookingDate?: string;
    numberOfGuests?: number;
    totalAmount?: number;
  }): Promise<Booking> {
    const response = await api.put<Booking>(`/bookings/${bookingId}`, updateData);
    return response;
  },

  async getUpcomingBookings(userId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/bookings/user/${userId}/upcoming`);
    return response;
  },

  async getPastBookings(userId: string): Promise<Booking[]> {
    const response = await api.get<Booking[]>(`/bookings/user/${userId}/past`);
    return response;
  },

  async generateBookingReceipt(bookingId: string): Promise<any> {
    const response = await api.get(`/bookings/${bookingId}/receipt`);
    return response;
  },
};
