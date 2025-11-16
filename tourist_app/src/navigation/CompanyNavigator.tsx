import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CompanyDashboardScreen from '../screens/company/CompanyDashboardScreen';
import ManagePackagesScreen from '../screens/company/ManagePackagesScreen';
import AddPackageScreen from '../screens/company/AddPackageScreen_new';
import EditPackageScreen from '../screens/company/EditPackageScreen';
import CompanyBookingsScreen from '../screens/company/CompanyBookingsScreen';
import AddTouristSpotScreen from '../screens/company/AddTouristSpotScreen';
import ManageSpotsScreen from '../screens/company/ManageSpotsScreen';
import AnalyticsScreen from '../screens/analytics/AnalyticsScreen';
import PackageAnalyticsScreen from '../screens/analytics/PackageAnalyticsScreen';
import PackageBookingsScreen from '../screens/company/PackageBookingsScreen';
import LocationPickerScreen from '../screens/maps/LocationPickerScreen';
import SpotDetailsScreen from '../screens/spots/SpotDetailsScreen';

export type CompanyStackParamList = {
  CompanyDashboard: undefined;
  ManagePackages: undefined;
  AddPackage: undefined;
  EditPackage: { packageId: string };
  CompanyBookings: undefined;
  AddTouristSpot: undefined;
  ManageSpots: undefined;
  EditTouristSpot: { spotId: string };
  SpotDetails: { spotId: string };
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
};

const Stack = createNativeStackNavigator<CompanyStackParamList>();

const CompanyNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CompanyDashboard" component={CompanyDashboardScreen} />
      <Stack.Screen name="ManagePackages" component={ManagePackagesScreen} />
      <Stack.Screen name="AddPackage" component={AddPackageScreen} />
      <Stack.Screen name="EditPackage" component={EditPackageScreen} />
      <Stack.Screen name="CompanyBookings" component={CompanyBookingsScreen} />
      <Stack.Screen name="AddTouristSpot" component={AddTouristSpotScreen} />
      <Stack.Screen name="ManageSpots" component={ManageSpotsScreen} />
      <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="PackageAnalytics" component={PackageAnalyticsScreen} />
      <Stack.Screen name="PackageBookings" component={PackageBookingsScreen} />
      <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
    </Stack.Navigator>
  );
};

export default CompanyNavigator;