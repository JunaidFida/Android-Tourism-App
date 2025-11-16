import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

export interface LoginResponse {
  user: User;
  token: string;
}

// Backend login response returns access_token, token_type, and user
interface LoginApiResponse {
  access_token: string;
  token_type?: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string; // Required by backend
  role?: 'tourist' | 'travel_company' | 'admin'; // Defaults to tourist if not provided
}

export const AuthService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    // FastAPI OAuth2 expects application/x-www-form-urlencoded
    // Construct body manually for React Native reliability
    const body = `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;

    const response = await api.post<LoginApiResponse>('/auth/login', body, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Backend returns { access_token, token_type, user }
    if (response.access_token) {
      await AsyncStorage.setItem('authToken', response.access_token);
      await AsyncStorage.setItem('access_token', response.access_token); // Store both for compatibility
    }

    return {
      token: response.access_token,
      user: response.user,
    };
  },

  async register(userData: RegisterRequest): Promise<LoginResponse> {
    // Backend expects /auth/signup with required fields
    const response = await api.post<User>('/auth/signup', {
      email: userData.email,
      password: userData.password,
      full_name: userData.fullName,
      phone_number: userData.phoneNumber,
      role: userData.role ?? 'tourist',
    });

    // Backend returns user data directly for signup (no auto-login)
    return {
      token: '', // No token returned from signup
      user: response,
    };
  },

  async logout(): Promise<void> {
    // No backend logout route; perform client-side logout
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('access_token');
  },

  async refreshToken(): Promise<LoginResponse> {
    // No refresh endpoint on backend. Validate current token by calling /auth/me.
    const token = await AsyncStorage.getItem('authToken');
    if (!token) {
      throw new Error('No stored token to refresh');
    }
    const user = await api.get<User>('/auth/me');
    // Re-store the same token to keep flow consistent
    await AsyncStorage.setItem('authToken', token);
    return { token, user };
  },

  async getCurrentUser(): Promise<User> {
    const response = await api.get<User>('/auth/me');
    return response;
  },

  async updateProfile(_userData: Partial<User>): Promise<User> {
    // Not implemented on backend
    throw new Error('Profile update is not supported: backend endpoint /auth/profile is missing');
  },

  async changePassword(_oldPassword: string, _newPassword: string): Promise<void> {
    // Not implemented on backend
    throw new Error('Change password is not supported: backend endpoint /auth/change-password is missing');
  },

  async forgotPassword(_email: string): Promise<void> {
    // Not implemented on backend
    throw new Error('Forgot password is not supported: backend endpoint /auth/forgot-password is missing');
  },

  async resetPassword(_token: string, _newPassword: string): Promise<void> {
    // Not implemented on backend
    throw new Error('Reset password is not supported: backend endpoint /auth/reset-password is missing');
  },

  async getStoredToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('authToken');
    } catch (error) {
      console.error('Error getting stored token:', error);
      return null;
    }
  },
};
