import { RootState } from './index';

// Auth selectors
export const selectAuth = (state: RootState) => state.auth;
export const selectIsAuthenticated = (state: RootState) => state.auth.isAuthenticated;
export const selectCurrentUser = (state: RootState) => state.auth.user;
export const selectUser = (state: RootState) => state.auth.user;
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectAuthLoading = (state: RootState) => state.auth.loading;
export const selectAuthError = (state: RootState) => state.auth.error;

// Tour packages selectors
export const selectTourPackages = (state: RootState) => state.tourPackages.packages;
export const selectSelectedTourPackage = (state: RootState) => state.tourPackages.selectedPackage;
export const selectTourPackagesLoading = (state: RootState) => state.tourPackages.loading;
export const selectTourPackagesError = (state: RootState) => state.tourPackages.error;
export const selectTourPackagesFilters = (state: RootState) => state.tourPackages.filters;

// Tourist spots selectors
export const selectTouristSpots = (state: RootState) => state.touristSpots.spots;
export const selectSelectedTouristSpot = (state: RootState) => state.touristSpots.selectedSpot;
export const selectTouristSpotsLoading = (state: RootState) => state.touristSpots.loading;
export const selectTouristSpotsError = (state: RootState) => state.touristSpots.error;
export const selectTouristSpotsFilters = (state: RootState) => state.touristSpots.filters;

// Bookings selectors
export const selectBookings = (state: RootState) => state.bookings.bookings;
export const selectSelectedBooking = (state: RootState) => state.bookings.selectedBooking;
export const selectBookingsLoading = (state: RootState) => state.bookings.loading;
export const selectBookingsError = (state: RootState) => state.bookings.error;

// User bookings filtered by status
export const selectActiveBookings = (state: RootState) => 
  state.bookings.bookings.filter(booking => 
    booking.status === 'confirmed' || booking.status === 'pending'
  );

export const selectCompletedBookings = (state: RootState) => 
  state.bookings.bookings.filter(booking => booking.status === 'completed');

export const selectCancelledBookings = (state: RootState) => 
  state.bookings.bookings.filter(booking => booking.status === 'cancelled');

// Ratings selectors
export const selectRatings = (state: RootState) => state.ratings.ratings;
export const selectUserRatings = (state: RootState) => state.ratings.userRatings;
export const selectPackageRatings = (state: RootState) => state.ratings.packageRatings;
export const selectRatingsLoading = (state: RootState) => state.ratings.loading;
export const selectRatingsError = (state: RootState) => state.ratings.error;

// Get ratings for specific package
export const selectRatingsForPackage = (packageId: string) => (state: RootState) =>
  state.ratings.packageRatings[packageId] || [];

// User profile selectors
export const selectUserProfile = (state: RootState) => state.user.profile;
export const selectUserLoading = (state: RootState) => state.user.loading;
export const selectUserError = (state: RootState) => state.user.error;

// Complex selectors
export const selectTourPackagesByPrice = (state: RootState) => {
  return [...state.tourPackages.packages].sort((a, b) => a.price - b.price);
};

export const selectTourPackagesByDuration = (state: RootState) => {
  return [...state.tourPackages.packages].sort((a, b) => a.duration_days - b.duration_days);
};

export const selectTouristSpotsByRating = (state: RootState) => {
  return [...state.touristSpots.spots].sort((a, b) => b.rating - a.rating);
};

// Check if user has rated a specific package
export const selectHasUserRatedPackage = (packageId: string) => (state: RootState) => {
  return state.ratings.userRatings.some(rating => rating.tour_package_id === packageId);
};

// Get booking for specific package
export const selectBookingForPackage = (packageId: string) => (state: RootState) => {
  return state.bookings.bookings.find(booking => booking.tour_package_id === packageId);
};
