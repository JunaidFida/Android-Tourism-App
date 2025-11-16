import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CompanySpotService, { TouristSpot } from '../../services/companySpotService';

const ManageSpotsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSpots = async () => {
    try {
      const result = await CompanySpotService.getCompanySpots();
      if (result.success && result.data) {
        // Ensure data is an array
        const spotsData = Array.isArray(result.data) ? result.data : [];
        setSpots(spotsData);
      } else {
        console.error('Error fetching spots:', result.message);
        setSpots([]); // Set empty array on error
        Alert.alert('Error', result.message || 'Failed to load spots');
      }
    } catch (error) {
      console.error('Error fetching spots:', error);
      setSpots([]); // Set empty array on error
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSpots();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadSpots();
  };

  const handleDeleteSpot = (spot: TouristSpot) => {
    if (!spot.id || spot.id === 'undefined') {
      Alert.alert('Error', 'Invalid spot ID');
      return;
    }
    
    Alert.alert(
      'Delete Tourist Spot',
      `Are you sure you want to delete "${spot.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await CompanySpotService.deleteTouristSpot(spot.id);
            if (result.success) {
              setSpots(prev => prev.filter(s => s.id !== spot.id));
              Alert.alert('Success', 'Tourist spot deleted successfully');
            } else {
              Alert.alert('Error', result.message || 'Failed to delete spot');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#10B981';
      case 'pending': return '#F59E0B';
      case 'rejected': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending Review';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const renderSpotItem = ({ item }: { item: TouristSpot }) => (
    <View style={styles.spotCard}>
      <View style={styles.spotHeader}>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName}>{item.name}</Text>
          <Text style={styles.spotLocation}>{item.location.address}</Text>
          <View style={styles.spotMeta}>
            <View style={styles.ratingContainer}>
              <AntDesign name="star" size={14} color="#F59E0B" />
              <Text style={styles.rating}>{(item.rating || 0).toFixed(1)}</Text>
              <Text style={styles.reviewCount}>({item.review_count || 0} reviews)</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
        </View>
      </View>

      <Text style={styles.spotDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.spotCategories}>
        {Array.isArray(item.categories) && item.categories.slice(0, 3).map((category, index) => (
          <View key={index} style={styles.categoryTag}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ))}
        {Array.isArray(item.categories) && item.categories.length > 3 && (
          <Text style={styles.moreCategories}>+{item.categories.length - 3} more</Text>
        )}
      </View>

      <View style={styles.spotActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => navigation.navigate('EditTouristSpot', { spotId: item.id })}
        >
          <AntDesign name="edit" size={16} color="#3B82F6" />
          <Text style={[styles.actionButtonText, { color: '#3B82F6' }]}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.viewButton]}
          onPress={() => navigation.navigate('SpotDetails', { spotId: item.id })}
        >
          <AntDesign name="eye" size={16} color="#10B981" />
          <Text style={[styles.actionButtonText, { color: '#10B981' }]}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteSpot(item)}
        >
          <AntDesign name="delete" size={16} color="#EF4444" />
          <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <AntDesign name="enviromento" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Tourist Spots Yet</Text>
      <Text style={styles.emptyDescription}>
        Start by adding your first tourist spot to attract visitors
      </Text>
      <TouchableOpacity
        style={styles.addFirstButton}
        onPress={() => navigation.navigate('AddTouristSpot')}
      >
        <Text style={styles.addFirstButtonText}>Add Your First Spot</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading your tourist spots...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Tourist Spots</Text>
        <TouchableOpacity onPress={() => navigation.navigate('AddTouristSpot')}>
          <AntDesign name="plus" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.length}</Text>
          <Text style={styles.statLabel}>Total Spots</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.filter(s => s.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.filter(s => s.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
      </View>

      <FlatList
        data={spots}
        renderItem={renderSpotItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    padding: 20,
  },
  spotCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  spotLocation: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  spotMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'white',
  },
  spotDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  spotCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#374151',
  },
  moreCategories: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  spotActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  editButton: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  viewButton: {
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  deleteButton: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  addFirstButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManageSpotsScreen;