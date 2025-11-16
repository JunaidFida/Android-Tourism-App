# Redux Store Documentation

This document provides a comprehensive guide to using the Redux store in the Tourist App.

## Store Structure

The store is organized into the following slices:

### 1. Auth Slice (`auth`)
Manages user authentication state.

**State:**
- `user: User | null` - Current authenticated user
- `isAuthenticated: boolean` - Authentication status
- `loading: boolean` - Loading state for auth operations
- `error: string | null` - Error messages
- `token: string | null` - JWT access token

**Actions:**
- `loginUser({ email, password })` - User login
- `registerUser({ username, email, password, fullName })` - User registration
- `logoutUser()` - User logout
- `refreshToken()` - Refresh JWT token
- `clearError()` - Clear error state
- `setUser(user)` - Set current user
- `clearUser()` - Clear user data

### 2. Tour Packages Slice (`tourPackages`)
Manages tour package data and operations.

**State:**
- `packages: TourPackage[]` - List of tour packages
- `selectedPackage: TourPackage | null` - Currently selected package
- `loading: boolean` - Loading state
- `error: string | null` - Error messages
- `filters: object` - Active filters for packages

**Actions:**
- `fetchTourPackages(filters?)` - Fetch all packages with optional filters
- `fetchTourPackageById(id)` - Fetch specific package
- `searchTourPackages(query)` - Search packages
- `setSelectedPackage(package)` - Set selected package
- `setFilters(filters)` - Update filters
- `clearFilters()` - Clear all filters
- `clearError()` - Clear error state

### 3. Tourist Spots Slice (`touristSpots`)
Manages tourist spot data and operations.

**State:**
- `spots: TouristSpot[]` - List of tourist spots
- `selectedSpot: TouristSpot | null` - Currently selected spot
- `loading: boolean` - Loading state
- `error: string | null` - Error messages
- `filters: object` - Active filters for spots

**Actions:**
- `fetchTouristSpots(filters?)` - Fetch all spots with optional filters
- `fetchTouristSpotById(id)` - Fetch specific spot
- `searchTouristSpots(query)` - Search spots
- `setSelectedSpot(spot)` - Set selected spot
- `setFilters(filters)` - Update filters
- `clearFilters()` - Clear all filters
- `clearError()` - Clear error state

### 4. Bookings Slice (`bookings`)
Manages booking data and operations.

**State:**
- `bookings: Booking[]` - User's bookings
- `selectedBooking: Booking | null` - Currently selected booking
- `loading: boolean` - Loading state
- `error: string | null` - Error messages

**Actions:**
- `fetchUserBookings(userId)` - Fetch user's bookings
- `createBooking(bookingData)` - Create new booking
- `cancelBooking(bookingId)` - Cancel existing booking
- `fetchBookingById(id)` - Fetch specific booking
- `setSelectedBooking(booking)` - Set selected booking
- `clearError()` - Clear error state

### 5. Ratings Slice (`ratings`)
Manages rating and review data.

**State:**
- `ratings: Rating[]` - All ratings
- `userRatings: Rating[]` - Current user's ratings
- `packageRatings: { [packageId]: Rating[] }` - Ratings by package
- `loading: boolean` - Loading state
- `error: string | null` - Error messages

**Actions:**
- `createRating(ratingData)` - Create new rating
- `fetchPackageRatings(packageId)` - Fetch ratings for package
- `fetchUserRatings(userId)` - Fetch user's ratings
- `clearRatings()` - Clear all rating data
- `clearError()` - Clear error state

### 6. User Profile Slice (`user`)
Manages user profile data and operations.

**State:**
- `profile: User | null` - User profile data
- `loading: boolean` - Loading state
- `error: string | null` - Error messages

**Actions:**
- `fetchUserProfile(userId)` - Fetch user profile
- `updateUserProfile({ userId, userData })` - Update profile
- `deactivateUser(userId)` - Deactivate user account
- `activateUser(userId)` - Activate user account
- `setProfile(user)` - Set profile data
- `clearProfile()` - Clear profile data
- `clearError()` - Clear error state

## Usage Examples

### 1. Authentication Flow

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { loginUser, selectAuth } from '../store/slices/authSlice';

const LoginScreen = () => {
  const dispatch = useAppDispatch();
  const { loading, error, isAuthenticated } = useAppSelector(selectAuth);

  const handleLogin = async (email: string, password: string) => {
    const result = await dispatch(loginUser({ email, password }));
    if (loginUser.fulfilled.match(result)) {
      // Login successful
      console.log('User logged in:', result.payload.user);
    }
  };

  return (
    // Your login UI
  );
};
```

### 2. Fetching Tour Packages

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTourPackages, selectTourPackages } from '../store/slices/tourPackageSlice';

const PackagesScreen = () => {
  const dispatch = useAppDispatch();
  const packages = useAppSelector(selectTourPackages);

  useEffect(() => {
    // Fetch all packages
    dispatch(fetchTourPackages());
    
    // Or fetch with filters
    dispatch(fetchTourPackages({ 
      minPrice: 100, 
      maxPrice: 500, 
      category: 'adventure' 
    }));
  }, [dispatch]);

  return (
    // Your packages list UI
  );
};
```

### 3. Creating a Booking

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { createBooking, selectBookingsLoading } from '../store/slices/bookingSlice';

const BookingScreen = () => {
  const dispatch = useAppDispatch();
  const loading = useAppSelector(selectBookingsLoading);

  const handleBooking = async (packageId: string) => {
    const bookingData = {
      tourPackageId: packageId,
      bookingDate: new Date().toISOString(),
      numberOfGuests: 2,
      totalAmount: 500,
    };

    const result = await dispatch(createBooking(bookingData));
    if (createBooking.fulfilled.match(result)) {
      // Booking successful
      console.log('Booking created:', result.payload);
    }
  };

  return (
    // Your booking UI
  );
};
```

### 4. Using Selectors

```typescript
import { useAppSelector } from '../store/hooks';
import { 
  selectIsAuthenticated, 
  selectTourPackagesByPrice,
  selectActiveBookings,
  selectHasUserRatedPackage 
} from '../store/selectors';

const MyComponent = () => {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const sortedPackages = useAppSelector(selectTourPackagesByPrice);
  const activeBookings = useAppSelector(selectActiveBookings);
  const hasRated = useAppSelector(selectHasUserRatedPackage('package-id'));

  return (
    // Your component UI
  );
};
```

### 5. Error Handling

```typescript
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchTourPackages, clearError } from '../store/slices/tourPackageSlice';

const PackagesScreen = () => {
  const dispatch = useAppDispatch();
  const { packages, loading, error } = useAppSelector(state => state.tourPackages);

  useEffect(() => {
    if (error) {
      // Handle error (show toast, alert, etc.)
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  return (
    // Your UI with error handling
  );
};
```

## Best Practices

1. **Use Typed Hooks**: Always use `useAppDispatch` and `useAppSelector` instead of the plain Redux hooks.

2. **Handle Loading States**: Check loading states to show spinners or disable buttons.

3. **Handle Errors**: Always handle error states and clear them when appropriate.

4. **Use Selectors**: Use the provided selectors for complex data transformations.

5. **Clear Data When Needed**: Clear sensitive data on logout or when navigating away.

6. **Optimize Re-renders**: Use specific selectors instead of selecting entire slices when possible.

## Integration with Backend

All actions are configured to work with the centralized API service (`apiService`) which:

- Handles authentication headers automatically
- Manages base URLs for different environments
- Provides consistent error handling
- Includes request/response logging for debugging

## Persistence

The store is configured to work with Redux Persist if needed. The current configuration includes:

- Serialization checks for persist actions
- Ignored persist paths for performance

To enable persistence, uncomment the relevant configurations and wrap your app with `PersistGate`.

## Testing

When testing components that use the store:

1. Mock the store state for unit tests
2. Use `@reduxjs/toolkit/query/react` testing utilities
3. Test both success and error scenarios
4. Verify loading states are handled correctly
