import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import * as Location from 'expo-location';
import { buildApiUrl } from '../../config/api';

interface RouteParams {
  spotId?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

const MapsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { spotId, latitude, longitude, title } = (route.params as RouteParams) || {};
  
  const [userLocation, setUserLocation] = useState<LocationCoords | null>(null);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    if (spotId) {
      fetchSpotLocation();
    } else if (latitude && longitude) {
      setDestination({ latitude, longitude });
      setIsLoading(false);
    }
  }, [spotId, latitude, longitude]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location services for navigation.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      setLocationPermission(true);
      getCurrentLocation();
    } catch (error) {
      Alert.alert('Error', 'Failed to request location permission');
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
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const fetchSpotLocation = async () => {
    if (!spotId) return;
    
    try {
      const response = await fetch(buildApiUrl(`/tourist-spots/${spotId}`));
      if (response.ok) {
        const spotData = await response.json();
        // For demo purposes, using mock coordinates
        // In a real app, you'd geocode the location string
        setDestination({
          latitude: 37.7749 + Math.random() * 0.1, // Mock coordinates
          longitude: -122.4194 + Math.random() * 0.1,
        });
      } else {
        Alert.alert('Error', 'Failed to fetch spot location');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = async (mapApp: 'google' | 'apple') => {
    if (!destination) {
      Alert.alert('Error', 'Destination location not available');
      return;
    }

    const { latitude: destLat, longitude: destLng } = destination;
    let url = '';

    if (mapApp === 'google') {
      if (userLocation) {
        url = `https://www.google.com/maps/dir/${userLocation.latitude},${userLocation.longitude}/${destLat},${destLng}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
      }
    } else if (mapApp === 'apple' && Platform.OS === 'ios') {
      if (userLocation) {
        url = `http://maps.apple.com/?saddr=${userLocation.latitude},${userLocation.longitude}&daddr=${destLat},${destLng}&dirflg=d`;
      } else {
        url = `http://maps.apple.com/?q=${destLat},${destLng}`;
      }
    }

    if (url) {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', `Cannot open ${mapApp} maps`);
      }
    }
  };

  if (!locationPermission) {
    return (
      <View style={styles.permissionContainer}>
        <AntDesign name="enviromento" size={64} color="#d1d5db" />
        <Text style={styles.permissionTitle}>Location Access Required</Text>
        <Text style={styles.permissionText}>
          Please enable location services to use navigation features.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestLocationPermission}
        >
          <Text style={styles.permissionButtonText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Info */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <AntDesign name="enviromento" size={24} color="#3B82F6" />
          <View style={styles.headerText}>
            <Text style={styles.title}>{title || 'Navigation'}</Text>
            {destination && (
              <Text style={styles.subtitle}>
                Destination: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Location Info */}
      <View style={styles.content}>
        {userLocation && (
          <View style={styles.locationCard}>
            <AntDesign name="user" size={20} color="#10B981" />
            <View>
              <Text style={styles.cardTitle}>Your Location</Text>
              <Text style={styles.cardText}>
                {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        )}

        {destination && (
          <View style={styles.locationCard}>
            <AntDesign name="enviromento" size={20} color="#3B82F6" />
            <View>
              <Text style={styles.cardTitle}>Destination</Text>
              <Text style={styles.cardText}>
                {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
              </Text>
            </View>
          </View>
        )}

        {/* Navigation Options */}
        <View style={styles.navigationSection}>
          <Text style={styles.sectionTitle}>Open in Maps</Text>
          
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => openInMaps('google')}
          >
            <AntDesign name="enviromento" size={24} color="#4285F4" />
            <View style={styles.mapButtonContent}>
              <Text style={styles.mapButtonTitle}>Google Maps</Text>
              <Text style={styles.mapButtonSubtitle}>Get turn-by-turn directions</Text>
            </View>
            <AntDesign name="right" size={16} color="#9ca3af" />
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.mapButton}
              onPress={() => openInMaps('apple')}
            >
              <AntDesign name="enviromento" size={24} color="#007AFF" />
              <View style={styles.mapButtonContent}>
                <Text style={styles.mapButtonTitle}>Apple Maps</Text>
                <Text style={styles.mapButtonSubtitle}>Native iOS navigation</Text>
              </View>
              <AntDesign name="right" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={getCurrentLocation}
          >
            <AntDesign name="reload1" size={20} color="#3B82F6" />
            <Text style={styles.actionButtonText}>Refresh Location</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: 'white',
    paddingTop: 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  locationCard: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  navigationSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  mapButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  mapButtonContent: {
    flex: 1,
    marginLeft: 12,
  },
  mapButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  mapButtonSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  quickActions: {
    marginTop: 24,
  },
  actionButton: {
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
  },
});

export default MapsScreen;
