import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BASE_URL,
  API_CONFIG,
  buildApiUrl,
  getCommonHeaders,
  logApiCall,
  logApiResponse,
  type ApiResponse,
} from '../config/api';

class ApiService {
  private baseUrl: string;

  constructor() {
    if (!BASE_URL || typeof BASE_URL !== 'string') {
      console.error('BASE_URL is not properly defined:', BASE_URL);
      this.baseUrl = 'http://localhost:8000'; // Fallback
    } else {
      this.baseUrl = BASE_URL;
    }
  }

  // Get stored auth token
  private async getAuthToken(): Promise<string | null> {
    try {
      if (!AsyncStorage) {
        console.warn('AsyncStorage not available');
        return null;
      }
      
      // Try both keys for compatibility
      let token = await AsyncStorage.getItem('access_token');
      if (!token) {
        token = await AsyncStorage.getItem('authToken');
      }
      
      console.log('🔑 Retrieved token:', token ? 'Token exists' : 'No token found');
      console.log('🔑 Token length:', token?.length || 0);
      
      return token;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Generic request method
  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint);
    const token = await this.getAuthToken();
    
    const config: RequestInit = {
      headers: getCommonHeaders(token || undefined),
      ...options,
    };

    // Debug headers
    console.log('🔑 Request headers:', config.headers);
    console.log('🔑 Has token:', !!token);
    console.log('🔑 Authorization header:', (config.headers as any)?.Authorization ? 'Present' : 'Missing');

    logApiCall(options.method || 'GET', url, options.body);

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      logApiResponse(url, data, response.status);

      if (response.ok) {
        return {
          success: true,
          data,
        };
      } else {
        // Handle 401 Unauthorized - clear stored tokens
        if (response.status === 401) {
          console.log('🔑 401 Unauthorized - clearing tokens');
          try {
            await AsyncStorage.removeItem('access_token');
            await AsyncStorage.removeItem('authToken');
          } catch (clearError) {
            console.error('Error clearing tokens:', clearError);
          }
          // Could dispatch logout action here if we have access to store
        }
        
        return {
          success: false,
          message: data.detail || data.message || 'Request failed',
          errors: data.errors,
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: 'Network error occurred',
      };
    }
  }

  // GET request
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  // POST request
  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // PUT request
  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Special method for OAuth2 form login
  async loginWithForm(email: string, password: string): Promise<ApiResponse<any>> {
    const url = buildApiUrl(API_CONFIG.ENDPOINTS.AUTH.LOGIN);
    const payload = { email, password };

    logApiCall('POST', url, { email });

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: getCommonHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      logApiResponse(url, data, response.status);

      if (response.ok) {
        return {
          success: true,
          data,
        };
      }

      return {
        success: false,
        message: data.detail || data.message || 'Login failed',
      };
    } catch (error) {
      console.error('Login request failed:', error);
      return {
        success: false,
        message: 'Network error occurred',
      };
    }
  }

  async getCompanyBookings(status?: string): Promise<ApiResponse<any>> {
    const queryString = status
      ? `?${new URLSearchParams({ status }).toString()}`
      : '';
    return this.get(`${API_CONFIG.ENDPOINTS.BOOKINGS.COMPANY_BOOKINGS}${queryString}`);
  }

  // Auth methods
  async register(userData: any): Promise<ApiResponse<any>> {
    return this.post(API_CONFIG.ENDPOINTS.AUTH.REGISTER, userData);
  }

  // User methods
  async getUserProfile(userId: string): Promise<ApiResponse<any>> {
    // Backend route: GET /users/{user_id}
    return this.get(`/users/${userId}`);
  }

  async updateUserProfile(userId: string, data: any): Promise<ApiResponse<any>> {
    // Backend route: PUT /users/{user_id}
    return this.put(`/users/${userId}`, data);
  }

  // Tour Package methods
  async getTourPackages(params?: Record<string, string>): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`${API_CONFIG.ENDPOINTS.TOUR_PACKAGES.LIST}${queryString}`);
  }

  async getTourPackageDetails(id: string): Promise<ApiResponse<any>> {
    return this.get(API_CONFIG.ENDPOINTS.TOUR_PACKAGES.DETAILS(id));
  }

  async createTourPackage(packageData: any): Promise<ApiResponse<any>> {
    return this.post('/tour-packages/', packageData);
  }

  async updateTourPackage(id: string, packageData: any): Promise<ApiResponse<any>> {
    return this.put(`/tour-packages/${id}`, packageData);
  }

  async deleteTourPackage(id: string): Promise<ApiResponse<any>> {
    return this.delete(`/tour-packages/${id}`);
  }

  async uploadImage(file: { uri: string; name?: string; type?: string }): Promise<ApiResponse<any>> {
    const token = await this.getAuthToken();
    const url = buildApiUrl('/images/upload');

    const formData = new FormData();
    formData.append('file', {
      uri: file.uri,
      name: file.name || `image_${Date.now()}.jpg`,
      type: file.type || 'image/jpeg',
    } as any);

    // Don't set Content-Type header - let React Native set it with boundary
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
      });

      // Parse response - try JSON first, fallback to text
      let data;
      try {
        const text = await response.text();
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            // If not JSON, use text as message
            data = { message: text };
          }
        } else {
          data = { message: 'Empty response from server' };
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        return {
          success: false,
          message: `Server error: ${response.status} ${response.statusText}`,
        };
      }

      logApiResponse(url, data, response.status);

      if (response.ok) {
        return {
          success: true,
          data,
        };
      }

      return {
        success: false,
        message: data.detail || data.message || `Image upload failed: ${response.status}`,
        errors: data.errors,
      };
    } catch (error: any) {
      console.error('Image upload failed:', error);
      return {
        success: false,
        message: error.message || 'Image upload failed. Please check your connection and try again.',
      };
    }
  }

  async searchTourPackages(query: string, filters?: Record<string, string>): Promise<ApiResponse<any>> {
    const params = { q: query, ...filters };
    const queryString = `?${new URLSearchParams(params).toString()}`;
    return this.get(`/tour-packages/search${queryString}`);
  }

  // Tourist Spots methods
  async getTouristSpots(params?: Record<string, string>): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`${API_CONFIG.ENDPOINTS.TOURIST_SPOTS.LIST}${queryString}`);
  }

  async getTouristSpotDetails(id: string): Promise<ApiResponse<any>> {
    return this.get(API_CONFIG.ENDPOINTS.TOURIST_SPOTS.DETAILS(id));
  }

  // Booking methods
  async getUserBookings(): Promise<ApiResponse<any>> {
    return this.get(API_CONFIG.ENDPOINTS.BOOKINGS.USER_BOOKINGS);
  }

  async createBooking(bookingData: any): Promise<ApiResponse<any>> {
    return this.post(API_CONFIG.ENDPOINTS.BOOKINGS.CREATE, bookingData);
  }

  async getBookingDetails(id: string): Promise<ApiResponse<any>> {
    return this.get(API_CONFIG.ENDPOINTS.BOOKINGS.DETAILS(id));
  }

  // Rating methods
  async createRating(ratingData: any): Promise<ApiResponse<any>> {
    return this.post(API_CONFIG.ENDPOINTS.RATINGS.CREATE, ratingData);
  }

  async getPackageRatings(packageId: string): Promise<ApiResponse<any>> {
    return this.get(API_CONFIG.ENDPOINTS.RATINGS.PACKAGE_RATINGS(packageId));
  }

  // Maps and Navigation methods
  async getNearbySpots(latitude: number, longitude: number, radius: number = 50): Promise<ApiResponse<any>> {
    return this.get(`/maps/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`);
  }

  async getRoute(startLat: number, startLng: number, endLat: number, endLng: number): Promise<ApiResponse<any>> {
    return this.get(`/maps/route?start_latitude=${startLat}&start_longitude=${startLng}&end_latitude=${endLat}&end_longitude=${endLng}`);
  }

  async calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): Promise<ApiResponse<any>> {
    return this.get(`/maps/distance?lat1=${lat1}&lng1=${lng1}&lat2=${lat2}&lng2=${lng2}`);
  }

  // Recommendations methods
  async getPersonalizedSpots(useAI: boolean = true, limit: number = 10): Promise<ApiResponse<any>> {
    return this.get(`/recommendations/spots?use_ai=${useAI}&limit=${limit}`);
  }

  async getPersonalizedPackages(useAI: boolean = true, limit: number = 10): Promise<ApiResponse<any>> {
    return this.get(`/recommendations/packages?use_ai=${useAI}&limit=${limit}`);
  }

  async getSimilarSpots(spotId: string, limit: number = 5): Promise<ApiResponse<any>> {
    return this.get(`/recommendations/spots/${spotId}/similar?limit=${limit}`);
  }

  async getTrendingSpots(limit: number = 10): Promise<ApiResponse<any>> {
    return this.get(`/recommendations/trending/spots?limit=${limit}`);
  }

  async updateUserPreferences(preferences: any): Promise<ApiResponse<any>> {
    return this.post('/recommendations/update-preferences', preferences);
  }

  // Analytics methods (for travel companies)
  async getCompanyOverview(): Promise<ApiResponse<any>> {
    return this.get('/analytics/company/overview');
  }

  async getBookingAnalytics(days: number = 30): Promise<ApiResponse<any>> {
    return this.get(`/analytics/company/bookings?days=${days}`);
  }

  async getRevenueAnalytics(days: number = 30): Promise<ApiResponse<any>> {
    return this.get(`/analytics/company/revenue?days=${days}`);
  }

  async getPackagePerformance(): Promise<ApiResponse<any>> {
    return this.get('/analytics/company/packages/performance');
  }

  async getPackageAnalytics(packageId: string): Promise<ApiResponse<any>> {
    return this.get(`/analytics/company/packages/${packageId}`);
  }

  async getPackageBookings(packageId: string): Promise<ApiResponse<any>> {
    return this.get(`/bookings/package/${packageId}`);
  }

  async updateBookingStatus(bookingId: string, status: string): Promise<ApiResponse<any>> {
    return this.put(`/bookings/${bookingId}/status`, { status });
  }

  // Image management methods
  async getSpotImages(spotId: string): Promise<ApiResponse<any>> {
    return this.get(`/images/spots/${spotId}`);
  }

  async downloadSpotImages(spotId: string, maxImages: number = 3): Promise<ApiResponse<any>> {
    return this.post(`/images/spots/${spotId}/download?max_images=${maxImages}`);
  }

  // Admin methods (for admin users)
  async getAllUsers(params?: Record<string, string>): Promise<ApiResponse<any>> {
    const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.get(`/admin/users${queryString}`);
  }

  async getUserDetails(userId: string): Promise<ApiResponse<any>> {
    return this.get(`/admin/users/${userId}`);
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<any>> {
    return this.put(`/admin/users/${userId}/status`, { is_active: isActive });
  }

  async getAdminDashboard(): Promise<ApiResponse<any>> {
    return this.get('/admin/dashboard');
  }

  // Utility method to change base URL (useful for testing)
  setBaseUrl(newBaseUrl: string): void {
    this.baseUrl = newBaseUrl;
    console.log(`🔧 Base URL changed to: ${newBaseUrl}`);
  }

  // Get current base URL
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
