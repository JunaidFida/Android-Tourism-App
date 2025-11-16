import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/home/HomeScreen';
import PackageDetailsScreen from '../screens/packages/PackageDetailsScreen';
import CreateBookingScreen from '../screens/bookings/CreateBookingScreen';
import MapScreen from '../screens/MapScreen';
import SpotDetailsScreen from '../screens/spots/SpotDetailsScreen';

export type TouristStackParamList = {
  TouristHome: undefined;
  PackageDetails: { packageId: string };
  CreateBooking: {
    packageId: string;
    packageName: string;
    packagePrice: number;
    maxParticipants: number;
    availableDates?: string[];
  };
  Maps: undefined;
  SpotDetails: { spotId: string };
};

const Stack = createNativeStackNavigator<TouristStackParamList>();

const TouristNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="TouristHome" component={HomeScreen} />
      <Stack.Screen name="PackageDetails" component={PackageDetailsScreen} />
      <Stack.Screen name="CreateBooking" component={CreateBookingScreen} />
      <Stack.Screen name="Maps" component={MapScreen} />
      <Stack.Screen name="SpotDetails" component={SpotDetailsScreen} />
    </Stack.Navigator>
  );
};

export default TouristNavigator;