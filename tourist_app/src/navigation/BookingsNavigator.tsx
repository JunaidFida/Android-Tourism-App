import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BookingsScreen from '../screens/bookings/BookingsScreen';
import BookingDetailsScreen from '../screens/bookings/BookingDetailsScreen';
import RatePackageScreen from '../screens/ratings/RatingScreen';

export type BookingsStackParamList = {
  BookingsHome: undefined;
  BookingDetails: {
    booking: any;
  };
  PackageRating: {
    tourPackageId: string;
    packageName?: string;
    bookingId: string;
  };
};

const Stack = createNativeStackNavigator<BookingsStackParamList>();

const BookingsNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="BookingsHome" component={BookingsScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
      <Stack.Screen name="PackageRating" component={RatePackageScreen} />
    </Stack.Navigator>
  );
};

export default BookingsNavigator;

