import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { buildApiUrl } from '../../config/api';
import { TourPackage, UserRole } from '../../types';
import { useAppSelector } from '../../store/hooks';
import type { AuthState } from '../../store/slices/authSlice';

interface RouteParams {
  packageId: string;
}

const DEFAULT_PACKAGE_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=800&q=80';

const resolveImageUrl = (url?: string | null) => {
  if (!url || typeof url !== 'string') {
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return buildApiUrl(normalizedUrl);
};

const PackageDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { packageId } = route.params as RouteParams;
  const { user, isAuthenticated } = useAppSelector((state) => state.auth) as AuthState;
  const [packageData, setPackageData] = useState<TourPackage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [peopleModalVisible, setPeopleModalVisible] = useState(false);
  const [peopleCount, setPeopleCount] = useState('1');

  useEffect(() => {
    fetchPackageDetails();
  }, [packageId]);

  const fetchPackageDetails = async () => {
    try {
      const response = await fetch(buildApiUrl(`/tour-packages/${packageId}`));
      if (response.ok) {
        const data = await response.json();
        setPackageData(data);
      } else {
        Alert.alert('Error', 'Failed to fetch package details');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBookNow = async () => {
    if (!packageData) return;

    // Check if user is authenticated
    if (!isAuthenticated || !user) {
      Alert.alert(
        'Login Required', 
        'Please login to book this package.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Login', onPress: () => (navigation as any).navigate('Login') }
        ]
      );
      return;
    }

    // Only tourists can book packages
    if (user.role !== UserRole.TOURIST) {
      Alert.alert(
        'Access Restricted', 
        'Only tourists can book packages. Travel companies can manage their own packages from the dashboard.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    // Use group_size as the main field, fallback to max_participants for legacy support
    const maxSlots = packageData.group_size || packageData.max_participants || 0;
    const currentSlots = packageData.current_participants || 0;
    const availableSlots = maxSlots - currentSlots;
    
    if (availableSlots <= 0) {
      Alert.alert('Sorry', 'This package is fully booked.');
      return;
    }
    setPeopleCount('1');
    setPeopleModalVisible(true);
  };

  const handleEditPackage = () => {
    if (!packageData) return;
    
    // Navigate to edit screen for travel companies
    (navigation as any).navigate('EditPackage', { packageId });
  };

  const handleDeletePackage = () => {
    Alert.alert(
      'Delete Package',
      'Are you sure you want to delete this package? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(buildApiUrl(`/tour-packages/${packageId}`), {
                method: 'DELETE',
              });
              if (response.ok) {
                Alert.alert('Success', 'Package deleted successfully');
                navigation.goBack();
              } else {
                Alert.alert('Error', 'Failed to delete package');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error');
            }
          }
        }
      ]
    );
  };

  const handleManageBookings = () => {
    // Navigate to bookings management for this package
    (navigation as any).navigate('PackageBookings', { packageId, packageTitle: packageData?.title || packageData?.name });
  };

  const getStatusText = (): string => {
    if (!packageData) return '';
    
    // Fix status check - handle both status field (string) and is_active field (boolean)
    const statusValue = (packageData as any).status;
    const isActiveValue = (packageData as any).is_active;
    const isActive = statusValue === 'active' || statusValue === 'ACTIVE' || isActiveValue === true;
    
    if (!isActive) return 'Inactive';
    if (availableSlots <= 0) return 'Fully Booked';
    if (availableSlots <= 3) return 'Limited Availability';
    return 'Available';
  };

  const getStatusColor = (): string => {
    if (!packageData) return '#6B7280';
    
    // Fix status check - handle both status field (string) and is_active field (boolean)
    const statusValue = (packageData as any).status;
    const isActiveValue = (packageData as any).is_active;
    const isActive = statusValue === 'active' || statusValue === 'ACTIVE' || isActiveValue === true;
    
    if (!isActive) return '#EF4444';
    if (availableSlots <= 0) return '#EF4444';
    if (availableSlots <= 3) return '#F59E0B';
    return '#10B981';
  };

  const canUserModifyPackage = (): boolean => {
    if (!user || !packageData) return false;
    
    // Admins can modify any package
    if (user.role === UserRole.ADMIN) return true;
    
    // Travel companies can only modify their own packages
    if (user.role === UserRole.TRAVEL_COMPANY) {
      return packageData.created_by === user.id || packageData.travel_company_id === user.id;
    }
    
    return false;
  };

  const canUserViewAnalytics = (): boolean => {
    if (!user || !packageData) return false;
    
    // Admins can view analytics for any package
    if (user.role === UserRole.ADMIN) return true;
    
    // Travel companies can view analytics for their own packages
    if (user.role === UserRole.TRAVEL_COMPANY) {
      return packageData.created_by === user.id || packageData.travel_company_id === user.id;
    }
    
    return false;
  };

  const createBooking = async (numberOfPeople: number) => {
    if (!packageData) return;
    
    const maxSlots = packageData.group_size || packageData.max_participants || 0;
    const currentSlots = packageData.current_participants || 0;
    
    // Navigate to CreateBookingScreen instead of creating booking directly
    (navigation as any).navigate('CreateBooking', {
      packageId: packageId,
      packageName: packageData.title || packageData.name || 'Package',
      packagePrice: packageData.price,
      maxParticipants: maxSlots - currentSlots,
      availableDates: packageData.available_dates || [],
    });
    
    setPeopleModalVisible(false);
  };

  const handleShare = async () => {
    if (!packageData) return;
    
    try {
      await Share.share({
        message: `Check out this amazing tour package: ${packageData.title || packageData.name || 'Package'} - Rs. ${packageData.price.toLocaleString()} for ${packageData.duration_days} days!`,
      });
    } catch (error) {
      // Handle share error
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading package details...</Text>
      </View>
    );
  }

  if (!packageData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Package not found</Text>
      </View>
    );
  }

  // Calculate available slots using new structure with fallbacks
  const maxSlots = packageData.group_size || packageData.max_participants || 0;
  const currentSlots = packageData.current_participants || 0;
  const availableSlots = maxSlots - currentSlots;
  const heroImageUri = resolveImageUrl(packageData.image_urls?.[0]) || DEFAULT_PACKAGE_IMAGE;

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroSection}>
        <Image
          source={{
            uri: heroImageUri,
          }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.heroOverlay}
        >
          <View style={styles.heroContent}>
            <Text style={styles.packageTitle}>{packageData.title || packageData.name || 'Package'}</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>Rs. {packageData.price.toLocaleString()}</Text>
              <Text style={styles.priceUnit}>per person</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <AntDesign name="clockcircle" size={20} color="#3B82F6" />
            <Text style={styles.statText}>{packageData.duration_days} days</Text>
          </View>
          <View style={styles.statItem}>
            <AntDesign name="user" size={20} color="#3B82F6" />
            <Text style={styles.statText}>{availableSlots} slots left</Text>
          </View>
          <View style={styles.statItem}>
            <AntDesign name="star" size={20} color="#FCD34D" />
            <Text style={styles.statText}>
              {packageData.rating?.toFixed(1) || 'New'} 
              {packageData.total_ratings && ` (${packageData.total_ratings})`}
            </Text>
          </View>
          <View style={styles.statItem}>
            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statText}>{getStatusText()}</Text>
          </View>
          {packageData.category && (
            <View style={styles.statItem}>
              <AntDesign name="tags" size={20} color="#10B981" />
              <Text style={styles.statText}>{packageData.category}</Text>
            </View>
          )}
        </View>

        {/* Travel Company Information */}
        {((packageData as any).company_name || (packageData as any).travel_company) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Company</Text>
            <View style={styles.companyInfoContainer}>
              <AntDesign name="team" size={20} color="#3B82F6" />
              <Text style={styles.companyName}>
                {(packageData as any).company_name || 
                 (packageData as any).travel_company?.full_name || 
                 (packageData as any).travel_company?.name || 
                 'Unknown Company'}
              </Text>
            </View>
          </View>
        )}

        {/* Package Info */}
        {packageData.difficulty_level && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Difficulty Level</Text>
            <View style={styles.difficultyContainer}>
              <Text style={styles.difficultyText}>{packageData.difficulty_level}</Text>
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Package</Text>
          <Text style={styles.description}>{packageData.description}</Text>
        </View>

        {/* Destinations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Destinations</Text>
          {/* Use included_spots from new model, fallback to destinations for legacy */}
          {((packageData.included_spots && packageData.included_spots.length > 0) || (packageData.destinations && packageData.destinations.length > 0)) ? (
            (packageData.included_spots || packageData.destinations || []).map((destination, index) => (
              <View key={index} style={styles.destinationItem}>
                <AntDesign name="enviromento" size={16} color="#3B82F6" />
                <Text style={styles.destinationText}>{destination}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No destinations listed</Text>
          )}
        </View>

        {/* Dates */}
        {(packageData.start_date || packageData.end_date || packageData.available_dates) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Travel Dates</Text>
            {packageData.start_date && packageData.end_date ? (
              <View style={styles.dateContainer}>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <Text style={styles.dateText}>
                    {new Date(packageData.start_date).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.dateItem}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <Text style={styles.dateText}>
                    {new Date(packageData.end_date).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            ) : packageData.available_dates && packageData.available_dates.length > 0 ? (
              <View>
                <Text style={styles.dateLabel}>Available Dates:</Text>
                {packageData.available_dates.slice(0, 3).map((date, index) => (
                  <Text key={index} style={styles.dateText}>
                    {new Date(date).toLocaleDateString()}
                  </Text>
                ))}
                {packageData.available_dates.length > 3 && (
                  <Text style={styles.noDataText}>+{packageData.available_dates.length - 3} more dates</Text>
                )}
              </View>
            ) : (
              <Text style={styles.noDataText}>Contact for available dates</Text>
            )}
          </View>
        )}

        {/* What's Included */}
        {packageData.includes && packageData.includes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Included</Text>
            {packageData.includes.map((item, index) => (
              <View key={index} style={styles.includeItem}>
                <AntDesign name="checkcircle" size={16} color="#10B981" />
                <Text style={styles.includeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* What's Excluded */}
        {packageData.excludes && packageData.excludes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Not Included</Text>
            {packageData.excludes.map((item, index) => (
              <View key={index} style={styles.excludeItem}>
                <AntDesign name="closecircle" size={16} color="#EF4444" />
                <Text style={styles.excludeText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Itinerary */}
        {packageData.itinerary && packageData.itinerary.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Itinerary</Text>
            {packageData.itinerary.map((day, index) => (
              <View key={index} style={styles.itineraryItem}>
                <View style={styles.dayNumber}>
                  <Text style={styles.dayNumberText}>{day.day}</Text>
                </View>
                <View style={styles.dayContent}>
                  <Text style={styles.dayTitle}>{day.title}</Text>
                  <Text style={styles.dayDescription}>{day.description}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Role-specific Information */}
        {user?.role === UserRole.TRAVEL_COMPANY && canUserModifyPackage() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Package Management</Text>
            <View style={styles.managementInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Status:</Text>
                <Text style={[styles.infoValue, { color: packageData.is_active ? '#10B981' : '#EF4444' }]}>
                  {packageData.is_active ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bookings:</Text>
                <Text style={styles.infoValue}>{currentSlots} / {maxSlots}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created:</Text>
                <Text style={styles.infoValue}>
                  {packageData.created_at ? new Date(packageData.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {/* Share button for all users */}
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <AntDesign name="sharealt" size={20} color="#3B82F6" />
        </TouchableOpacity>
        
        {/* Role-based action buttons */}
        {user?.role === UserRole.TOURIST && (
          <TouchableOpacity
            style={[
              styles.bookButton,
              availableSlots <= 0 && styles.disabledButton,
            ]}
            onPress={handleBookNow}
            disabled={availableSlots <= 0}
          >
            <Text style={styles.bookButtonText}>
              {availableSlots <= 0 ? 'Fully Booked' : 'Book Now'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Travel Company Actions */}
        {canUserModifyPackage() && (
          <View style={styles.companyActionsContainer}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditPackage}
            >
              <AntDesign name="edit" size={16} color="white" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.manageButton}
              onPress={handleManageBookings}
            >
              <AntDesign name="team" size={16} color="white" />
              <Text style={styles.manageButtonText}>Bookings</Text>
            </TouchableOpacity>
            
            {user?.role === UserRole.ADMIN && (
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeletePackage}
              >
                <AntDesign name="delete" size={16} color="white" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Admin-only actions */}
        {user?.role === UserRole.ADMIN && !canUserModifyPackage() && (
          <View style={styles.adminActionsContainer}>
            <TouchableOpacity
              style={styles.adminButton}
              onPress={() => Alert.alert('Info', 'Admin dashboard features coming soon')}
            >
              <AntDesign name="setting" size={16} color="white" />
              <Text style={styles.adminButtonText}>Manage</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Analytics for package owners */}
        {canUserViewAnalytics() && (
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => (navigation as any).navigate('PackageAnalytics', { packageId })}
          >
            <AntDesign name="barschart" size={16} color="#3B82F6" />
            <Text style={styles.analyticsButtonText}>Analytics</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* People Count Modal - Only for tourists */}
      {user?.role === UserRole.TOURIST && (
        <Modal visible={peopleModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Book Package</Text>
              <Text style={styles.modalSubtitle}>How many people?</Text>
              <TextInput
                value={peopleCount}
                onChangeText={setPeopleCount}
                keyboardType="number-pad"
                style={styles.modalInput}
                placeholder="1"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalCancel]}
                  onPress={() => setPeopleModalVisible(false)}
                >
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.modalConfirm]}
                  onPress={async () => {
                    const numPeople = parseInt(peopleCount || '1');
                    const maxSlots = packageData!.group_size || packageData!.max_participants || 0;
                    const currentSlots = packageData!.current_participants || 0;
                    const available = maxSlots - currentSlots;
                    
                    if (!numPeople || numPeople <= 0) {
                      Alert.alert('Validation', 'Enter a valid number');
                      return;
                    }
                    if (numPeople > available) {
                      Alert.alert('Error', `Only ${available} slots available`);
                      return;
                    }
                    setPeopleModalVisible(false);
                    await createBooking(numPeople);
                  }}
                >
                  <Text style={[styles.modalBtnText, { color: 'white' }]}>Book</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
  },
  heroSection: {
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
    justifyContent: 'flex-end',
  },
  heroContent: {
    padding: 20,
  },
  packageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  priceUnit: {
    fontSize: 16,
    color: 'white',
    opacity: 0.8,
    marginLeft: 4,
  },
  contentContainer: {
    padding: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  destinationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  destinationText: {
    fontSize: 16,
    color: '#374151',
  },
  dateContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateItem: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 0,
    gap: 12,
  },
  shareButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  bookButton: {
    flex: 1,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  modalCancel: {},
  modalConfirm: { backgroundColor: '#3B82F6', borderColor: '#3B82F6' },
  modalBtnText: { color: '#111827', fontWeight: '600' },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
  companyInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  companyName: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '500',
  },
  difficultyContainer: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  difficultyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'capitalize',
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  includeText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  excludeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  excludeText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
    flex: 1,
  },
  itineraryItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dayNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  dayContent: {
    flex: 1,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  dayDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  companyActionsContainer: {
    flexDirection: 'row',
    flex: 1,
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    backgroundColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  manageButton: {
    flexDirection: 'row',
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  manageButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminActionsContainer: {
    flex: 1,
  },
  adminButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  adminButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  analyticsButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  analyticsButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  managementInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  bookingInfo: {
    backgroundColor: '#EBF8FF',
    borderRadius: 8,
    padding: 12,
  },
  bookingInfoText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
});

export default PackageDetailsScreen;
