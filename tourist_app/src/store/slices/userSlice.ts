import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, UserUpdate } from '../../types';
import { apiService } from '../../services/apiService';

export interface UserState {
  profile: User | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  profile: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserProfile = createAsyncThunk<User, string>(
  'user/fetchProfile',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/users/${userId}`);
      
      if (response.success) {
        return response.data as User;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch user profile');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user profile');
    }
  }
);

export const updateUserProfile = createAsyncThunk<
  User,
  { userId: string; userData: UserUpdate }
>(
  'user/updateProfile',
  async ({ userId, userData }, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/users/${userId}`, userData);
      
      if (response.success) {
        return response.data as User;
      } else {
        return rejectWithValue(response.message || 'Failed to update user profile');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to update user profile');
    }
  }
);

export const deactivateUser = createAsyncThunk<void, string>(
  'user/deactivate',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.post(`/users/${userId}/deactivate`, {});
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to deactivate user');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to deactivate user');
    }
  }
);

export const activateUser = createAsyncThunk<void, string>(
  'user/activate',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.post(`/users/${userId}/activate`, {});
      
      if (!response.success) {
        return rejectWithValue(response.message || 'Failed to activate user');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to activate user');
    }
  }
);

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setProfile: (state, action: PayloadAction<User>) => {
      state.profile = action.payload;
    },
    clearProfile: (state) => {
      state.profile = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user profile
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update user profile
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.profile = action.payload;
        state.error = null;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Deactivate user
      .addCase(deactivateUser.fulfilled, (state) => {
        if (state.profile) {
          state.profile.is_active = false;
        }
      })
      // Activate user
      .addCase(activateUser.fulfilled, (state) => {
        if (state.profile) {
          state.profile.is_active = true;
        }
      });
  },
});

export const { clearError, setProfile, clearProfile } = userSlice.actions;
export default userSlice.reducer;
