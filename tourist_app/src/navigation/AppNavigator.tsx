import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AntDesign } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import PackagesScreen from '../screens/packages/PackagesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminNavigator from './AdminNavigator';
import AuthNavigator from './AuthNavigator';
import PackageDetailsScreen from '../screens/packages/PackageDetailsScreen';
import CompanyDashboardScreen from '../screens/company/CompanyDashboardScreen';
import ManagePackagesScreen from '../screens/company/ManagePackagesScreen';
import AddPackageScreen from '../screens/company/AddPackageScreen_new';
import EditPackageScreen from '../screens/company/EditPackageScreen';
import CompanyBookingsScreen from '../screens/company/CompanyBookingsScreen';
import BookingsNavigator from './BookingsNavigator';
import AddTouristSpotScreen from '../screens/company/AddTouristSpotScreen';
import ManageSpotsScreen from '../screens/company/ManageSpotsScreen';
import MapScreen from '../screens/MapScreen';
import CreateBookingScreen from '../screens/bookings/CreateBookingScreen';
import CompanyNavigator from './CompanyNavigator';
import TouristNavigator from './TouristNavigator';
import PackageAnalyticsScreen from '../screens/analytics/PackageAnalyticsScreen';
import PackageBookingsScreen from '../screens/company/PackageBookingsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LocationPickerScreen from '../screens/maps/LocationPickerScreen';
import SpotDetailsScreen from '../screens/spots/SpotDetailsScreen';

export type RootTabParamList = {
  Home: undefined;
  Explore: undefined;
  Packages: undefined;
  Profile: undefined;
  Bookings: undefined;
  Analytics: undefined;
  Users: undefined; // Admin users management
  Maps: undefined;
};

export type PackagesStackParamList = {
  PackagesHome: undefined;
  PackageDetails: { packageId: string };
};

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  CompanyDashboard: undefined;
  ManagePackages: undefined;
  AddPackage: undefined;
  EditPackage: { packageId: string };
  CompanyBookings: undefined;
  AddTouristSpot: undefined;
  ManageSpots: undefined;
  EditTouristSpot: { spotId: string };
  SpotDetails: { spotId: string };
  CreateBooking: {
    packageId: string;
    packageName: string;
    packagePrice: number;
    maxParticipants: number;
    availableDates?: string[];
  };
  Analytics: undefined;
  PackageAnalytics: { packageId: string };
  PackageBookings: { packageId: string; packageTitle: string };
  LocationPicker: {
    initialLocation?: {
      latitude: number;
      longitude: number;
      address?: string;
      name?: string;
    };
    onLocationSelected?: (location: {
      latitude: number;
      longitude: number;
      address?: string;
      name?: string;
    }) => void;
  };
  Maps: {
    spotId?: string;
    title?: string;
    destinationLatitude?: number;
    destinationLongitude?: number;
    destinationName?: string;
  };
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();
const PackagesStack = createNativeStackNavigator<PackagesStackParamList>();

function PackagesStackNavigator() {
  return (
    <PackagesStack.Navigator screenOptions={{ headerShown: false }}>
      <PackagesStack.Screen name="PackagesHome" component={PackagesScreen} />
      <PackagesStack.Screen name="PackageDetails" component={PackageDetailsScreen} />
    </PackagesStack.Navigator>
  );
}

function MainTabNavigator({ role }: { role: string | null }) {
  // Admin gets different tabs
  if (role === 'admin') {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof AntDesign.glyphMap;

            switch (route.name) {
              case 'Home':
                iconName = 'dashboard';
                break;
              case 'Analytics':
                iconName = 'barschart';
                break;
              case 'Profile':
                iconName = 'user';
                break;
              default:
                iconName = 'home';
            }

            return <AntDesign name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={AdminNavigator} />
        <Tab.Screen name="Analytics" component={AdminAnalyticsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    );
  }

  // Travel companies get optimized navigation (max 4 tabs)
  if (role === 'travel_company') {
    return (
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof AntDesign.glyphMap;

            switch (route.name) {
              case 'Home':
                iconName = 'home';
                break;
              case 'Packages':
                iconName = 'gift';
                break;
              case 'Analytics':
                iconName = 'barschart';
                break;
              case 'Profile':
                iconName = 'user';
                break;
              default:
                iconName = 'home';
            }

            return <AntDesign name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={CompanyNavigator} />
        <Tab.Screen name="Packages" component={PackagesStackNavigator} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    );
  }

  // Regular users get the full navigation
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof AntDesign.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = 'home';
              break;
            case 'Explore':
              iconName = 'search1';
              break;
            case 'Packages':
              iconName = 'gift';
              break;
            case 'Profile':
              iconName = 'user';
              break;
            case 'Bookings':
              iconName = 'calendar';
              break;
            case 'Maps':
              iconName = 'enviromento';
              break;
            default:
              iconName = 'home';
          }

          return <AntDesign name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={TouristNavigator} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Packages" component={PackagesStackNavigator} />
      <Tab.Screen name="Maps" component={MapScreen} />
      <Tab.Screen name="Bookings" component={BookingsNavigator} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const AppNavigator: React.FC = () => {
  const authState = useSelector((state: RootState) => state?.auth);
  const isAuthenticated = authState?.isAuthenticated || false;
  const user = authState?.user || null;
  const role = user?.role || null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Show auth screens if not authenticated
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          // Show main app if authenticated
          <>
            <Stack.Screen name="Main">
              {() => <MainTabNavigator role={role} />}
            </Stack.Screen>
            <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
            <Stack.Screen name="ManagePackages" component={ManagePackagesScreen} />
            <Stack.Screen name="AddPackage" component={AddPackageScreen} />
            <Stack.Screen name="EditPackage" component={EditPackageScreen} />
            <Stack.Screen name="CompanyBookings" component={CompanyBookingsScreen} />
            <Stack.Screen name="AddTouristSpot" component={AddTouristSpotScreen} />
            <Stack.Screen name="ManageSpots" component={ManageSpotsScreen} />
            <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
            <Stack.Screen name="Analytics" component={AnalyticsScreen} />
            <Stack.Screen name="PackageAnalytics" component={PackageAnalyticsScreen} />
            <Stack.Screen name="PackageBookings" component={PackageBookingsScreen} />
            <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
            <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
            <Stack.Screen name="Maps" component={MapScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
