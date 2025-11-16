import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Booking } from '../../types';
import { apiService } from '../../services/apiService';

export interface BookingState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  loading: boolean;
  error: string | null;
}

const initialState: BookingState = {
  bookings: [],
  selectedBooking: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchUserBookings = createAsyncThunk<Booking[], string>(
  'bookings/fetchUserBookings',
  async (userId, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/bookings/user/${userId}`);
      
      if (response.success) {
        return response.data as Booking[];
      } else {
        return rejectWithValue(response.message || 'Failed to fetch bookings');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch bookings');
    }
  }
);

export const createBooking = createAsyncThunk<
  Booking,
  {
    tourPackageId?: string;
    touristSpotId?: string;
    bookingDate: string;
    numberOfGuests: number;
    totalAmount: number;
  }
>(
  'bookings/create',
  async (bookingData, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/bookings/', {
        tour_package_id: bookingData.tourPackageId,
        tourist_spot_id: bookingData.touristSpotId,
        booking_date: bookingData.bookingDate,
        participants_count: bookingData.numberOfGuests,
        total_amount: bookingData.totalAmount,
      });
      
      if (response.success) {
        return response.data as Booking;
      } else {
        return rejectWithValue(response.message || 'Failed to create booking');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to create booking');
    }
  }
);

export const cancelBooking = createAsyncThunk<Booking, string>(
  'bookings/cancel',
  async (bookingId, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/bookings/${bookingId}/cancel`, {});
      
      if (response.success) {
        return response.data as Booking;
      } else {
        return rejectWithValue(response.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to cancel booking');
    }
  }
);

export const fetchBookingById = createAsyncThunk<Booking, string>(
  'bookings/fetchById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await apiService.get(`/bookings/${id}`);
      
      if (response.success) {
        return response.data as Booking;
      } else {
        return rejectWithValue(response.message || 'Failed to fetch booking');
      }
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.detail || 'Failed to fetch booking');
    }
  }
);

const bookingSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setSelectedBooking: (state, action: PayloadAction<Booking | null>) => {
      state.selectedBooking = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch user bookings
      .addCase(fetchUserBookings.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUserBookings.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings = action.payload;
        state.error = null;
      })
      .addCase(fetchUserBookings.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Create booking
      .addCase(createBooking.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createBooking.fulfilled, (state, action) => {
        state.loading = false;
        state.bookings.unshift(action.payload);
        state.error = null;
      })
      .addCase(createBooking.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Cancel booking
      .addCase(cancelBooking.fulfilled, (state, action) => {
        const index = state.bookings.findIndex(b => b.id === action.payload.id);
        if (index !== -1) {
          state.bookings[index] = action.payload;
        }
      })
      // Fetch booking by ID
      .addCase(fetchBookingById.fulfilled, (state, action) => {
        state.selectedBooking = action.payload;
      });
  },
});

export const { clearError, setSelectedBooking } = bookingSlice.actions;
export default bookingSlice.reducer;
