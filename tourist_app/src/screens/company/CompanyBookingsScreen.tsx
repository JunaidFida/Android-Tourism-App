import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../../config/api';

interface BookingSummary {
  booking: {
    id: string;
    _id?: string;
    booking_reference?: string;
    number_of_people: number;
    total_price: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    booking_date: string;
    travel_date: string;
    special_requests?: string;
    contact_phone?: string;
    emergency_contact_name?: string;
    emergency_contact_number?: string;
  };
  user: {
    id: string;
    full_name: string;
    email: string;
    phone_number: string;
  } | null;
  tour_package: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_days: number;
    destinations: string[];
  } | null;
}

const CompanyBookingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const getBookingId = (booking: BookingSummary['booking']) => {
    if (!booking) {
      return '';
    }
    return booking.id || booking._id || '';
  };

  const loadBookings = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        Alert.alert('Error', 'Authentication token not found. Please log in again.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      console.log('Fetching company bookings...');
      const response = await fetch(buildApiUrl('/bookings/company'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Bookings data:', JSON.stringify(data, null, 2));
        setBookings(data);
      } else {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        Alert.alert('Error', `Failed to fetch bookings: ${response.status}`);
      }
    } catch (error) {
      console.error('Network error:', error);
      Alert.alert('Error', `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadBookings();
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      if (!bookingId) {
        Alert.alert('Error', 'Booking ID not found.');
        return;
      }

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/bookings/${bookingId}/status`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Booking status updated successfully');
        loadBookings(); // Refresh the list
      } else {
        Alert.alert('Error', 'Failed to update booking status');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'cancelled':
        return '#EF4444';
      case 'completed':
        return '#3B82F6';
      default:
        return '#6B7280';
    }
  };

  const getStatusActions = (status: string) => {
    switch (status) {
      case 'pending':
        return [
          { label: 'Confirm', action: 'confirmed', color: '#10B981' },
          { label: 'Cancel', action: 'cancelled', color: '#EF4444' },
        ];
      case 'confirmed':
        return [
          { label: 'Mark Complete', action: 'completed', color: '#3B82F6' },
          { label: 'Cancel', action: 'cancelled', color: '#EF4444' },
        ];
      default:
        return [];
    }
  };

  const filteredBookings = selectedStatus === 'all' 
    ? bookings 
    : bookings.filter(booking => booking.booking.status === selectedStatus);

  const renderBookingItem = ({ item }: { item: BookingSummary }) => {
    if (!item.user || !item.tour_package) {
      console.warn('Booking missing user or package data:', item);
      return null;
    }

    const bookingId = getBookingId(item.booking);
    if (!bookingId) {
      console.warn('Booking missing identifier:', item.booking);
      return null;
    }
    
    return (
    <View style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{item.user.full_name}</Text>
          <Text style={styles.customerEmail}>{item.user.email}</Text>
          <Text style={styles.customerPhone}>{item.user.phone_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.booking.status) }]}>
          <Text style={styles.statusText}>{item.booking.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.packageInfo}>
        <Text style={styles.packageName}>{item.tour_package.name}</Text>
        <Text style={styles.packageDetails}>
          {item.tour_package.duration_days} days • Rs. {item.tour_package.price} per person
        </Text>
      </View>

      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Participants:</Text>
          <Text style={styles.detailValue}>{item.booking.number_of_people}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total Amount:</Text>
          <Text style={styles.detailValue}>Rs. {item.booking.total_price}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Travel Date:</Text>
          <Text style={styles.detailValue}>
            {item.booking.travel_date ? new Date(item.booking.travel_date).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Booking Date:</Text>
          <Text style={styles.detailValue}>
            {item.booking.booking_date ? new Date(item.booking.booking_date).toLocaleDateString() : 'N/A'}
          </Text>
        </View>
      </View>

      {item.booking.special_requests && (
        <View style={styles.specialRequests}>
          <Text style={styles.specialRequestsLabel}>Special Requests:</Text>
          <Text style={styles.specialRequestsText}>{item.booking.special_requests}</Text>
        </View>
      )}

      {getStatusActions(item.booking.status).length > 0 && (
        <View style={styles.actionButtons}>
          {getStatusActions(item.booking.status).map((action, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.actionButton, { backgroundColor: action.color }]}
              onPress={() => updateBookingStatus(bookingId, action.action)}
            >
              <Text style={styles.actionButtonText}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
    );
  };

  const renderFilterTabs = () => (
    <View style={styles.filterContainer}>
      {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
        <TouchableOpacity
          key={status}
          style={[
            styles.filterTab,
            selectedStatus === status && styles.filterTabActive
          ]}
          onPress={() => setSelectedStatus(status)}
        >
          <Text style={[
            styles.filterTabText,
            selectedStatus === status && styles.filterTabTextActive
          ]}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading bookings...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Company Bookings</Text>
        <View style={{ width: 24 }} />
      </View>

      {renderFilterTabs()}

      <FlatList
        data={filteredBookings}
        renderItem={renderBookingItem}
        keyExtractor={(item) => getBookingId(item.booking)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AntDesign name="inbox" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No bookings found</Text>
            <Text style={styles.emptySubtext}>
              {selectedStatus === 'all' 
                ? 'You don\'t have any bookings yet'
                : `No ${selectedStatus} bookings found`
              }
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTabTextActive: {
    color: 'white',
  },
  listContainer: {
    padding: 20,
  },
  bookingCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  packageInfo: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  packageDetails: {
    fontSize: 14,
    color: '#6B7280',
  },
  bookingDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  specialRequests: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  specialRequestsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default CompanyBookingsScreen;
