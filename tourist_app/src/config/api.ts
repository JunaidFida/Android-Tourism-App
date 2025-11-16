import { Platform } from 'react-native';
import { API_BASE_URL } from './constants';

// API Configuration
export const API_CONFIG = {
  // Use centralized base URL
  BASE_URL: API_BASE_URL,
  
  // API endpoints
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/auth/login',
      REGISTER: '/auth/signup',
      REFRESH: '/auth/refresh',
      ME: '/auth/me',
    },
    USERS: {
      PROFILE: '/users/profile',
      UPDATE_PROFILE: '/users/profile',
    },
    TOUR_PACKAGES: {
      LIST: '/tour-packages/',
      DETAILS: (id: string) => `/tour-packages/${id}`,
      SEARCH: '/tour-packages/search',
      CREATE: '/tour-packages/',
      UPDATE: (id: string) => `/tour-packages/${id}`,
      DELETE: (id: string) => `/tour-packages/${id}`,
    },
    TOURIST_SPOTS: {
      LIST: '/tourist-spots/',
      DETAILS: (id: string) => `/tourist-spots/${id}`,
      SEARCH: '/tourist-spots/search',
    },
    BOOKINGS: {
      LIST: '/bookings/',
      CREATE: '/bookings/',
      DETAILS: (id: string) => `/bookings/${id}`,
      USER_BOOKINGS: '/bookings/user',
      COMPANY_BOOKINGS: '/bookings/company',
    },
    RATINGS: {
      LIST: '/ratings/',
      CREATE: '/ratings/',
      PACKAGE_RATINGS: (packageId: string) => `/ratings/package/${packageId}`,
    },
    MAPS: {
      DISTANCE: '/maps/distance',
      NEARBY: '/maps/nearby',
      ROUTE: '/maps/route',
      SPOTS_ALONG_ROUTE: '/maps/spots-along-route',
    },
    RECOMMENDATIONS: {
      SPOTS: '/recommendations/spots/personalized',
      PACKAGES: '/recommendations/packages/personalized',
      SIMILAR_SPOTS: (id: string) => `/recommendations/spots/similar/${id}`,
      TRENDING: '/recommendations/spots/trending',
      UPDATE_PREFERENCES: '/recommendations/preferences',
    },
  },
};

// Export the base URL from centralized config
export const BASE_URL = API_BASE_URL;

// Utility function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  if (!BASE_URL || typeof BASE_URL !== 'string') {
    console.error('BASE_URL is not properly defined:', BASE_URL);
    return `http://localhost:8000${endpoint}`;
  }
  if (!endpoint || typeof endpoint !== 'string') {
    console.error('Endpoint is not properly defined:', endpoint);
    return BASE_URL;
  }
  return `${BASE_URL}${endpoint}`;
};

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: Record<string, string[]>;
}

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

// Request timeout in milliseconds
export const REQUEST_TIMEOUT = 10000; // 10 seconds

// Debug logging
export const logApiCall = (method: string, url: string, data?: any) => {
  if (__DEV__) {
    console.log(`🌐 API ${method.toUpperCase()}: ${url}`);
    if (data) {
      console.log('📤 Request data:', data);
    }
  }
};

export const logApiResponse = (url: string, response: any, status: number) => {
  if (__DEV__) {
    const statusEmoji = status < 400 ? '✅' : '❌';
    console.log(`${statusEmoji} API Response: ${url} (${status})`);
    console.log('📥 Response data:', response);
  }
};

// Common headers
export const getCommonHeaders = (token?: string): HeadersInit => {
  try {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token && typeof token === 'string') {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  } catch (error) {
    console.error('Error creating headers:', error);
    return {
      'Content-Type': 'application/json',
    };
  }
};

// Form data headers (for OAuth2 login)
export const getFormHeaders = (): HeadersInit => {
  return {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
};
