import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import apiService from '../../services/apiService';

interface RouteParams {
  booking: any;
}

const BookingDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { booking: initialBooking } = route.params as RouteParams;
  const [booking, setBooking] = useState<any>(initialBooking || null);
  const [tourPackage, setTourPackage] = useState<any>(initialBooking?.tour_package || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookingId = useMemo(() => {
    return booking?.id || booking?._id || initialBooking?.id || initialBooking?._id || '';
  }, [booking, initialBooking]);

  const packageLocation = useMemo(() => {
    if (!tourPackage) {
      return null;
    }

    const locationCandidate =
      tourPackage.location ||
      (tourPackage as any)?.mapLocation ||
      null;

    const latitude =
      typeof locationCandidate?.latitude === 'number'
        ? locationCandidate.latitude
        : typeof (tourPackage as any)?.latitude === 'number'
          ? (tourPackage as any).latitude
          : typeof (tourPackage as any)?.lat === 'number'
            ? (tourPackage as any).lat
            : null;

    const longitude =
      typeof locationCandidate?.longitude === 'number'
        ? locationCandidate.longitude
        : typeof (tourPackage as any)?.longitude === 'number'
          ? (tourPackage as any).longitude
          : typeof (tourPackage as any)?.lng === 'number'
            ? (tourPackage as any).lng
            : null;

    if (
      typeof latitude === 'number' &&
      !Number.isNaN(latitude) &&
      typeof longitude === 'number' &&
      !Number.isNaN(longitude)
    ) {
      return {
        latitude,
        longitude,
        address: locationCandidate?.address || (tourPackage as any)?.location_address || '',
        name: tourPackage?.name || tourPackage?.title || 'Package Location',
      };
    }

    return null;
  }, [tourPackage]);

  useEffect(() => {
    let isActive = true;

    const loadBookingDetails = async () => {
      if (!bookingId) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const bookingResponse = await apiService.getBookingDetails(bookingId);

        if (isActive && bookingResponse.success && bookingResponse.data) {
          const data = bookingResponse.data;
          const normalizedBooking = {
            ...initialBooking,
            ...data,
            id: data.id || data._id || initialBooking?.id,
            participants_count:
              data.participants_count ||
              data.number_of_people ||
              initialBooking?.participants_count ||
              initialBooking?.number_of_people ||
              1,
            total_amount:
              data.total_amount ||
              data.total_price ||
              initialBooking?.total_amount ||
              initialBooking?.total_price ||
              0,
            booking_reference: data.booking_reference || initialBooking?.booking_reference,
          };
          setBooking(normalizedBooking);

          const packageId =
            normalizedBooking.tour_package?.id ||
            normalizedBooking.tour_package_id ||
            initialBooking?.tour_package?.id ||
            initialBooking?.tour_package_id;

          if (packageId) {
            const packageResponse = await apiService.getTourPackageDetails(packageId);
            if (isActive && packageResponse.success && packageResponse.data) {
              setTourPackage(packageResponse.data);
            }
          }
        } else if (isActive) {
          setError(bookingResponse.message || 'Failed to load booking details');
        }
      } catch (err) {
        if (isActive) {
          setError('Failed to load booking details. Please try again later.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    loadBookingDetails();

    return () => {
      isActive = false;
    };
  }, [bookingId, initialBooking]);

  const formatDate = (dateString?: string) => {
    if (!dateString) {
      return 'N/A';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    return date.toLocaleDateString();
  };

  const getStatusColor = (status?: string) => {
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

  const renderInfoRow = (label: string, value?: string | number | null) => (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value !== undefined && value !== null && value !== '' ? value : 'N/A'}</Text>
    </View>
  );

  const handleViewOnMap = () => {
    if (!packageLocation) {
      Alert.alert(
        'Location unavailable',
        'The travel company has not provided a map location for this package yet.'
      );
      return;
    }

    const params = {
      destinationName: packageLocation.address
        ? `${packageLocation.name} • ${packageLocation.address}`
        : packageLocation.name,
      destinationLatitude: packageLocation.latitude,
      destinationLongitude: packageLocation.longitude,
    };

    const parentNavigation = navigation.getParent?.();
    if (parentNavigation && typeof parentNavigation.navigate === 'function') {
      parentNavigation.navigate('Maps', params);
    } else {
      navigation.navigate('Maps' as never, params as never);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Details</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Fetching latest details...</Text>
        </View>
      )}

      {error && !isLoading && (
        <View style={styles.errorContainer}>
          <AntDesign name="warning" size={20} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {booking && (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.card}>
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{(booking.status || 'pending').toUpperCase()}</Text>
              </View>
              <Text style={styles.referenceText}>
                Reference: {booking.booking_reference || bookingId?.slice(-8)?.toUpperCase() || 'N/A'}
              </Text>
            </View>

            {renderInfoRow('Booked On', formatDate(booking.booking_date))}
            {renderInfoRow('Travel Date', formatDate(booking.travel_date))}
            {renderInfoRow('Number of Guests', booking.participants_count || booking.number_of_people)}
            {renderInfoRow('Total Amount', booking.total_amount ? `Rs. ${booking.total_amount}` : undefined)}

            {booking.special_requests && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Special Requests</Text>
                <Text style={styles.sectionText}>{booking.special_requests}</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              {renderInfoRow('Primary Phone', booking.contact_phone)}
              {renderInfoRow('Emergency Contact', booking.emergency_contact_name)}
              {renderInfoRow('Emergency Phone', booking.emergency_contact_number)}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Payment Summary</Text>
            {renderInfoRow('Price Per Person', booking.total_amount && booking.participants_count
              ? `Rs. ${(booking.total_amount / booking.participants_count).toFixed(0)}`
              : undefined)}
            {renderInfoRow('Total Paid', booking.total_amount ? `Rs. ${booking.total_amount}` : undefined)}
            {renderInfoRow('Status', booking.status ? booking.status.toUpperCase() : 'N/A')}
          </View>

          {tourPackage && (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Package Information</Text>
              {renderInfoRow('Package Name', tourPackage.name || tourPackage.title)}
              {renderInfoRow('Duration', tourPackage.duration_days ? `${tourPackage.duration_days} days` : undefined)}
              {renderInfoRow('Package Price', tourPackage.price ? `Rs. ${tourPackage.price}` : undefined)}
              {renderInfoRow('Category', tourPackage.category)}
              {tourPackage?.destinations?.length ? (
                renderInfoRow('Destinations', tourPackage.destinations.join(', '))
              ) : null}

              {tourPackage?.includes?.length ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Includes</Text>
                  {tourPackage.includes.map((item: string, index: number) => (
                    <Text key={`${item}-${index}`} style={styles.listItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}

              {tourPackage?.excludes?.length ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Excludes</Text>
                  {tourPackage.excludes.map((item: string, index: number) => (
                    <Text key={`${item}-${index}`} style={styles.listItem}>
                      • {item}
                    </Text>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.mapButton}
                onPress={handleViewOnMap}
              >
                <AntDesign name="enviromento" size={20} color="white" />
                <Text style={styles.mapButtonText}>View on Map</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  text: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  referenceText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    maxWidth: '60%',
    textAlign: 'right',
  },
  mapButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  mapButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  listItem: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
});

export default BookingDetailsScreen;
