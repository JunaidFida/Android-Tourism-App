import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import tourPackageReducer from './slices/tourPackageSlice';
import touristSpotReducer from './slices/touristSpotSlice';
import bookingReducer from './slices/bookingSlice';
import ratingReducer from './slices/ratingSlice';
import userReducer from './slices/userSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    tourPackages: tourPackageReducer,
    touristSpots: touristSpotReducer,
    bookings: bookingReducer,
    ratings: ratingReducer,
    user: userReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredPaths: ['_persist'],
      },
    }),
  devTools: __DEV__,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
