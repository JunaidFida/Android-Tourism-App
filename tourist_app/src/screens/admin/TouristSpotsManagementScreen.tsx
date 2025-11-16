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
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../../config/api';

interface TouristSpot {
  id: string;
  name: string;
  description: string;
  location: {
    latitude: number;
    longitude: number;
    address: string;
  };
  categories: string[];
  status: 'pending' | 'approved' | 'rejected';
  company_id: string;
  company_name: string;
  created_at: string;
  rating: number;
  review_count: number;
  entry_fee: number;
}

const TouristSpotsManagementScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const loadSpots = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const params = new URLSearchParams();
      
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const url = buildApiUrl(`/admin/tourist-spots?${params.toString()}`);
      console.log('Loading spots from:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Received spots data:', data);
        // Backend returns { spots: [...] }
        const spotsArray = data.spots || data || [];
        setSpots(spotsArray);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Failed to load spots:', errorData);
        Alert.alert('Error', errorData.detail || 'Failed to load tourist spots');
      }
    } catch (error) {
      console.error('Error loading spots:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSpots();
  }, [search, statusFilter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSpots();
  };

  const updateSpotStatus = async (spotId: string, status: 'approved' | 'rejected', reason?: string) => {
    if (!spotId || spotId === 'undefined') {
      Alert.alert('Error', 'Invalid spot ID');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      const endpoint = status === 'approved' 
        ? `/admin/tourist-spots/${spotId}/approve`
        : `/admin/tourist-spots/${spotId}/reject`;
      
      const response = await fetch(buildApiUrl(endpoint), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSpots(prev => prev.map(spot => 
          spot.id === spotId ? { ...spot, status } : spot
        ));
        Alert.alert('Success', `Tourist spot ${status} successfully`);
        loadSpots(); // Reload to get updated data
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.detail || 'Failed to update spot status');
      }
    } catch (error) {
      console.error('Error updating spot status:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const deleteSpot = async (spotId: string) => {
    if (!spotId || spotId === 'undefined' || spotId === 'null') {
      Alert.alert('Error', 'Invalid spot ID');
      return;
    }
    
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/admin/tourist-spots/${spotId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setSpots(prev => prev.filter(spot => spot.id !== spotId));
        Alert.alert('Success', 'Tourist spot deleted successfully');
        loadSpots(); // Reload to get updated list
      } else {
        const errorData = await response.json().catch(() => ({}));
        Alert.alert('Error', errorData.detail || 'Failed to delete spot');
      }
    } catch (error) {
      console.error('Error deleting spot:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const showSpotActions = (spot: TouristSpot) => {
    const actions = [
      { text: 'Cancel', style: 'cancel' as const },
      {
        text: 'View Details',
        onPress: () => {
          setSelectedSpot(spot);
          setShowDetailsModal(true);
        }
      }
    ];

    if (spot.status === 'pending') {
      actions.push(
        {
          text: 'Approve',
          onPress: () => updateSpotStatus(spot.id, 'approved')
        },
        {
          text: 'Reject',
          onPress: () => {
            Alert.prompt(
              'Reject Tourist Spot',
              'Please provide a reason for rejection:',
              (reason) => {
                if (reason) {
                  updateSpotStatus(spot.id, 'rejected', reason);
                }
              }
            );
          }
        }
      );
    }

    actions.push({
      text: 'Delete',
      style: 'destructive' as const,
      onPress: () => {
        Alert.alert(
          'Delete Tourist Spot',
          `Are you sure you want to permanently delete "${spot.name}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deleteSpot(spot.id)
            }
          ]
        );
      }
    });

    Alert.alert('Tourist Spot Actions', `Select an action for "${spot.name}"`, actions);
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
      case 'pending': return 'Pending';
      case 'rejected': return 'Rejected';
      default: return status;
    }
  };

  const renderSpotItem = ({ item }: { item: TouristSpot }) => (
    <TouchableOpacity style={styles.spotCard} onPress={() => showSpotActions(item)}>
      <View style={styles.spotHeader}>
        <View style={styles.spotInfo}>
          <Text style={styles.spotName}>{item.name}</Text>
          <Text style={styles.companyName}>by {item.company_name}</Text>
          <Text style={styles.spotLocation}>{item.location.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>
      </View>

      <Text style={styles.spotDescription} numberOfLines={2}>
        {item.description}
      </Text>

      <View style={styles.spotMeta}>
        <View style={styles.ratingContainer}>
          <AntDesign name="star" size={14} color="#F59E0B" />
          <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          <Text style={styles.reviewCount}>({item.review_count})</Text>
        </View>
        <Text style={styles.entryFee}>${item.entry_fee}</Text>
      </View>

      <View style={styles.spotCategories}>
        {item.categories.slice(0, 3).map((category, index) => (
          <View key={index} style={styles.categoryTag}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ))}
        {item.categories.length > 3 && (
          <Text style={styles.moreCategories}>+{item.categories.length - 3}</Text>
        )}
      </View>

      <AntDesign name="right" size={16} color="#9CA3AF" style={styles.chevron} />
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Tourist Spot Details</Text>
          <TouchableOpacity onPress={() => setShowDetailsModal(false)}>
            <AntDesign name="close" size={24} color="#111827" />
          </TouchableOpacity>
        </View>

        {selectedSpot && (
          <ScrollView style={styles.modalContent}>
            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Basic Information</Text>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={styles.detailValue}>{selectedSpot.name}</Text>
              
              <Text style={styles.detailLabel}>Company:</Text>
              <Text style={styles.detailValue}>{selectedSpot.company_name}</Text>
              
              <Text style={styles.detailLabel}>Description:</Text>
              <Text style={styles.detailValue}>{selectedSpot.description}</Text>
              
              <Text style={styles.detailLabel}>Entry Fee:</Text>
              <Text style={styles.detailValue}>${selectedSpot.entry_fee}</Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Location</Text>
              <Text style={styles.detailLabel}>Address:</Text>
              <Text style={styles.detailValue}>{selectedSpot.location.address}</Text>
              
              <Text style={styles.detailLabel}>Coordinates:</Text>
              <Text style={styles.detailValue}>
                {selectedSpot.location.latitude.toFixed(6)}, {selectedSpot.location.longitude.toFixed(6)}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Categories</Text>
              <View style={styles.categoriesGrid}>
                {selectedSpot.categories.map((category, index) => (
                  <View key={index} style={styles.categoryTag}>
                    <Text style={styles.categoryText}>{category}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.detailTitle}>Status & Rating</Text>
              <View style={styles.statusRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedSpot.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(selectedSpot.status)}</Text>
                </View>
              </View>
              
              <View style={styles.ratingRow}>
                <Text style={styles.detailLabel}>Rating:</Text>
                <View style={styles.ratingContainer}>
                  <AntDesign name="star" size={16} color="#F59E0B" />
                  <Text style={styles.rating}>{selectedSpot.rating.toFixed(1)}</Text>
                  <Text style={styles.reviewCount}>({selectedSpot.review_count} reviews)</Text>
                </View>
              </View>
            </View>

            {selectedSpot.status === 'pending' && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => {
                    updateSpotStatus(selectedSpot.id, 'approved');
                    setShowDetailsModal(false);
                  }}
                >
                  <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => {
                    setShowDetailsModal(false);
                    Alert.prompt(
                      'Reject Tourist Spot',
                      'Please provide a reason for rejection:',
                      (reason) => {
                        if (reason) {
                          updateSpotStatus(selectedSpot.id, 'rejected', reason);
                        }
                      }
                    );
                  }}
                >
                  <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <AntDesign name="enviromento" size={64} color="#D1D5DB" />
      <Text style={styles.emptyTitle}>No Tourist Spots Found</Text>
      <Text style={styles.emptyDescription}>
        {statusFilter === 'pending' 
          ? 'No pending tourist spots to review'
          : 'No tourist spots match your current filters'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading tourist spots...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tourist Spots Management</Text>
        <TouchableOpacity onPress={loadSpots}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search tourist spots..."
          value={search}
          onChangeText={setSearch}
        />
        
        <View style={styles.statusFilters}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterChip,
                statusFilter === status && styles.filterChipActive
              ]}
              onPress={() => setStatusFilter(status)}
            >
              <Text style={[
                styles.filterChipText,
                statusFilter === status && styles.filterChipTextActive
              ]}>
                {status === 'all' ? 'All' : getStatusText(status)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.filter(s => s.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.filter(s => s.status === 'approved').length}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{spots.filter(s => s.status === 'rejected').length}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
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

      {renderDetailsModal()}
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
  filters: {
    backgroundColor: 'white',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  statusFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
    marginBottom: 8,
  },
  filterChipActive: {
    backgroundColor: '#3B82F6',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterChipTextActive: {
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
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
  companyName: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 4,
  },
  spotLocation: {
    fontSize: 14,
    color: '#6B7280',
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
  spotMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  entryFee: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
  },
  spotCategories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
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
  chevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -8,
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
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
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
  detailTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginTop: 8,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#111827',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10B981',
  },
  rejectButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default TouristSpotsManagementScreen;