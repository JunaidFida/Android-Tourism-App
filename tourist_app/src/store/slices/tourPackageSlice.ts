import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { TourPackage } from '../../types';
import { apiService } from '../../services/apiService';

export interface TourPackageState {
  packages: TourPackage[];
  selectedPackage: TourPackage | null;
  loading: boolean;
  error: string | null;
  filters: {
    minPrice?: number;
    maxPrice?: number;
    duration?: number;
    category?: string;
  };
}

const initialState: TourPackageState = {
  packages: [],
  selectedPackage: null,
  loading: false,
  error: null,
  filters: {},
};

// Async thunks
export const fetchTourPackages = createAsyncThunk<
  TourPackage[],
  { minPrice?: number; maxPrice?: number; duration?: number; category?: string }
>(
  'tourPackages/fetchAll',
  async (filters, { rejectWithValue }) => {
    try {
      const filtersToUse = filters ?? {};
      const queryParams = new URLSearchParams();
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
      
      const queryString = queryParams.toString();
      const endpoint = `/tour-packages/${queryString ? '?' + queryString : ''}`;
      const response = await apiService.get(endpoint);
      
      if (response.success) {
        return response.data as TourPackage[];
      } else {
        return rejectWithValue(response.message || 'Failed to fetch tour packages');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tour packages');
    }
  }
);

export const fetchTourPackageById = createAsyncThunk<TourPackage, string>(
  'tourPackages/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/tour-packages/${id}`);
      
      if (response.success) {
        return response.data as TourPackage;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch tour package');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch tour package');
    }
  }
);

export const searchTourPackages = createAsyncThunk<TourPackage[], string>(
  'tourPackages/search',
  async (query, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/tour-packages/search?q=${encodeURIComponent(query)}`);
      
      if (response.success) {
        return response.data as TourPackage[];
      } else {
        return rejectWithValue(response.message || 'Failed to search tour packages');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to search tour packages');
    }
  }
);

const tourPackageSlice = createSlice({
  name: 'tourPackages',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedPackage: (state, action: PayloadAction<TourPackage | null>) => {
      state.selectedPackage = action.payload;
    },
    setFilters: (state, action: PayloadAction<{ minPrice?: number; maxPrice?: number; duration?: number; category?: string }>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all packages
      .addCase(fetchTourPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTourPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
        state.error = null;
      })
      .addCase(fetchTourPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Fetch package by ID
      .addCase(fetchTourPackageById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTourPackageById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPackage = action.payload;
        state.error = null;
      })
      .addCase(fetchTourPackageById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Search packages
      .addCase(searchTourPackages.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(searchTourPackages.fulfilled, (state, action) => {
        state.loading = false;
        state.packages = action.payload;
        state.error = null;
      })
      .addCase(searchTourPackages.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setSelectedPackage, setFilters, clearFilters } = tourPackageSlice.actions;
export default tourPackageSlice.reducer;
