import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Region, MapPressEvent } from 'react-native-maps';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation, useRoute } from '@react-navigation/native';

type LocationPickerRouteParams = {
  initialLocation?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };
  onLocationSelected?: (location: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  }) => void;
};

type SearchResult = {
  id: string;
  displayName: string;
  latitude: number;
  longitude: number;
};

const DEFAULT_COORDS = {
  latitude: 31.5204,
  longitude: 74.3587,
};

const toRegion = (latitude: number, longitude: number, delta = 0.05): Region => {
  const safeLatitude =
    typeof latitude === 'number' && Number.isFinite(latitude)
      ? latitude
      : DEFAULT_COORDS.latitude;
  const safeLongitude =
    typeof longitude === 'number' && Number.isFinite(longitude)
      ? longitude
      : DEFAULT_COORDS.longitude;

  return {
    latitude: safeLatitude,
    longitude: safeLongitude,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
};

const LocationPickerScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute();
  const params = (route.params || {}) as LocationPickerRouteParams;

  const [mapRegion, setMapRegion] = useState<Region>(() => {
    const initialLat = params.initialLocation?.latitude;
    const initialLng = params.initialLocation?.longitude;

    if (
      typeof initialLat === 'number' &&
      Number.isFinite(initialLat) &&
      typeof initialLng === 'number' &&
      Number.isFinite(initialLng)
    ) {
      return toRegion(initialLat, initialLng, 0.05);
    }

    return toRegion(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, 0.3);
  });
  const [selectedLocation, setSelectedLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  } | null>(() => {
    const lat = params.initialLocation?.latitude;
    const lng = params.initialLocation?.longitude;

    if (
      typeof lat === 'number' &&
      Number.isFinite(lat) &&
      typeof lng === 'number' &&
      Number.isFinite(lng)
    ) {
      return { ...params.initialLocation, latitude: lat, longitude: lng };
    }

    return null;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const fetchCurrentLocation = useCallback(async () => {
    try {
      setIsFetchingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to determine your current position.');
        return;
      }

      const currentPosition = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = currentPosition.coords;
      setMapRegion(toRegion(latitude, longitude, 0.05));
    } catch (error) {
      console.error('Error fetching current location:', error);
      Alert.alert('Location Error', 'Unable to fetch your current location.');
    } finally {
      setIsFetchingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (!params.initialLocation) {
      fetchCurrentLocation();
    }
  }, [params.initialLocation, fetchCurrentLocation]);

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      return;
    }

    try {
      setSearching(true);
      setSearchResults([]);
      Keyboard.dismiss();

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          trimmedQuery
        )}&format=json&limit=8&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TouristApp/1.0 (contact@touristapp.local)',
            Accept: 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }

      const text = await response.text();
      const data = JSON.parse(text);

      const results: SearchResult[] = Array.isArray(data)
        ? data.map((item: any) => ({
            id: item.place_id?.toString() || `${item.lat}-${item.lon}`,
            displayName: item.display_name || trimmedQuery,
            latitude: parseFloat(item.lat),
            longitude: parseFloat(item.lon),
          }))
        : [];

      setSearchResults(results);
      if (results.length === 0) {
        Alert.alert('No Results', 'No locations were found. Try refining your search.');
      }
    } catch (error) {
      console.error('Location search failed:', error);
      Alert.alert('Search Error', 'Failed to search for locations. Please try again later.');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
    setSelectedLocation({
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.displayName,
      name: result.displayName.split(',')[0],
    });
    setMapRegion(toRegion(result.latitude, result.longitude, 0.04));
    setSearchResults([]);
    Keyboard.dismiss();
  };

  const handleMapPress = (event: MapPressEvent | any) => {
    const coordinate = event?.nativeEvent?.coordinate;
    if (!coordinate) {
      return;
    }

    const { latitude, longitude } = coordinate;

    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    setSelectedLocation({
      latitude,
      longitude,
    });
  };

  const handleConfirm = async () => {
    if (!selectedLocation) {
      Alert.alert('Select Location', 'Please pick a location by searching or tapping on the map.');
      return;
    }

    const callback = typeof params.onLocationSelected === 'function' ? params.onLocationSelected : undefined;
    try {
      setConfirming(true);

      let locationToReturn = { ...selectedLocation };

      if (!locationToReturn.address) {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${locationToReturn.latitude}&lon=${locationToReturn.longitude}&format=json`,
            {
              headers: {
                'User-Agent': 'TouristApp/1.0 (contact@touristapp.local)',
                Accept: 'application/json',
              },
            }
          );

          if (response.ok) {
            const reverseJson = await response.json();
            if (reverseJson?.display_name) {
              locationToReturn.address = reverseJson.display_name;
            }
          }
        } catch (reverseError) {
          console.warn('Reverse geocode failed:', reverseError);
        }
      }

      if (callback) {
        callback(locationToReturn);
      }

      navigation.goBack();
    } catch (error) {
      console.error('Failed to confirm location:', error);
      Alert.alert('Error', 'Unable to confirm this location. Please try again.');
    } finally {
      setConfirming(false);
    }
  };

  const markerCoordinate = useMemo(() => {
    if (!selectedLocation) {
      return null;
    }

    const { latitude, longitude } = selectedLocation;

    if (
      typeof latitude !== 'number' ||
      !Number.isFinite(latitude) ||
      typeof longitude !== 'number' ||
      !Number.isFinite(longitude)
    ) {
      return null;
    }

    return {
      latitude,
      longitude,
    };
  }, [selectedLocation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={22} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pick Package Location</Text>
        <TouchableOpacity
          onPress={() => {
            if (!confirming) {
              handleConfirm();
            }
          }}
          disabled={confirming}
        >
          <Text style={[styles.confirmText, confirming && styles.confirmTextDisabled]}>
            {confirming ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <AntDesign name="search1" size={18} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search area, address, or landmark"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <AntDesign name="closecircle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch} disabled={searching}>
          {searching ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <View style={styles.resultsContainer}>
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.resultItem} onPress={() => handleSelectResult(item)}>
                <AntDesign name="enviromento" size={18} color="#2563EB" />
                <Text style={styles.resultText} numberOfLines={2}>
                  {item.displayName}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={mapRegion}
          onRegionChangeComplete={setMapRegion}
          onPress={handleMapPress}
          onLongPress={handleMapPress}
          showsUserLocation
        >
          {markerCoordinate && (
            <Marker
              coordinate={markerCoordinate}
              title={selectedLocation?.name || 'Selected Location'}
              description={selectedLocation?.address || 'Custom location'}
              pinColor="#2563EB"
              draggable
              onDragEnd={(event) => {
                const { latitude, longitude } = event.nativeEvent.coordinate;
                setSelectedLocation((prev) => ({
                  latitude,
                  longitude,
                  address: prev?.address,
                  name: prev?.name,
                }));
              }}
            />
          )}
        </MapView>

        <View style={styles.mapOverlay}>
          <TouchableOpacity
            style={styles.locateButton}
            onPress={fetchCurrentLocation}
            disabled={isFetchingLocation}
          >
            {isFetchingLocation ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Ionicons name="locate" size={20} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerTitle}>Selected Location</Text>
        {selectedLocation ? (
          <>
            <Text style={styles.footerText}>
              Latitude:{' '}
              {typeof selectedLocation.latitude === 'number' && Number.isFinite(selectedLocation.latitude)
                ? selectedLocation.latitude.toFixed(6)
                : 'Not set'}
            </Text>
            <Text style={styles.footerText}>
              Longitude:{' '}
              {typeof selectedLocation.longitude === 'number' && Number.isFinite(selectedLocation.longitude)
                ? selectedLocation.longitude.toFixed(6)
                : 'Not set'}
            </Text>
            {selectedLocation.address ? (
              <Text style={styles.footerAddress} numberOfLines={2}>
                {selectedLocation.address}
              </Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.helperText}>Search or long press on the map to drop a pin.</Text>
        )}
        <TouchableOpacity
          style={[styles.confirmButton, confirming && styles.confirmButtonDisabled]}
          onPress={() => {
            if (!confirming) {
              handleConfirm();
            }
          }}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.confirmButtonText}>Use This Location</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 14,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  confirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2563EB',
  },
  confirmTextDisabled: {
    opacity: 0.6,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
  },
  searchButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsContainer: {
    maxHeight: 180,
    backgroundColor: 'white',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  locateButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  footerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  footerText: {
    fontSize: 14,
    color: '#1F2937',
  },
  footerAddress: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
  },
  confirmButton: {
    marginTop: 12,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LocationPickerScreen;

