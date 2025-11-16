import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../config/api';

export interface TouristSpotData {
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  categories: string[];
  images: string[];
}

export interface TouristSpot extends TouristSpotData {
  id: string;
  company_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  rating: number;
  review_count: number;
}

class CompanySpotService {
  private async getAuthHeaders() {
    const token = await AsyncStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }

  async addTouristSpot(spotData: TouristSpotData): Promise<{ success: boolean; data?: TouristSpot; message?: string }> {
    try {
      // Images should already be uploaded URLs at this point
      const imageUrls: string[] = spotData.images || [];

      // Map mobile app fields to backend API fields
      // Extract region from address (typically format: "City, State, Country" or "City, Country")
      const addressParts = spotData.location.address ? spotData.location.address.split(',').map(part => part.trim()).filter(part => part) : [];
      let region = 'Unknown';
      if (addressParts.length > 0) {
        // Try to get city/region from address
        // If address has multiple parts, use the first significant part
        region = addressParts[0] || addressParts[addressParts.length - 1] || 'Unknown';
      }
      
      // Convert categories to lowercase and filter to valid backend enum values
      const validCategories = ['historical', 'natural', 'adventure', 'religious', 'cultural'];
      const categories = spotData.categories
        .map(cat => cat.toLowerCase())
        .filter(cat => validCategories.includes(cat));
      
      if (categories.length === 0) {
        return { success: false, message: 'Please select at least one valid category' };
      }
      
      const backendData = {
        name: spotData.name,
        description: spotData.description,
        location: {
          latitude: spotData.location.latitude,
          longitude: spotData.location.longitude,
          address: spotData.location.address || `${spotData.location.latitude}, ${spotData.location.longitude}`,
        },
        region: region,
        categories: categories,
        image_urls: imageUrls,
      };
      
      const response = await fetch(buildApiUrl('/tourist-spots/company/add'), {
        method: 'POST',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(backendData),
      });

      const data = await response.json();

      if (response.ok) {
        // Backend returns the spot directly, not wrapped in 'spot' field
        return { success: true, data: data };
      } else {
        return { success: false, message: data.detail || data.message || 'Failed to add tourist spot' };
      }
    } catch (error) {
      console.error('Error adding tourist spot:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  async getCompanySpots(): Promise<{ success: boolean; data?: TouristSpot[]; message?: string }> {
    try {
      const response = await fetch(buildApiUrl('/tourist-spots/company/my-spots'), {
        headers: await this.getAuthHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        // Backend returns array directly, ensure each spot has an 'id' field
        const spotsArray = Array.isArray(data) ? data : [];
        const normalizedSpots = spotsArray.map((spot: any) => {
          // Ensure id field is present (use _id if id is missing)
          if (!spot.id && spot._id) {
            spot.id = spot._id;
          }
          // Ensure required fields have defaults
          return {
            ...spot,
            id: spot.id || spot._id || '',
            status: spot.status || 'pending',
            rating: spot.rating || 0,
            review_count: spot.review_count || spot.total_ratings || 0,
            company_id: spot.company_id || '',
            created_at: spot.created_at || new Date().toISOString(),
            updated_at: spot.updated_at || new Date().toISOString(),
          };
        });
        return { success: true, data: normalizedSpots };
      } else {
        return { success: false, message: data.detail || data.message || 'Failed to fetch spots' };
      }
    } catch (error) {
      console.error('Error fetching company spots:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  async updateTouristSpot(spotId: string, spotData: Partial<TouristSpotData>): Promise<{ success: boolean; data?: TouristSpot; message?: string }> {
    try {
      const response = await fetch(buildApiUrl(`/tourist-spots/company/${spotId}`), {
        method: 'PUT',
        headers: await this.getAuthHeaders(),
        body: JSON.stringify(spotData),
      });

      const data = await response.json();

      if (response.ok) {
        // Backend returns the spot directly
        return { success: true, data: data };
      } else {
        return { success: false, message: data.detail || data.message || 'Failed to update tourist spot' };
      }
    } catch (error) {
      console.error('Error updating tourist spot:', error);
      return { success: false, message: 'Network error occurred' };
    }
  }

  async deleteTouristSpot(spotId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await fetch(buildApiUrl(`/tourist-spots/company/${spotId}`), {
        method: 'DELETE',
        headers: await this.getAuthHeaders(),
      });

      // Check status first
      if (response.ok) {
        // Try to parse JSON response
        try {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              // Success response
              return { success: true };
            } catch {
              // Not JSON but status is OK, assume success
              return { success: true };
            }
          } else {
            // Empty response but status is OK
            return { success: true };
          }
        } catch {
          // Error reading response but status is OK
          return { success: true };
        }
      } else {
        // Error response - try to parse error message
        try {
          const text = await response.text();
          if (text) {
            try {
              const data = JSON.parse(text);
              return { 
                success: false, 
                message: data?.detail || data?.message || `Failed to delete tourist spot: ${response.status}` 
              };
            } catch {
              // Not JSON - return status text
              return { 
                success: false, 
                message: `Server error: ${response.status} ${response.statusText || 'Unknown error'}` 
              };
            }
          } else {
            return { 
              success: false, 
              message: `Server error: ${response.status} ${response.statusText || 'Unknown error'}` 
            };
          }
        } catch (parseError) {
          console.error('Error parsing delete error response:', parseError);
          return { 
            success: false, 
            message: `Failed to delete tourist spot: ${response.status}` 
          };
        }
      }
    } catch (error: any) {
      console.error('Error deleting tourist spot:', error);
      return { 
        success: false, 
        message: error?.message || 'Network error occurred. Please check your connection.' 
      };
    }
  }

  async checkSpotExists(latitude: number, longitude: number, radius: number = 100): Promise<{ success: boolean; exists?: boolean; spot?: TouristSpot; message?: string }> {
    try {
      const response = await fetch(buildApiUrl(`/tourist-spots/check-location?latitude=${latitude}&longitude=${longitude}&radius=${radius}`), {
        headers: await this.getAuthHeaders(),
      });

      // Check if the response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received:', response.status, response.statusText);
        return { success: false, message: 'Server returned invalid response format' };
      }

      const data = await response.json();

      if (response.ok) {
        return { success: true, exists: data.exists, spot: data.spot };
      } else {
        return { success: false, message: data.message || 'Failed to check location' };
      }
    } catch (error: any) {
      console.error('Error checking spot location:', error);
      if (error.message?.includes('JSON Parse error') || error.message?.includes('Unexpected character')) {
        return { success: false, message: 'Server returned invalid response. Please check if the backend is running properly.' };
      }
      return { success: false, message: 'Network error occurred' };
    }
  }
}

export default new CompanySpotService();