import apiService from './apiService';
import { UserRole } from '../types';

export interface AdminDashboard {
  users: {
    total: number;
    active: number;
    tourists: number;
    companies: number;
    admins: number;
    new_this_week: number;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    completed: number;
    new_this_week: number;
  };
  packages: {
    total: number;
    active: number;
  };
  revenue: {
    total: number;
  };
}

export interface AdminUserItem {
  id: string;
  email: string;
  full_name: string;
  phone_number?: string;
  role: UserRole | 'tourist' | 'travel_company' | 'admin';
  is_active: boolean;
  created_at?: string;
  profile_picture?: string;
}

export const AdminService = {
  async getDashboard(): Promise<AdminDashboard> {
    const response = await apiService.get<AdminDashboard>('/admin/dashboard');
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get dashboard data');
  },

  async getUsers(params?: {
    skip?: number;
    limit?: number;
    role?: UserRole;
    is_active?: boolean;
    search?: string;
  }): Promise<{ users: AdminUserItem[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.skip !== undefined) query.append('skip', String(params.skip));
    if (params?.limit !== undefined) query.append('limit', String(params.limit));
    if (params?.role) query.append('role', String(params.role));
    if (params?.is_active !== undefined) query.append('is_active', String(params.is_active));
    if (params?.search) query.append('search', params.search);

    const qs = query.toString();
    const url = qs ? `/admin/users?${qs}` : '/admin/users';
    const response = await apiService.get<{ users: AdminUserItem[]; total: number }>(url);
    
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.message || 'Failed to get users');
  },

  async getUserDetails(userId: string): Promise<AdminUserItem & {
    statistics?: {
      total_bookings: number;
      total_ratings: number;
    };
    recent_bookings?: any[];
    preferences?: any;
  }> {
    const response = await apiService.get(`/admin/users/${userId}`);
    if (response.success && response.data) {
      return response.data as AdminUserItem & {
        statistics?: {
          total_bookings: number;
          total_ratings: number;
        };
        recent_bookings?: any[];
        preferences?: any;
      };
    }
    throw new Error(response.message || 'Failed to get user details');
  },

  async getSpecificUserActivity(userId: string, days: number = 30): Promise<{
    user_id: string;
    period_days: number;
    bookings_count: number;
    total_spent: number;
    ratings_given: number;
    recent_bookings: any[];
  }> {
    const response = await apiService.get(`/admin/users/${userId}/activity?days=${days}`);
    if (response.success && response.data) {
      return response.data as {
        user_id: string;
        period_days: number;
        bookings_count: number;
        total_spent: number;
        ratings_given: number;
        recent_bookings: any[];
      };
    }
    throw new Error(response.message || 'Failed to get user activity');
  },

  async updateUserStatus(userId: string, is_active: boolean): Promise<{ message: string }> {
    const response = await apiService.put(`/admin/users/${userId}/status`, { is_active });
    if (response.success) {
      return { message: 'User status updated successfully' };
    }
    throw new Error(response.message || 'Failed to update user status');
  },

  async updateUserRole(userId: string, role: UserRole): Promise<{ message: string }> {
    const response = await apiService.put(`/admin/users/${userId}/role`, { role });
    if (response.success) {
      return { message: 'User role updated successfully' };
    }
    throw new Error(response.message || 'Failed to update user role');
  },

  async deleteUser(userId: string, force: boolean = false): Promise<{ message: string }> {
    const response = await apiService.delete(`/admin/users/${userId}?force=${force}`);
    if (response.success) {
      return { message: 'User deleted successfully' };
    }
    throw new Error(response.message || 'Failed to delete user');
  },

  async getUserActivity(days: number = 30): Promise<{
    period_days: number;
    total_users: number;
    new_users: number;
    active_users: number;
    activity_by_role: {
      tourist: number;
      travel_company: number;
      admin: number;
    };
  }> {
    const response = await apiService.get(`/analytics/admin/user-activity?days=${days}`);
    if (response.success && response.data) {
      return response.data as {
        period_days: number;
        total_users: number;
        new_users: number;
        active_users: number;
        activity_by_role: {
          tourist: number;
          travel_company: number;
          admin: number;
        };
      };
    }
    throw new Error(response.message || 'Failed to get user activity');
  },

  async getPopularSpots(limit: number = 10): Promise<{
    total_spots: number;
    popular_spots: Array<{
      spot_id: string;
      name: string;
      region: string;
      visit_count: number;
      average_rating: number;
      rating_count: number;
      booking_count: number;
    }>;
  }> {
    const response = await apiService.get(`/analytics/admin/popular-spots?limit=${limit}`);
    if (response.success && response.data) {
      return response.data as {
        total_spots: number;
        popular_spots: Array<{
          spot_id: string;
          name: string;
          region: string;
          visit_count: number;
          average_rating: number;
          rating_count: number;
          booking_count: number;
        }>;
      };
    }
    throw new Error(response.message || 'Failed to get popular spots');
  },
};
