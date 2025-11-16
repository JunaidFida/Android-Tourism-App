import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AppStackParamList } from '../../navigation/AuthNavigator';
import apiService from '../../services/apiService';
import { buildApiUrl } from '../../config/api';

type ExploreScreenNavigationProp = StackNavigationProp<AppStackParamList>;

// Helper function to resolve image URLs (handles both absolute and relative URLs)
const resolveImageUrl = (url?: string | string[] | null): string => {
  const defaultImage = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=400&q=80';
  
  // Handle array of URLs - take the first one
  let imageUrl: string | null = null;
  if (Array.isArray(url)) {
    imageUrl = url.length > 0 ? url[0] : null;
  } else if (typeof url === 'string') {
    imageUrl = url;
  }
  
  // If no URL, return default
  if (!imageUrl) {
    return defaultImage;
  }
  
  // If already an absolute URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }
  
  // If relative URL, prepend API base URL
  const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
  try {
    return buildApiUrl(normalizedUrl);
  } catch (error) {
    console.error('Error building image URL:', error);
    return defaultImage;
  }
};

interface TouristSpot {
  _id: string;
  id?: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  region: string;
  categories: string[];
  image_urls: string[];
  rating: number;
  total_ratings: number;
}

const ExploreScreen: React.FC = () => {
  const navigation = useNavigation<ExploreScreenNavigationProp>();
  const [searchQuery, setSearchQuery] = useState('');
  const selectedCategory = 'all';
  const [selectedRegion] = useState<string>('all');
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [regions, setRegions] = useState<string[]>([]);

  const categories = [
    { key: 'all', label: 'All' },
    { key: 'historical', label: 'Historical' },
    { key: 'natural', label: 'Natural' },
    { key: 'religious', label: 'Religious' },
    { key: 'cultural', label: 'Cultural' },
    { key: 'adventure', label: 'Adventure' },
  ];

  useEffect(() => {
    fetchTouristSpots();
  }, []);

  useEffect(() => {
    searchSpots();
  }, [searchQuery, selectedRegion]);

  const fetchTouristSpots = async () => {
    try {
      const response = await apiService.getTouristSpots();
      if (response.success && response.data) {
        // Ensure data is an array
        const spotsArray = Array.isArray(response.data) ? response.data : [];
        setSpots(spotsArray);
        
        // Extract unique regions
        if (spotsArray.length > 0) {
          const uniqueRegions = [...new Set(spotsArray.map((spot: TouristSpot) => spot.region || 'Unknown'))] as string[];
          setRegions(uniqueRegions);
        } else {
          setRegions([]);
        }
      } else {
        setSpots([]);
        setRegions([]);
        Alert.alert('Error', response.message || 'Failed to fetch tourist spots');
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
      setSpots([]);
      setRegions([]);
      Alert.alert('Error', 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const searchSpots = async () => {
    if (!searchQuery && selectedCategory === 'all' && selectedRegion === 'all') {
      fetchTouristSpots();
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      if (searchQuery) params.append('search', searchQuery);
      if (selectedRegion !== 'all') params.append('region', selectedRegion);
      if (selectedCategory !== 'all') params.append('categories', selectedCategory);

      const response = await fetch(buildApiUrl(`/tourist-spots/?${params.toString()}`));
      if (response.ok) {
        const data = await response.json();
        // Ensure data is an array
        const spotsArray = Array.isArray(data) ? data : [];
        setSpots(spotsArray);
      } else {
        setSpots([]);
        Alert.alert('Error', 'Search failed');
      }
    } catch (error) {
      console.error('searchSpots failed:', error);
      const message = error instanceof Error ? error.message : 'Network error';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  // Safely get a spot's ID
  const getSpotId = (spot: TouristSpot): string | undefined => spot._id ?? spot.id;

  const handleSpotPress = (spot: TouristSpot) => {
    const spotId = getSpotId(spot);
    if (!spotId) {
      Alert.alert('Error', 'Spot ID is missing');
      return;
    }
    // Use parent navigator to navigate to SpotDetails in root stack
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('SpotDetails', { spotId, title: spot.name });
    } else {
      (navigation as any).navigate('SpotDetails', { spotId, title: spot.name });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading spots...</Text>
        </View>
      );
    }

    if (spots.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <AntDesign name="search1" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Spots Found</Text>
          <Text style={styles.emptyText}>
            Try adjusting your search criteria or check back later for new spots.
          </Text>
        </View>
      );
    }

    return (
      <FlatList
        data={spots}
        renderItem={({ item }: { item: TouristSpot }) => (
          <TouchableOpacity
            style={styles.spotCard}
            onPress={() => handleSpotPress(item)}
          >
            <Image
              source={{
                uri: resolveImageUrl(item.image_urls || item.image_url),
              }}
              style={styles.spotImage}
            />
            <View style={styles.spotContent}>
              <Text style={styles.spotName}>{item.name}</Text>
              <View style={styles.locationContainer}>
                <AntDesign name="enviromento" size={14} color="#6b7280" />
                <Text style={styles.spotLocation}>
                  {typeof item.location === 'string' ? item.location : item.location.address}
                </Text>
              </View>
              <Text style={styles.spotDescription} numberOfLines={2}>
                {item.description}
              </Text>
              <View style={styles.spotFooter}>
                <View style={styles.ratingContainer}>
                  <AntDesign name="star" size={14} color="#FCD34D" />
                  <Text style={styles.ratingText}>
                    {item.rating.toFixed(1)} ({item.total_ratings})
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
        keyExtractor={(item, index) => getSpotId(item) ?? String(index)}
        style={styles.spotsList}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore Places</Text>
        <TouchableOpacity onPress={() => fetchTouristSpots()}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={20} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search tourist spots..."
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

      {renderContent()}
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
  spotsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  spotCard: {
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
  spotImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  spotContent: {
    padding: 16,
  },
  spotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 4,
  },
  spotLocation: {
    fontSize: 14,
    color: '#6b7280',
  },
  spotDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  spotFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default ExploreScreen;
