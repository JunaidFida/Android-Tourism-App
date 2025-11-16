import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { Rating } from '../../types';
import { apiService } from '../../services/apiService';

export interface RatingState {
  ratings: Rating[];
  userRatings: Rating[];
  packageRatings: { [packageId: string]: Rating[] };
  loading: boolean;
  error: string | null;
}

const initialState: RatingState = {
  ratings: [],
  userRatings: [],
  packageRatings: {},
  loading: false,
  error: null,
};

export const createRating = createAsyncThunk<
  Rating,
  {
    tour_package_id: string;
    rating: number;
    review?: string;
  }
>(
  'ratings/create',
  async (ratingData, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/ratings/', ratingData);
      
      if (response.success) {
        return response.data as Rating;
      } else {
        return rejectWithValue(response.message || 'Failed to create rating');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create rating');
    }
  }
);

export const fetchPackageRatings = createAsyncThunk<
  { packageId: string; ratings: Rating[] },
  string
>(
  'ratings/fetchPackageRatings',
  async (packageId, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/ratings/package/${packageId}`);
      
      if (response.success) {
        return { packageId, ratings: response.data as Rating[] };
      } else {
        return rejectWithValue(response.message || 'Failed to fetch package ratings');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch package ratings');
    }
  }
);

export const fetchUserRatings = createAsyncThunk<Rating[], string>(
  'ratings/fetchUserRatings',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/ratings/user/${userId}`);
      
      if (response.success) {
        return response.data as Rating[];
      } else {
        return rejectWithValue(response.message || 'Failed to fetch user ratings');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch user ratings');
    }
  }
);

const ratingSlice = createSlice({
  name: 'ratings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearRatings: (state) => {
      state.ratings = [];
      state.userRatings = [];
      state.packageRatings = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Create rating
      .addCase(createRating.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRating.fulfilled, (state, action) => {
        state.loading = false;
        state.ratings.push(action.payload);
        state.userRatings.push(action.payload);
        
        // Add to package ratings if it's a tour package rating
        if (action.payload.tour_package_id) {
          const packageId = action.payload.tour_package_id;
          if (!state.packageRatings[packageId]) {
            state.packageRatings[packageId] = [];
          }
          state.packageRatings[packageId].push(action.payload);
        }
        
        state.error = null;
      })
      .addCase(createRating.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch package ratings
      .addCase(fetchPackageRatings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPackageRatings.fulfilled, (state, action) => {
        state.loading = false;
        const { packageId, ratings } = action.payload;
        state.packageRatings[packageId] = ratings;
        state.error = null;
      })
      .addCase(fetchPackageRatings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch user ratings
      .addCase(fetchUserRatings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserRatings.fulfilled, (state, action) => {
        state.loading = false;
        state.userRatings = action.payload;
        state.error = null;
      })
      .addCase(fetchUserRatings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearRatings } = ratingSlice.actions;
export default ratingSlice.reducer;
