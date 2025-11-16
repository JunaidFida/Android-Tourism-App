import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectTourPackages, selectTourPackagesLoading } from '../../store/selectors';
import { fetchTourPackages } from '../../store/slices/tourPackageSlice';
import { apiService } from '../../services/apiService';
import { TourPackage } from '../../types';

const ManagePackagesScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const packages = useAppSelector(selectTourPackages);
  const loading = useAppSelector(selectTourPackagesLoading);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPackages();
  }, []);

  const loadPackages = async () => {
    try {
      await dispatch(fetchTourPackages({}));
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPackages();
    setRefreshing(false);
  };

  const handleEditPackage = (packageItem: TourPackage) => {
    // Navigate to EditPackage screen with the package ID
    const packageId = (packageItem as any).id || (packageItem as any)._id;
    (navigation as any).navigate('EditPackage', {
      packageId: packageId,
    });
  };

  const handleDeletePackage = (packageItem: TourPackage) => {
    Alert.alert(
      'Delete Package',
      `Are you sure you want to delete "${(packageItem as any).name || (packageItem as any).title}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const id = (packageItem as any).id || (packageItem as any)._id;
              const res = await apiService.deleteTourPackage(id);
              if (!res.success) {
                throw new Error(res.message || 'Failed to delete');
              }
              Alert.alert('Success', 'Package deleted successfully');
              await loadPackages();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete package. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderPackageItem = ({ item }: { item: TourPackage }) => {
    const name = (item as any).name || (item as any).title || 'Untitled';
    const isActive = (item as any).is_active !== undefined ? (item as any).is_active : ((item as any).status ? (item as any).status === 'active' : true);
    const maxParticipants = (item as any).max_participants ?? (item as any).group_size ?? 0;
    return (
      <View style={styles.packageCard}>
        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B981' : '#6B7280' }]}>
            <Text style={styles.statusText}>
              {isActive ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
        <Text style={styles.packageDescription} numberOfLines={2}>
          {item.description}
        </Text>
        <View style={styles.packageDetails}>
          <View style={styles.detailItem}>
            <AntDesign name="pay-circle1" size={16} color="#3B82F6" />
            <Text style={styles.detailText}>Rs. {item.price}</Text>
          </View>
          <View style={styles.detailItem}>
            <AntDesign name="clockcircleo" size={16} color="#3B82F6" />
            <Text style={styles.detailText}>{item.duration_days} days</Text>
          </View>
          <View style={styles.detailItem}>
            <AntDesign name="team" size={16} color="#3B82F6" />
            <Text style={styles.detailText}>
              {(item as any).current_participants ?? 0}/{maxParticipants}
            </Text>
          </View>
        </View>
        <View style={styles.packageActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => handleEditPackage(item)}
          >
            <AntDesign name="edit" size={16} color="white" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={() => handleDeletePackage(item)}
          >
            <AntDesign name="delete" size={16} color="white" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Packages</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddPackage' as never)}
        >
          <AntDesign name="plus" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={packages}
        renderItem={renderPackageItem}
        keyExtractor={(item, index) => (item as any).id || (item as any)._id || String(index)}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <AntDesign name="gift" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Packages Yet</Text>
            <Text style={styles.emptyDescription}>
              Create your first tour package to get started
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => navigation.navigate('AddPackage' as never)}
            >
              <Text style={styles.createButtonText}>Create Package</Text>
            </TouchableOpacity>
          </View>
        }
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
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  addButton: {
    padding: 8,
  },
  listContainer: {
    padding: 20,
  },
  packageCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  packageDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 4,
  },
  packageActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  editButton: {
    backgroundColor: '#3B82F6',
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ManagePackagesScreen;
