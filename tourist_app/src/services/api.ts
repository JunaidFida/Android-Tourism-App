import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BASE_URL } from '../config/api';

// Create axios instance
interface TypedAxiosInstance extends AxiosInstance {
  get<T = any, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
  post<T = any, R = T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  put<T = any, R = T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>;
  delete<T = any, R = T>(url: string, config?: AxiosRequestConfig): Promise<R>;
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
}) as TypedAxiosInstance;

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token =
        (await AsyncStorage.getItem('access_token')) ??
        (await AsyncStorage.getItem('authToken')) ??
        null;

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    // Ensure we reject with an Error instance
    const err = error instanceof Error
      ? error
      : new Error(error?.message || 'Request setup failed');
    return Promise.reject(err);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, logout user
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('authToken');
      // You can dispatch a logout action here if needed
    }

    // Normalize to an Error instance and keep useful metadata
    const status = error.response?.status;
    const respData = error.response?.data;
    const message =
      (typeof respData === 'string' && respData) ||
      (respData && (respData.message || respData.detail)) ||
      error.message ||
      'Request failed';

    // Ensure the rejection reason is typed as an Error for linters and type checkers
    const normalizedError = new Error(message) as Error & {
      status?: number;
      data?: unknown;
      isAxiosError?: boolean;
    };
    normalizedError.status = status;
    normalizedError.data = respData;
    normalizedError.isAxiosError = !!error.isAxiosError;

    return Promise.reject(normalizedError);
  }
);

export default api;
