import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export const checkAuthToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    if (!token) {
      console.log('No authentication token found');
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error checking auth token:', error);
    return null;
  }
};

export const clearAuthData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(['access_token', 'authToken', 'user_data']);
    console.log('Authentication data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};

export const handleAuthError = async (message?: string): Promise<void> => {
  await clearAuthData();
  Alert.alert(
    'Authentication Error',
    message || 'Your session has expired. Please log in again.',
    [{ text: 'OK' }]
  );
};

export const isTokenExpired = (token: string): boolean => {
  try {
    // Basic JWT token expiry check
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // Assume expired if we can't parse
  }
};

export const debugAuthState = async (): Promise<void> => {
  try {
    const token = await AsyncStorage.getItem('access_token');
    const userData = await AsyncStorage.getItem('user_data');
    
    console.log('🔍 Auth Debug Info:');
    console.log('  Token exists:', !!token);
    console.log('  Token length:', token?.length || 0);
    console.log('  User data exists:', !!userData);
    
    if (token) {
      console.log('  Token expired:', isTokenExpired(token));
      console.log('  Token preview:', token.substring(0, 20) + '...');
    }
    
    if (userData) {
      try {
        const user = JSON.parse(userData);
        console.log('  User role:', user.role);
        console.log('  User ID:', user.id);
      } catch (e) {
        console.log('  User data parse error:', e);
      }
    }
  } catch (error) {
    console.error('Debug auth state error:', error);
  }
};