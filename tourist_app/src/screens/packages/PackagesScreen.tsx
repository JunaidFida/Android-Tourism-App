import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import apiService from '../../services/apiService';
import { useNavigation } from '@react-navigation/native';
import { buildApiUrl } from '../../config/api';

interface TourPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  destinations: string[];
  start_date: string;
  end_date: string;
  max_participants: number;
  current_participants: number;
  status: 'active' | 'inactive';
  travel_company_id: string;
}

const DEFAULT_PACKAGE_IMAGE = 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80';

const resolveImageUrl = (url?: string | null): string => {
  if (!url || typeof url !== 'string') {
    return DEFAULT_PACKAGE_IMAGE;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  const normalizedUrl = url.startsWith('/') ? url : `/${url}`;
  return buildApiUrl(normalizedUrl);
};

const PackagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const [packages, setPackages] = useState<TourPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'price' | 'duration' | 'name'>('name');
  const [filterBy, setFilterBy] = useState<'all' | 'active' | 'available'>('all');

  useEffect(() => {
    fetchPackages();
  }, []);

  useEffect(() => {
    searchPackages();
  }, [searchQuery, sortBy, filterBy]);

  const fetchPackages = async () => {
    try {
      const response = await apiService.getTourPackages();
      if (response.success && response.data) {
        setPackages(response.data);
      } else {
        Alert.alert('Error', response.message || 'Failed to fetch tour packages');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const searchPackages = async () => {
    if (!searchQuery && sortBy === 'name' && filterBy === 'all') {
      fetchPackages();
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {};
      
      if (searchQuery) params.search = searchQuery;
      if (filterBy === 'active') params.status = 'active';

      const response = await apiService.getTourPackages(params);
      if (response.success && response.data) {
        let data = response.data;
        
        // Apply local filtering and sorting
        if (filterBy === 'available') {
          data = data.filter((pkg: TourPackage) => 
            pkg.status === 'active' && pkg.current_participants < pkg.max_participants
          );
        }
        
        // Sort data
        data.sort((a: TourPackage, b: TourPackage) => {
          switch (sortBy) {
            case 'price':
              return a.price - b.price;
            case 'duration':
              return a.duration_days - b.duration_days;
            case 'name':
            default:
              return a.name.localeCompare(b.name);
          }
        });
        
        setPackages(data);
      } else {
        Alert.alert('Error', response.message || 'Search failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableSlots = (pkg: TourPackage) => {
    return pkg.max_participants - pkg.current_participants;
  };

  const renderPackageCard = ({ item }: { item: TourPackage }) => {
    // Fallbacks for differing backend fields
    const displayName = (item as any).name || (item as any).title || 'Untitled Package';
    const displayPrice = (item as any).price;
    const displayDuration = (item as any).duration_days;
    const displayStartDate = (item as any).start_date || ((item as any).available_dates?.[0] ?? null);
    // Fix status check - handle both status field (string) and is_active field (boolean)
    const statusValue = (item as any).status;
    const isActiveValue = (item as any).is_active;
    const isActive = statusValue === 'active' || statusValue === 'ACTIVE' || isActiveValue === true;
    const availableSlots = typeof (item as any).max_participants === 'number' && typeof (item as any).current_participants === 'number'
      ? (item as any).max_participants - (item as any).current_participants
      : undefined;
    const isAvailable = isActive && (typeof availableSlots === 'number' ? availableSlots > 0 : true);
    const destinations: string[] = Array.isArray((item as any).destinations)
      ? (item as any).destinations
      : Array.isArray((item as any).included_spots)
        ? (item as any).included_spots
        : [];
    const packageId = (item as any).id || (item as any)._id;
    const primaryImageRaw = Array.isArray((item as any).image_urls)
      ? (item as any).image_urls[0]
      : (item as any).image_url;
    const primaryImage = resolveImageUrl(primaryImageRaw);
    // Get company name from various possible fields
    const companyName = (item as any).company_name || (item as any).travel_company?.full_name || (item as any).travel_company?.name || '';

    return (
      <TouchableOpacity
        style={styles.packageCard}
        onPress={() => (navigation as any).navigate('PackageDetails', { packageId })}
      >
        <Image
          source={{
            uri: primaryImage,
          }}
          style={styles.packageImage}
        />
        
        <View style={styles.packageContent}>
          <View style={styles.packageHeader}>
            <Text style={styles.packageName} numberOfLines={2}>{displayName}</Text>
            {typeof displayPrice === 'number' && (
              <Text style={styles.packagePrice}>Rs. {displayPrice.toLocaleString()}</Text>
            )}
          </View>
          
          {companyName && (
            <Text style={styles.companyName} numberOfLines={1}>
              by {companyName}
            </Text>
          )}
          
          <Text style={styles.packageDescription} numberOfLines={2}>
            {(item as any).description || ''}
          </Text>
          
          <View style={styles.packageDetails}>
            <View style={styles.detailItem}>
              <AntDesign name="clockcircle" size={14} color="#3B82F6" />
              {typeof displayDuration === 'number' && (
                <Text style={styles.detailText}>{displayDuration} days</Text>
              )}
            </View>
            
            <View style={styles.detailItem}>
              <AntDesign name="team" size={14} color="#3B82F6" />
              <Text style={styles.detailText}>
                {typeof availableSlots === 'number' ? `${availableSlots} slots left` : (isActive ? 'Active' : 'Inactive')}
              </Text>
            </View>
            
            <View style={styles.detailItem}>
              <AntDesign name="calendar" size={14} color="#3B82F6" />
              <Text style={styles.detailText}>
                {displayStartDate ? new Date(displayStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
              </Text>
            </View>
          </View>
          
          <View style={styles.packageFooter}>
            <Text style={styles.destinations} numberOfLines={1}>
              {Array.isArray(destinations) ? destinations.join(' • ') : ''}
            </Text>
            
            <View style={[
              styles.statusBadge,
              isAvailable ? styles.availableBadge : isActive ? styles.fullBadge : styles.inactiveBadge
            ]}>
              <Text style={[
                styles.statusText,
                isAvailable ? styles.availableText : isActive ? styles.fullText : styles.inactiveText
              ]}>
                {isAvailable ? 'Available' : isActive ? 'Full' : 'Inactive'}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderFilterButton = (label: string, value: string, onPress: () => void, isActive: boolean) => (
    <TouchableOpacity
      style={[styles.filterButton, isActive && styles.filterButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterButtonText, isActive && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // Precompute content to avoid nested ternary in JSX
  let content: React.ReactNode;
  if (loading) {
    content = (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading packages...</Text>
      </View>
    );
  } else if (packages.length === 0) {
    content = (
      <View style={styles.emptyContainer}>
        <AntDesign name="gift" size={64} color="#d1d5db" />
        <Text style={styles.emptyTitle}>No Packages Found</Text>
        <Text style={styles.emptyText}>
          Try adjusting your search criteria or check back later for new packages.
        </Text>
      </View>
    );
  } else {
    content = (
      <FlatList
        data={packages}
        renderItem={renderPackageCard}
        keyExtractor={(item, index) => (item as any).id || (item as any)._id || String(index)}
        style={styles.packagesList}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tour Packages</Text>
        <TouchableOpacity onPress={fetchPackages}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search packages..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#9ca3af"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <AntDesign name="closecircle" size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupTitle}>Filter:</Text>
          <View style={styles.filterButtons}>
            {renderFilterButton('All', 'all', () => setFilterBy('all'), filterBy === 'all')}
            {renderFilterButton('Active', 'active', () => setFilterBy('active'), filterBy === 'active')}
            {renderFilterButton('Available', 'available', () => setFilterBy('available'), filterBy === 'available')}
          </View>
        </View>

        <View style={styles.filterGroup}>
          <Text style={styles.filterGroupTitle}>Sort by:</Text>
          <View style={styles.filterButtons}>
            {renderFilterButton('Name', 'name', () => setSortBy('name'), sortBy === 'name')}
            {renderFilterButton('Price', 'price', () => setSortBy('price'), sortBy === 'price')}
            {renderFilterButton('Duration', 'duration', () => setSortBy('duration'), sortBy === 'duration')}
          </View>
        </View>
      </View>

      {/* Results Count */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsText}>
          {packages.length} {packages.length === 1 ? 'package' : 'packages'} found
        </Text>
      </View>

      {/* Packages List */}
      {content}
    </SafeAreaView>
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
    paddingTop: 10,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filtersSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterButton: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: 'white',
  },
  resultsContainer: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  packagesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
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
  packageImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  packageContent: {
    padding: 16,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  packageName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  companyName: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 4,
    marginBottom: 4,
    fontWeight: '500',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#6b7280',
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destinations: {
    flex: 1,
    fontSize: 12,
    color: '#9ca3af',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availableBadge: {
    backgroundColor: '#D1FAE5',
  },
  fullBadge: {
    backgroundColor: '#FEF3C7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  availableText: {
    color: '#059669',
  },
  fullText: {
    color: '#D97706',
  },
  inactiveText: {
    color: '#DC2626',
  },
});

export default PackagesScreen;
