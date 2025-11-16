import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginResponse } from '../../types';
import { apiService } from '../../services/apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  token: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  token: null,
};

// Async thunks
export const loginUser = createAsyncThunk<
  LoginResponse,
  { email: string; password: string }
>(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await apiService.loginWithForm(email, password);
      
      if (response.success) {
        const data = response.data as LoginResponse;
        return data as LoginResponse;
      } else {
        return rejectWithValue(response.message || 'Login failed');
      }
    } catch (error: any) {
      // Handle specific backend error messages
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      
      if (errorMessage === 'Account is inactive') {
        return rejectWithValue('Your account is pending admin approval. Please wait for approval before logging in.');
      }
      
      return rejectWithValue(errorMessage);
    }
  }
);

export const registerUser = createAsyncThunk<
  User,
  {
    username: string;
    email: string;
    password: string;
    fullName: string;
  }
>(
  'auth/register',
  async (userData, { rejectWithValue }) => {
    try {
      const response = await apiService.register({
        email: userData.email,
        full_name: userData.fullName,
        phone_number: userData.username, // Assuming username is phone
        role: 'tourist',
        password: userData.password,
      });
      
      if (response.success) {
        return response.data as User;
      } else {
        return rejectWithValue(response.message || 'Registration failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Registration failed');
    }
  }
);

export const logoutUser = createAsyncThunk<void, void>('auth/logout', async () => {
  // Clear stored token (handled by auth reducer)
});

export const refreshToken = createAsyncThunk<
  LoginResponse,
  void
>(
  'auth/refreshToken',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/auth/refresh', {});
      
      if (response.success) {
        return response.data as LoginResponse;
      } else {
        return rejectWithValue(response.message || 'Token refresh failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
    clearUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.token = null;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
        // Update AsyncStorage with new user data
        try {
          AsyncStorage.setItem('user_data', JSON.stringify(state.user));
        } catch (storageError) {
          console.error('Error updating user data:', storageError);
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.isAuthenticated = true;
        state.error = null;
        
        // Store token and user data in AsyncStorage (both keys for compatibility)
        try {
          AsyncStorage.setItem('access_token', action.payload.access_token);
          AsyncStorage.setItem('authToken', action.payload.access_token);
          AsyncStorage.setItem('user_data', JSON.stringify(action.payload.user));
        } catch (storageError) {
          console.error('Error storing auth data:', storageError);
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        // Note: register doesn't return token, user needs to login after registration
        state.isAuthenticated = false;
        state.error = null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        state.error = null;
        
        // Clear AsyncStorage
        AsyncStorage.removeItem('access_token');
        AsyncStorage.removeItem('authToken');
        AsyncStorage.removeItem('user_data');
      })
      // Refresh token
      .addCase(refreshToken.fulfilled, (state, action) => {
        state.token = action.payload.access_token;
        state.user = action.payload.user;
        
        // Update AsyncStorage with new token
        AsyncStorage.setItem('access_token', action.payload.access_token);
        AsyncStorage.setItem('authToken', action.payload.access_token);
        AsyncStorage.setItem('user_data', JSON.stringify(action.payload.user));
      });
  },
});

export const { clearError, setUser, clearUser, updateUser } = authSlice.actions;
export default authSlice.reducer;
