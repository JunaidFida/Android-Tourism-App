import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/selectors';
import MapboxMap from '../components/MapboxMap';
import { buildApiUrl } from '../config/api';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from '../services/apiService';

interface TouristSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category: string;
  description: string;
  rating: number;
}

interface MapRouteParams {
  destinationName?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  spotId?: string;
  title?: string;
}

const MapScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(selectUser);
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [userLocation, setUserLocation] = useState<{latitude: number; longitude: number} | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNavigation, setShowNavigation] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);

  const routeParams = (route.params || {}) as MapRouteParams;
  const destinationLatitude = routeParams?.destinationLatitude;
  const destinationLongitude = routeParams?.destinationLongitude;
  const destinationName = routeParams?.destinationName;
  const spotId = routeParams?.spotId;
  const title = routeParams?.title;

  const hasDestination = useMemo(() => {
    return typeof destinationLatitude === 'number' && typeof destinationLongitude === 'number';
  }, [destinationLatitude, destinationLongitude]);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (spotId) {
      // Fetch spot details by ID
      fetchSpotById(spotId);
    } else if (hasDestination && typeof destinationLatitude === 'number' && typeof destinationLongitude === 'number') {
      const destinationSpot: TouristSpot = {
        id: 'package-destination',
        name: destinationName || title || 'Package Location',
        latitude: destinationLatitude,
        longitude: destinationLongitude,
        category: 'destination',
        description: destinationName || title || 'Package destination',
        rating: 0,
      };

      setSpots([destinationSpot]);
      setSelectedSpot(destinationSpot);
      setShowNavigation(false);
      setMapCenter({
        latitude: destinationLatitude,
        longitude: destinationLongitude,
      });
      setLoading(false);
    } else {
      fetchNearbySpots();
    }
  }, [hasDestination, destinationLatitude, destinationLongitude, destinationName, spotId, title]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getCurrentLocation();
      } else {
        Alert.alert('Permission Denied', 'Location permission is required to show nearby spots');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      console.error('Location error:', error);
      // Fallback to default location (Lahore)
      setUserLocation({
        latitude: 31.5204,
        longitude: 74.3587,
      });
      Alert.alert('Location Error', 'Using default location. Please enable location services for better experience.');
    }
  };

  const fetchSpotById = async (id: string) => {
    setLoading(true);
    try {
      const response = await apiService.getTouristSpotDetails(id);
      
      if (response.success && response.data) {
        const spot = response.data;
        const location = spot.location || {};
        const latitude = location.latitude || 0;
        const longitude = location.longitude || 0;
        
        if (latitude !== 0 && longitude !== 0) {
          const spotData: TouristSpot = {
            id: spot.id || spot._id || id,
            name: spot.name || title || 'Tourist Spot',
            latitude: latitude,
            longitude: longitude,
            category: Array.isArray(spot.categories) && spot.categories.length > 0 ? spot.categories[0] : 'general',
            description: spot.description || '',
            rating: spot.rating || spot.average_rating || 0,
          };
          
          setSpots([spotData]);
          setSelectedSpot(spotData);
          setShowNavigation(false);
          setMapCenter({
            latitude: latitude,
            longitude: longitude,
          });
        } else {
          Alert.alert('Error', 'This spot does not have location information');
          fetchNearbySpots();
        }
      } else {
        Alert.alert('Error', response.message || 'Failed to load spot details');
        fetchNearbySpots();
      }
    } catch (error) {
      console.error('Error fetching spot:', error);
      Alert.alert('Error', 'Failed to load spot details. Please check your connection.');
      fetchNearbySpots();
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbySpots = async () => {
    setLoading(true);
    try {
      // Use apiService instead of direct fetch for better error handling
      const response = await apiService.getTouristSpots({ limit: '100' });
      
      if (response.success && response.data) {
        // Ensure data is an array
        const spotsArray = Array.isArray(response.data) ? response.data : [];
        
        if (spotsArray.length === 0) {
          console.log('No spots found');
          setSpots([]);
          setLoading(false);
          return;
        }
        
        const formattedSpots = spotsArray.map((spot: any) => {
          // Handle both id and _id fields
          const spotId = spot.id || spot._id || '';
          // Handle location object
          const location = spot.location || {};
          const latitude = location.latitude || 0;
          const longitude = location.longitude || 0;
          // Handle categories array
          const categories = Array.isArray(spot.categories) ? spot.categories : [];
          
          return {
            id: spotId,
            name: spot.name || 'Unknown Spot',
            latitude: latitude,
            longitude: longitude,
            category: categories[0] || 'general',
            description: spot.description || '',
            rating: spot.rating || spot.average_rating || 0,
          };
        }).filter((spot: any) => spot.latitude !== 0 && spot.longitude !== 0); // Filter out spots without valid coordinates
        
        setSpots(formattedSpots);
      } else {
        console.error('Error response:', response);
        Alert.alert('Error', response.message || 'Failed to load tourist spots');
        setSpots([]);
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
      Alert.alert('Error', 'Failed to load tourist spots. Please check your connection.');
      setSpots([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSpotPress = (spotId: string) => {
    const spot = spots.find(s => s.id === spotId);
    if (spot) {
      setSelectedSpot(spot);
      Alert.alert(
        spot.name,
        `${spot.description}\n\nRating: ${spot.rating}/5`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Navigate', onPress: () => startNavigation(spot) },
          { text: 'View Details', onPress: () => viewSpotDetails(spot) },
        ]
      );
    }
  };

  const startNavigation = (spot: TouristSpot) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to navigate');
      return;
    }
    setSelectedSpot(spot);
    setShowNavigation(true);
  };

  const viewSpotDetails = (spot: TouristSpot) => {
    // Use parent navigator to navigate to SpotDetails in root stack
    const parent = navigation.getParent();
    if (parent) {
      (parent as any).navigate('SpotDetails', { spotId: spot.id });
    } else {
      (navigation as any).navigate('SpotDetails', { spotId: spot.id });
    }
  };

  const stopNavigation = () => {
    setShowNavigation(false);
    setSelectedSpot(null);
  };

  const findNearbySpots = async () => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services');
      return;
    }

    try {
      // Get auth token from AsyncStorage
      const token = await AsyncStorage.getItem('access_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        buildApiUrl(`/maps/nearby?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=50`),
        {
          headers,
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Handle both { nearby_spots: [...] } and direct array response
        const spotsData = data.nearby_spots || (Array.isArray(data) ? data : []);
        const nearbySpots = Array.isArray(spotsData) ? spotsData.map((spot: any) => {
          // Handle both id and _id fields
          const spotId = spot.id || spot._id || '';
          // Handle location object
          const location = spot.location || {};
          const latitude = location.latitude || 0;
          const longitude = location.longitude || 0;
          // Handle categories array
          const categories = Array.isArray(spot.categories) ? spot.categories : [];
          
          return {
            id: spotId,
            name: spot.name || 'Unknown Spot',
            latitude: latitude,
            longitude: longitude,
            category: categories[0] || 'general',
            description: spot.description || '',
            rating: spot.rating || spot.average_rating || 0,
          };
        }).filter((spot: any) => spot.latitude !== 0 && spot.longitude !== 0) : [];
        
        setSpots(nearbySpots);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        Alert.alert('Error', errorData.detail || 'Failed to find nearby spots');
      }
    } catch (error) {
      console.error('Error finding nearby spots:', error);
      Alert.alert('Error', 'Failed to find nearby spots. Please check your connection.');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapboxMap
        spots={spots}
        userLocation={userLocation || undefined}
        initialCenter={mapCenter || undefined}
        onSpotPress={handleSpotPress}
        showNavigation={showNavigation}
        destinationCoords={selectedSpot ? [selectedSpot.longitude, selectedSpot.latitude] : undefined}
      />
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={getCurrentLocation}>
          <Text style={{color: '#fff'}}>📍</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.controlButton} onPress={findNearbySpots}>
          <Text style={{color: '#fff'}}>🔍</Text>
        </TouchableOpacity>
        
        {showNavigation && (
          <TouchableOpacity style={[styles.controlButton, styles.stopButton]} onPress={stopNavigation}>
            <Text style={{color: '#fff'}}>⏹️</Text>
          </TouchableOpacity>
        )}
      </View>

      {showNavigation && selectedSpot && (
        <View style={styles.navigationInfo}>
          <Text style={styles.navigationText}>
            Navigating to: {selectedSpot.name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsContainer: {
    position: 'absolute',
    right: 16,
    top: 100,
    flexDirection: 'column',
  },
  controlButton: {
    backgroundColor: '#007AFF',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  navigationInfo: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  navigationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default MapScreen;
