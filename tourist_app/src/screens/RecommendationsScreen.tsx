import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useSelector } from 'react-redux';
import { selectUser } from '../store/selectors';
import recommendationService, { RecommendedSpot, RecommendedPackage } from '../services/recommendationService';
import { useNavigation } from '@react-navigation/native';

interface Recommendation {
  spot_id?: string;
  package_id?: string;
  name: string;
  score: number;
  rating?: number;
  categories?: string[];
  price?: number;
  destinations?: string[];
}

const RecommendationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useSelector(selectUser);
  const [spotRecommendations, setSpotRecommendations] = useState<RecommendedSpot[]>([]);
  const [packageRecommendations, setPackageRecommendations] = useState<RecommendedPackage[]>([]);
  const [trendingSpots, setTrendingSpots] = useState<RecommendedSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [useAI, setUseAI] = useState(true);

  useEffect(() => {
    fetchRecommendations();
  }, [useAI]);

  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      // Fetch personalized spot recommendations
      const spotsResponse = await recommendationService.getPersonalizedSpots(useAI, 10);
      if (spotsResponse.success && spotsResponse.data) {
        setSpotRecommendations(spotsResponse.data);
      }

      // Fetch personalized package recommendations
      const packagesResponse = await recommendationService.getPersonalizedPackages(useAI, 10);
      if (packagesResponse.success && packagesResponse.data) {
        setPackageRecommendations(packagesResponse.data);
      }

      // Fetch trending spots
      const trendingResponse = await recommendationService.getTrendingSpots(5);
      if (trendingResponse.success && trendingResponse.data) {
        setTrendingSpots(trendingResponse.data);
      }
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleSpotPress = (spotId: string, spotName: string) => {
    (navigation as any).navigate('SpotDetails', {
      spotId,
      title: spotName
    });
  };

  const handlePackagePress = (packageId: string) => {
    (navigation as any).navigate('PackageDetails', {
      packageId
    });
  };

  const renderSpotRecommendation = (spot: RecommendedSpot, index: number) => (
    <TouchableOpacity
      key={`spot-${index}`}
      style={styles.recommendationCard}
      onPress={() => handleSpotPress(spot.id, spot.name)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{spot.name}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            {spot.popularity_score ? `${(spot.popularity_score * 20).toFixed(0)}%` : '⭐'}
          </Text>
        </View>
      </View>

      {spot.rating && (
        <Text style={styles.rating}>⭐ {spot.rating.toFixed(1)}/5</Text>
      )}

      <Text style={styles.destinations}>📍 {spot.location.address}</Text>

      <View style={styles.categoriesContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{spot.category}</Text>
        </View>
        {spot.region && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{spot.region}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPackageRecommendation = (pkg: RecommendedPackage, index: number) => (
    <TouchableOpacity
      key={`package-${index}`}
      style={styles.recommendationCard}
      onPress={() => handlePackagePress(pkg.id)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{pkg.name}</Text>
        <View style={styles.scoreContainer}>
          <Text style={styles.scoreText}>
            ⭐ {(pkg.average_rating || pkg.rating || 0).toFixed(1)}
          </Text>
        </View>
      </View>

      <Text style={styles.price}>💰 Rs. {pkg.price.toLocaleString()}</Text>
      <Text style={styles.packageDuration}>🕒 {pkg.duration_days} days</Text>

      <View style={styles.categoriesContainer}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{pkg.category}</Text>
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{pkg.difficulty_level}</Text>
        </View>
      </View>

      <Text style={styles.packageParticipants}>
        👥 {pkg.current_participants}/{pkg.max_participants} participants
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Recommendations for You</Text>
        <View style={styles.aiToggleContainer}>
          <Text style={styles.aiToggleLabel}>AI-Powered</Text>
          <Switch
            value={useAI}
            onValueChange={setUseAI}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={useAI ? '#007AFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Personalized Spots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🎯 Recommended Tourist Spots {useAI && '(AI)'}
        </Text>
        {spotRecommendations.length > 0 ? (
          spotRecommendations.slice(0, 5).map(renderSpotRecommendation)
        ) : (
          <Text style={styles.emptyText}>No spot recommendations available</Text>
        )}
      </View>

      {/* Personalized Packages */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          🎒 Recommended Tour Packages {useAI && '(AI)'}
        </Text>
        {packageRecommendations.length > 0 ? (
          packageRecommendations.slice(0, 5).map(renderPackageRecommendation)
        ) : (
          <Text style={styles.emptyText}>No package recommendations available</Text>
        )}
      </View>

      {/* Trending Spots */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔥 Trending Destinations</Text>
        {trendingSpots.length > 0 ? (
          trendingSpots.map((spot, index) => (
            <TouchableOpacity
              key={`trending-${index}`}
              style={[styles.recommendationCard, styles.trendingCard]}
              onPress={() => handleSpotPress(spot.id, spot.name)}
            >
              <Text style={styles.cardTitle}>{spot.name}</Text>
              {spot.rating && (
                <Text style={styles.rating}>⭐ {spot.rating.toFixed(1)}/5</Text>
              )}
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>No trending spots available</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.refreshButton}
        onPress={fetchRecommendations}
      >
        <Text style={styles.refreshButtonText}>🔄 Refresh Recommendations</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  aiToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiToggleLabel: {
    color: '#fff',
    marginRight: 8,
    fontSize: 14,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  recommendationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  trendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B6B',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scoreContainer: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scoreText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rating: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    color: '#28a745',
    fontWeight: 'bold',
    marginBottom: 4,
  },
  destinations: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  categoryBadge: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#495057',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  packageDuration: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  packageParticipants: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
});

export default RecommendationsScreen;
