// User types
export enum UserRole {
  TOURIST = 'tourist',
  TRAVEL_COMPANY = 'travel_company',
  ADMIN = 'admin',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  is_active: boolean;
  profile_picture?: string;
  preferences?: string[];
}

export interface UserCreate {
  email: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  password: string;
}

export interface UserUpdate {
  full_name?: string;
  phone_number?: string;
  profile_picture?: string;
  preferences?: string[];
}

// Tourist Spot types
export enum SpotCategory {
  HISTORICAL = 'historical',
  NATURAL = 'natural',
  RELIGIOUS = 'religious',
  CULTURAL = 'cultural',
  ADVENTURE = 'adventure',
}

export interface TouristSpot {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  location: string | {
    latitude: number;
    longitude: number;
    address: string;
  };
  region: string;
  categories?: SpotCategory[] | string[]; // Made optional
  image_urls?: string[]; // Made optional
  rating: number;
  total_ratings: number;
}

export interface TouristSpotCreate {
  name: string;
  description: string;
  location: string;
  region: string;
  categories: SpotCategory[];
  image_urls?: string[];
}

export interface TouristSpotUpdate {
  name?: string;
  description?: string;
  location?: string;
  region?: string;
  categories?: SpotCategory[];
  image_urls?: string[];
}

// Tour Package types
export enum PackageStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  description: string;
}

export interface TourPackage {
  id: string;
  title: string; // Changed from 'name' to 'title'
  description: string;
  location: Location; // Changed from string to Location object
  price: number;
  duration_days: number;
  group_size: number; // Changed from max_participants
  category: string;
  difficulty_level: string;
  included_spots?: string[];
  includes?: string[];
  excludes?: string[];
  itinerary?: ItineraryDay[];
  image_urls?: string[];
  rating: number;
  total_ratings: number;
  available_dates?: string[]; // ISO date strings
  is_active: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
  
  // Legacy fields for backward compatibility (can be removed later)
  name?: string; // Alias for title
  destinations?: string[]; // Can be derived from included_spots
  start_date?: string;
  end_date?: string;
  max_participants?: number; // Alias for group_size
  current_participants?: number;
  status?: PackageStatus;
  travel_company_id?: string; // Alias for created_by
  travel_company?: User;
}

export interface TourPackageCreate {
  title: string;
  description: string;
  location: Location;
  price: number;
  duration_days: number;
  group_size: number;
  category: string;
  difficulty_level: string;
  included_spots?: string[];
  includes?: string[];
  excludes?: string[];
  itinerary?: ItineraryDay[];
  image_urls?: string[];
  available_dates?: string[];
  created_by: string;
}

export interface TourPackageUpdate {
  title?: string;
  description?: string;
  location?: Location;
  price?: number;
  duration_days?: number;
  group_size?: number;
  category?: string;
  difficulty_level?: string;
  included_spots?: string[];
  includes?: string[];
  excludes?: string[];
  itinerary?: ItineraryDay[];
  image_urls?: string[];
  available_dates?: string[];
  is_active?: boolean;
}

// Booking types
export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export interface Booking {
  id: string;
  user_id: string;
  tour_package_id: string;
  booking_date: string;
  status: BookingStatus;
  total_amount: number;
  participants_count: number;
  notes?: string;
  user?: User;
  tour_package?: TourPackage;
}

export interface BookingCreate {
  user_id: string;
  tour_package_id: string;
  participants_count: number;
  notes?: string;
}

export interface BookingUpdate {
  status?: BookingStatus;
  participants_count?: number;
  notes?: string;
}

// Rating types
export interface Rating {
  id: string;
  tourist_id: string;
  tour_package_id: string;
  rating: number;
  review?: string;
  created_at?: string;
  user?: User;
  tour_package?: TourPackage;
}

export interface RatingCreate {
  tourist_id: string;
  tour_package_id: string;
  rating: number;
  review?: string;
}

export interface RatingUpdate {
  rating?: number;
  review?: string;
}

// Auth types
export interface LoginRequest {
  username: string; // email
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface SignupRequest {
  email: string;
  full_name: string;
  phone_number: string;
  role: UserRole;
  password: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Navigation types
export type RootStackParamList = {
  // Auth Stack
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;

  // Main App Stack
  MainTabs: undefined;
  TouristSpotDetail: { spotId: string };
  TourPackageDetail: { packageId: string };
  BookingDetail: { bookingId: string };
  Profile: undefined;
  EditProfile: undefined;
  SearchResults: { query: string; type?: 'spots' | 'packages' };
};

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Bookings: undefined;
  Profile: undefined;
};

// Filter and Search types
export interface TouristSpotFilters {
  search?: string;
  region?: string;
  categories?: SpotCategory[];
  skip?: number;
  limit?: number;
}

export interface TourPackageFilters {
  search?: string;
  min_price?: number;
  max_price?: number;
  duration?: number;
  status?: PackageStatus;
  skip?: number;
  limit?: number;
}

// Error types
export interface ApiError {
  message: string;
  status?: number;
  errors?: Record<string, string[]>;
}

// State types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface AppState {
  theme: 'light' | 'dark';
  isOnline: boolean;
  isLoading: boolean;
}

export interface TouristSpotsState {
  spots: TouristSpot[];
  selectedSpot: TouristSpot | null;
  filters: TouristSpotFilters;
  isLoading: boolean;
  error: string | null;
}

export interface TourPackagesState {
  packages: TourPackage[];
  selectedPackage: TourPackage | null;
  filters: TourPackageFilters;
  isLoading: boolean;
  error: string | null;
}

export interface BookingsState {
  bookings: Booking[];
  selectedBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
}
