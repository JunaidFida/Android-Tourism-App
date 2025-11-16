import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AppStackParamList } from '../../navigation/AuthNavigator';
import { LinearGradient } from 'expo-linear-gradient';
import { buildApiUrl } from '../../config/api';

type SpotDetailsScreenNavigationProp = StackNavigationProp<AppStackParamList>;

interface RouteParams {
  spotId: string;
}

interface TouristSpot {
  id: string;
  name: string;
  description: string;
  location: string;
  region: string;
  categories: string[];
  image_urls: string[];
  rating: number;
  total_ratings: number;
}

const SpotDetailsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation<SpotDetailsScreenNavigationProp>();
  const { spotId } = route.params as RouteParams;
  const [spotData, setSpotData] = useState<TouristSpot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSpotDetails();
  }, [spotId]);

  const fetchSpotDetails = async () => {
    try {
      const response = await fetch(buildApiUrl(`/tourist-spots/${spotId}`));
      if (response.ok) {
        const data = await response.json();
        setSpotData(data);
      } else {
        Alert.alert('Error', 'Failed to fetch spot details');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetDirections = () => {
    if (!spotData) return;
    
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('Maps', {
        spotId: spotData.id,
        title: spotData.name,
      });
    } else {
      (navigation as any).navigate('Maps', {
        spotId: spotData.id,
        title: spotData.name,
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading spot details...</Text>
      </View>
    );
  }

  if (!spotData) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tourist spot not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Hero Image */}
      <View style={styles.heroSection}>
        <Image
          source={{
            uri: spotData.image_urls[0] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
          }}
          style={styles.heroImage}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.heroOverlay}
        >
          <View style={styles.heroContent}>
            <Text style={styles.spotTitle}>{spotData.name}</Text>
            <View style={styles.locationContainer}>
              <AntDesign name="enviromento" size={16} color="white" />
              <Text style={styles.locationText}>
                {typeof spotData.location === 'string' ? spotData.location : spotData.location.address}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.contentContainer}>
        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <AntDesign name="star" size={20} color="#FCD34D" />
            <Text style={styles.statText}>
              {spotData.rating.toFixed(1)} ({spotData.total_ratings})
            </Text>
          </View>
          <View style={styles.statItem}>
            <AntDesign name="enviroment" size={20} color="#3B82F6" />
            <Text style={styles.statText}>{spotData.region}</Text>
          </View>
          <View style={styles.statItem}>
            <AntDesign name="tags" size={20} color="#10B981" />
            <Text style={styles.statText}>{spotData.categories.length} categories</Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <View style={styles.categoriesContainer}>
            {spotData.categories && spotData.categories.length > 0 ? (
              spotData.categories.map((category, index) => (
                <View key={index} style={styles.categoryTag}>
                  <Text style={styles.categoryText}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.noDataText}>No categories listed</Text>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About This Place</Text>
          <Text style={styles.description}>{spotData.description}</Text>
        </View>

        {/* Location Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationInfoContainer}>
            <AntDesign name="enviroment" size={24} color="#3B82F6" />
            <View style={styles.locationDetails}>
              <Text style={styles.locationName}>
                {typeof spotData.location === 'string' 
                  ? spotData.location 
                  : (spotData.location as { address: string }).address}
              </Text>
              <Text style={styles.regionName}>{spotData.region}</Text>
            </View>
          </View>
        </View>

        {/* Images Gallery */}
        {spotData.image_urls && spotData.image_urls.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gallery</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.galleryContainer}>
                {spotData.image_urls.slice(1).map((imageUrl, index) => (
                  <Image
                    key={index}
                    source={{ uri: imageUrl }}
                    style={styles.galleryImage}
                  />
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Action Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.directionsButton}
          onPress={handleGetDirections}
        >
          <AntDesign name="enviromento" size={20} color="white" />
          <Text style={styles.directionsButtonText}>Get Directions</Text>
        </TouchableOpacity>
      </View>
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
  spotTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
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
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#EBF4FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
  locationInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  regionName: {
    fontSize: 14,
    color: '#6b7280',
  },
  galleryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  galleryImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  actionContainer: {
    padding: 20,
    paddingTop: 0,
  },
  directionsButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  directionsButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },
});

export default SpotDetailsScreen;
