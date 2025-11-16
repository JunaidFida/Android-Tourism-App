import React from 'react';
import { View, StyleSheet, Text, ScrollView, TouchableOpacity } from 'react-native';

interface MapSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  category?: string;
}

interface SimpleMapViewProps {
  spots: MapSpot[];
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  onSpotPress?: (spotId: string) => void;
  showNavigation?: boolean;
}

const SimpleMapView: React.FC<SimpleMapViewProps> = ({
  spots,
  userLocation,
  onSpotPress,
  showNavigation = false
}) => {
  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'historical': return '#8B4513';
      case 'natural': return '#228B22';
      case 'adventure': return '#FF4500';
      case 'religious': return '#4169E1';
      case 'cultural': return '#9932CC';
      default: return '#FF6B6B';
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Tourist Spots Map</Text>
        {userLocation && (
          <Text style={styles.locationText}>
            📍 Your Location: {userLocation.latitude.toFixed(4)}, {userLocation.longitude.toFixed(4)}
          </Text>
        )}
      </View>
      
      <ScrollView style={styles.spotsList}>
        {spots.map((spot) => {
          const distance = userLocation 
            ? calculateDistance(userLocation.latitude, userLocation.longitude, spot.latitude, spot.longitude)
            : null;
          
          return (
            <TouchableOpacity
              key={spot.id}
              style={[styles.spotCard, { borderLeftColor: getCategoryColor(spot.category) }]}
              onPress={() => onSpotPress?.(spot.id)}
            >
              <View style={styles.spotHeader}>
                <Text style={styles.spotName}>{spot.name}</Text>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(spot.category) }]}>
                  <Text style={styles.categoryText}>{spot.category || 'general'}</Text>
                </View>
              </View>
              
              <Text style={styles.coordinates}>
                📍 {spot.latitude.toFixed(4)}, {spot.longitude.toFixed(4)}
              </Text>
              
              {distance && (
                <Text style={styles.distance}>
                  🚗 {distance.toFixed(1)} km away
                </Text>
              )}
              
              {showNavigation && (
                <Text style={styles.navigationText}>🧭 Navigation Active</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {spots.length} tourist spots • Tap any spot for details
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 16,
    paddingTop: 50,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  locationText: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.9,
  },
  spotsList: {
    flex: 1,
    padding: 16,
  },
  spotCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  spotName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  coordinates: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  distance: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  navigationText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: 'bold',
    marginTop: 4,
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default SimpleMapView;
