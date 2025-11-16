import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

interface MapboxMapProps {
  spots: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    category?: string;
  }>;
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  initialCenter?: {
    latitude: number;
    longitude: number;
  };
  onSpotPress?: (spotId: string) => void;
  showNavigation?: boolean;
  destinationCoords?: [number, number];
}

const MapboxMap: React.FC<MapboxMapProps> = ({
  spots,
  userLocation,
  initialCenter,
  onSpotPress,
  showNavigation = false,
  destinationCoords
}) => {
  const mapRef = useRef<MapView>(null);
  const [routeCoordinates, setRouteCoordinates] = useState<{latitude: number; longitude: number}[]>([]);

  useEffect(() => {
    if (initialCenter && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: initialCenter.latitude,
        longitude: initialCenter.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      }, 1000);
    }
  }, [initialCenter]);

  useEffect(() => {
    if (!initialCenter && userLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      }, 1000);
    }
  }, [userLocation]);

  useEffect(() => {
    if (showNavigation && userLocation && destinationCoords) {
      fetchRoute();
    }
  }, [showNavigation, userLocation, destinationCoords]);

  const fetchRoute = async () => {
    if (!userLocation || !destinationCoords) return;

    try {
      const MAPBOX_ACCESS_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN || 'pk.eyJ1IjoiYXdzc2Jyb29rcyIsImEiOiJjbWJkdHVlaTkwYTBkMm1zNmxtdTcxZXdpIn0.T77g9IrufBfv1OMMQRgqGQ';
      const response = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${userLocation.longitude},${userLocation.latitude};${destinationCoords[0]},${destinationCoords[1]}?geometries=geojson&access_token=${MAPBOX_ACCESS_TOKEN}`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0]) {
        const coordinates = data.routes[0].geometry.coordinates.map((coord: number[]) => ({
          latitude: coord[1],
          longitude: coord[0],
        }));
        setRouteCoordinates(coordinates);
      }
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'historical': return '#8B4513';
      case 'natural': return '#228B22';
      case 'adventure': return '#FF4500';
      case 'religious': return '#4169E1';
      case 'cultural': return '#9932CC';
      case 'destination': return '#2563EB';
      default: return '#FF6B6B';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: initialCenter?.latitude || userLocation?.latitude || 31.5204,
          longitude: initialCenter?.longitude || userLocation?.longitude || 74.3587,
          latitudeDelta: initialCenter ? 0.05 : 0.0922,
          longitudeDelta: initialCenter ? 0.05 : 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Tourist Spot Markers */}
        {spots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{
              latitude: spot.latitude,
              longitude: spot.longitude,
            }}
            title={spot.name}
            pinColor={getCategoryColor(spot.category)}
            onPress={() => onSpotPress?.(spot.id)}
          />
        ))}

        {/* Route Polyline */}
        {showNavigation && routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeColor="#3887be"
            strokeWidth={5}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  userLocationMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  userLocationInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
});

export default MapboxMap;
