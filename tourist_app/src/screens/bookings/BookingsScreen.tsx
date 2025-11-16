import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/apiService';
import { RootState } from '../../store';
import { UserRole } from '../../types';

interface Booking {
  id: string;
  user_id: string;
  tour_package_id: string;
  booking_date: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  total_amount: number;
  participants_count: number;
  notes?: string;
  has_rated?: boolean;
  user?: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
  };
  tour_package?: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    destinations: string[];
    has_rated?: boolean;
  };
}

const normalizeBookings = (payload: any): Booking[] => {
  if (!payload) {
    return [];
  }

  let bookingsArray: any[] = [];

  if (Array.isArray(payload)) {
    bookingsArray = payload;
  } else if (Array.isArray(payload.bookings)) {
    bookingsArray = payload.bookings;
  } else if (Array.isArray(payload.data)) {
    bookingsArray = payload.data;
  } else if (Array.isArray(payload.results)) {
    bookingsArray = payload.results;
  } else {
    return [];
  }

  // Map _id to id and ensure all required fields exist
  return bookingsArray.map((booking: any) => {
    const normalized: Booking = {
      ...booking,
      id: booking.id || booking._id,
      user_id: booking.user_id || booking.tourist_id,
      participants_count: booking.participants_count || booking.number_of_people || 1,
      total_amount: booking.total_amount || booking.total_price || 0,
      has_rated: Boolean(
        booking.has_rated ||
        booking.rating_submitted ||
        booking.user_has_rated ||
        booking.hasRated
      ),
    };

    if (booking.tour_package) {
      normalized.tour_package = {
        ...booking.tour_package,
        has_rated: Boolean(
          booking.tour_package.has_rated ||
          booking.tour_package.user_has_rated ||
          booking.tour_package.hasRated
        ),
      };
    }

    return normalized;
  });
};

const BookingsScreen: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useSelector((state: RootState) => state.auth);
  const isTravelCompany = user?.role === UserRole.TRAVEL_COMPANY;
  const isTourist = user?.role === UserRole.TOURIST;
  const navigation = useNavigation<any>();

  const fetchBookings = async (isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }

    try {
      const response = isTravelCompany
        ? await apiService.getCompanyBookings()
        : await apiService.getUserBookings();

      if (response.success && response.data) {
        setBookings(normalizeBookings(response.data));
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch bookings');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Network error';
      Alert.alert('Error', message || 'Network error');
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBookings(true);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10b981';
      case 'pending':
        return '#f59e0b';
      case 'cancelled':
        return '#ef4444';
      case 'completed':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'checkcircle';
      case 'pending':
        return 'clockcircle';
      case 'cancelled':
        return 'closecircle';
      case 'completed':
        return 'star';
      default:
        return 'infocircle';
    }
  };

  const getBookingIdentifier = (booking: Booking | any): string | null => {
    const rawId =
      booking?.id ??
      booking?._id ??
      booking?.booking?.id ??
      booking?.booking?._id ??
      null;

    if (!rawId) {
      return null;
    }

    return String(rawId);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isTravelCompany ? 'Customer Bookings' : 'My Bookings'}
        </Text>
        <TouchableOpacity onPress={() => fetchBookings()}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <AntDesign name="calendar" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>
              {isTravelCompany ? 'No Customer Bookings' : 'No Bookings Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {isTravelCompany 
                ? 'No tourists have booked your packages yet. Create attractive packages to get bookings!' 
                : 'Start exploring and book your first tour package!'}
            </Text>
          </View>
        ) : (
          bookings
            .map((booking) => {
              const bookingId = getBookingIdentifier(booking);
              if (!bookingId) {
                return null;
              }
              return { booking, bookingId };
            })
            .filter((entry): entry is { booking: Booking; bookingId: string } => Boolean(entry))
            .map(({ booking, bookingId }) => (
            <TouchableOpacity
              key={bookingId}
              style={styles.bookingCard}
              onPress={() => {
                if (!bookingId) {
                  return;
                }
                navigation.navigate('BookingDetails', { booking: { ...booking, id: bookingId } });
              }}
            >
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <Text style={styles.bookingReference}>
                    #{bookingId.slice(-8).toUpperCase()}
                  </Text>
                  {isTravelCompany && booking.user && (
                    <Text style={styles.customerName}>
                      {booking.user.full_name}
                    </Text>
                  )}
                  {!isTravelCompany && booking.tour_package && (
                    <Text style={styles.packageName}>
                      {booking.tour_package.name}
                    </Text>
                  )}
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(booking.status || 'pending') },
                  ]}
                >
                  <AntDesign
                    name={getStatusIcon(booking.status || 'pending') as any}
                    size={12}
                    color="white"
                  />
                  <Text style={styles.statusText}>
                    {booking.status
                      ? `${booking.status.charAt(0).toUpperCase()}${booking.status.slice(1)}`
                      : 'Pending'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardContent}>
                {isTravelCompany ? (
                  // Travel Company View - Show customer details
                  <>
                    <View style={styles.infoRow}>
                      <AntDesign name="gift" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        Package: {booking.tour_package?.name || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <AntDesign name="phone" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        Contact: {booking.user?.phone_number || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <AntDesign name="user" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        {booking.participants_count} participants
                      </Text>
                    </View>
                  </>
                ) : (
                  // Tourist View - Show package details
                  <>
                    <View style={styles.infoRow}>
                      <AntDesign name="enviromento" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        Destinations: {booking.tour_package?.destinations?.join(', ') || 'N/A'}
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <AntDesign name="clockcircle" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        Duration: {booking.tour_package?.duration_days || 0} days
                      </Text>
                    </View>
                    <View style={styles.infoRow}>
                      <AntDesign name="user" size={16} color="#6b7280" />
                      <Text style={styles.infoText}>
                        {booking.participants_count} participants
                      </Text>
                    </View>
                  </>
                )}
                
                <View style={styles.infoRow}>
                  <AntDesign name="pay-circle-o1" size={16} color="#6b7280" />
                  <Text style={styles.infoText}>
                    ${Number.isFinite(booking.total_amount) ? booking.total_amount.toFixed(2) : '0.00'}
                  </Text>
                </View>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.bookingDate}>
                  Booked on: {new Date(booking.booking_date).toLocaleDateString()}
                </Text>
                <View style={styles.footerActions}>
                  {isTourist &&
                    booking.status === 'completed' &&
                    !booking.has_rated &&
                    !booking.tour_package?.has_rated && (
                      <TouchableOpacity
                        style={styles.rateButton}
                        onPress={() =>
                          navigation.navigate('PackageRating', {
                            bookingId,
                            tourPackageId:
                              booking.tour_package?.id ||
                              booking.tour_package_id ||
                              (booking as any)?.booking?.tour_package_id ||
                              (booking as any)?.tour_packageId,
                            packageName: booking.tour_package?.name,
                          })
                        }
                      >
                        <AntDesign name="staro" size={14} color="#F59E0B" />
                        <Text style={styles.rateButtonText}>Rate</Text>
                      </TouchableOpacity>
                    )}
                  <AntDesign name="right" size={16} color="#9ca3af" />
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 200,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  bookingReference: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  customerName: {
    fontSize: 14,
    color: '#3b82f6',
    marginTop: 2,
    fontWeight: '500',
  },
  packageName: {
    fontSize: 14,
    color: '#10b981',
    marginTop: 2,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  bookingDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rateButtonText: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default BookingsScreen;
