import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TouristSpot } from '../../types';
import { apiService } from '../../services/apiService';

export interface TouristSpotState {
  spots: TouristSpot[];
  selectedSpot: TouristSpot | null;
  loading: boolean;
  error: string | null;
  filters: {
    category?: string;
    location?: string;
    minRating?: number;
  };
}

const initialState: TouristSpotState = {
  spots: [],
  selectedSpot: null,
  loading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchTouristSpots = createAsyncThunk<
  TouristSpot[],
  { category?: string; location?: string; minRating?: number }
>(
  'touristSpots/fetchAll',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      
      const endpoint = `/tourist-spots/${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        return response.data as TouristSpot[];
      } else {
        return rejectWithValue(response.message || 'Failed to fetch tourist spots');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tourist spots');
    }
  }
);

export const fetchTouristSpotById = createAsyncThunk<TouristSpot, string>(
  'touristSpots/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/tourist-spots/${id}`);
      
      if (response.success) {
        return response.data as TouristSpot;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch tourist spot');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tourist spot');
    }
  }
);

export const searchTouristSpots = createAsyncThunk<TouristSpot[], string>(
  'touristSpots/search',
  async (query, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/tourist-spots/search?q=${encodeURIComponent(query)}`);
      
      if (response.success) {
        return response.data as TouristSpot[];
      } else {
        return rejectWithValue(response.message || 'Failed to search tourist spots');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to search tourist spots');
    }
  }
);

const touristSpotSlice = createSlice({
  name: 'touristSpots',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedSpot: (state, action: PayloadAction<TouristSpot | null>) => {
      state.selectedSpot = action.payload;
    },
    setFilters: (state, action: PayloadAction<{ category?: string; location?: string; minRating?: number }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all spots
      .addCase(fetchTouristSpots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTouristSpots.fulfilled, (state, action) => {
        state.loading = false;
        state.spots = action.payload;
        state.error = null;
      })
      .addCase(fetchTouristSpots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch spot by ID
      .addCase(fetchTouristSpotById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTouristSpotById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedSpot = action.payload;
        state.error = null;
      })
      .addCase(fetchTouristSpotById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Search spots
      .addCase(searchTouristSpots.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchTouristSpots.fulfilled, (state, action) => {
        state.loading = false;
        state.spots = action.payload;
        state.error = null;
      })
      .addCase(searchTouristSpots.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedSpot, setFilters, clearFilters } = touristSpotSlice.actions;
export default touristSpotSlice.reducer;
