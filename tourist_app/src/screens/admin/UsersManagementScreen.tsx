import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { AdminService, AdminUserItem } from '@/services/adminService';
import { UserRole } from '@/types';
import { useNavigation } from '@react-navigation/native';

const roleOptions: Array<{ label: string; value?: UserRole | 'all' }> = [
  { label: 'All', value: 'all' as any },
  { label: 'Tourists', value: UserRole.TOURIST },
  { label: 'Companies', value: UserRole.TRAVEL_COMPANY },
  { label: 'Admins', value: UserRole.ADMIN },
];

const UsersManagementScreen: React.FC<any> = ({ route }) => {
  const navigation = useNavigation();
  const initialFilter = route?.params?.filter || {};
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [pendingCompaniesCount, setPendingCompaniesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | undefined>(initialFilter.role);
  const [isActive, setIsActive] = useState<boolean | undefined>(initialFilter.is_active);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminService.getUsers({ search, role, is_active: isActive, limit: 50 });
      setUsers(res.users);
    } catch (err) {
      console.error('AdminService.getUsers failed', err);
      Alert.alert('Error', 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, role, isActive]);

  const loadPendingCompaniesCount = useCallback(async () => {
    try {
      const res = await AdminService.getUsers({ 
        role: UserRole.TRAVEL_COMPANY, 
        is_active: false, 
        limit: 100 
      });
      setPendingCompaniesCount(res.users.length);
    } catch (err) {
      console.error('Failed to load pending companies count', err);
    }
  }, []);

  useEffect(() => {
    load();
    loadPendingCompaniesCount();
  }, [load, loadPendingCompaniesCount]);

  const toggleActive = async (user: AdminUserItem) => {
    try {
      const newStatus = !user.is_active;
      await AdminService.updateUserStatus(user.id, newStatus);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_active: newStatus } : u)));
      
      // If this was a company approval, refresh count
      if (user.role === UserRole.TRAVEL_COMPANY) {
        loadPendingCompaniesCount();
      }
    } catch (err) {
      console.error('Failed to update user status', err);
      Alert.alert('Error', 'Could not update user status');
    }
  };

  const deleteUser = async (user: AdminUserItem) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${user.full_name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteUser(user.id);
              setUsers((prev) => prev.filter((u) => u.id !== user.id));
              Alert.alert('Success', `${user.full_name} has been deleted.`);
            } catch (err) {
              console.error('Failed to delete user', err);
              Alert.alert('Error', 'Could not delete user');
            }
          }
        }
      ]
    );
  };

  const getRoleColor = (userRole: string) => {
    switch (userRole) {
      case UserRole.ADMIN:
      case 'admin':
        return '#EF4444';
      case UserRole.TRAVEL_COMPANY:
      case 'travel_company':
        return '#3B82F6';
      case UserRole.TOURIST:
      case 'tourist':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getRoleLabel = (userRole: string) => {
    switch (userRole) {
      case UserRole.ADMIN:
      case 'admin':
        return 'Admin';
      case UserRole.TRAVEL_COMPANY:
      case 'travel_company':
        return 'Travel Company';
      case UserRole.TOURIST:
      case 'tourist':
        return 'Tourist';
      default:
        return userRole;
    }
  };

  const renderUserItem = ({ item }: { item: AdminUserItem }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.full_name}</Text>
        <Text style={styles.userEmail}>{item.email}</Text>
        <View style={styles.userMeta}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.roleText}>{getRoleLabel(item.role)}</Text>
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={[styles.statusText, item.is_active ? styles.activeText : styles.inactiveText]}>
              {item.is_active ? 'Active' : 'Inactive'}
            </Text>
          </View>
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, item.is_active ? styles.blockButton : styles.unblockButton]}
          onPress={() => toggleActive(item)}
        >
          <AntDesign 
            name={item.is_active ? "pausecircleo" : "playcircleo"} 
            size={16} 
            color="white" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteUser(item)}
        >
          <AntDesign name="delete" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const navigateToCompanyApprovals = () => {
    (navigation as any).navigate('CompanyApprovals');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Users Management</Text>
      </View>

      {/* Company Approvals Banner */}
      {pendingCompaniesCount > 0 && (
        <TouchableOpacity style={styles.pendingBanner} onPress={navigateToCompanyApprovals}>
          <View style={styles.pendingContent}>
            <AntDesign name="exclamationcircle" size={20} color="#F59E0B" />
            <View style={styles.pendingText}>
              <Text style={styles.pendingTitle}>Pending Company Approvals</Text>
              <Text style={styles.pendingSubtitle}>
                {pendingCompaniesCount} travel compan{pendingCompaniesCount === 1 ? 'y' : 'ies'} awaiting approval
              </Text>
            </View>
          </View>
          <AntDesign name="right" size={16} color="#6B7280" />
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={20} color="#6B7280" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Role Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {roleOptions.map((option) => (
          <TouchableOpacity
            key={option.label}
            style={[
              styles.filterChip,
              (role === option.value || (!role && option.value === 'all')) && styles.activeFilterChip
            ]}
            onPress={() => setRole(option.value === 'all' ? undefined : option.value as UserRole)}
          >
            <Text style={[
              styles.filterText,
              (role === option.value || (!role && option.value === 'all')) && styles.activeFilterText
            ]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Users List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={renderUserItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <AntDesign name="user" size={48} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>No Users Found</Text>
              <Text style={styles.emptySubtitle}>
                {search ? 'Try adjusting your search or filters' : 'No users match your current filters'}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  pendingBanner: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pendingText: {
    marginLeft: 12,
    flex: 1,
  },
  pendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 2,
  },
  pendingSubtitle: {
    fontSize: 14,
    color: '#B45309',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  filterContainer: {
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 16,
  },
  filterChip: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minWidth: 70,
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
  },
  activeFilterChip: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeFilterText: {
    color: 'white',
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: '#059669',
  },
  inactiveText: {
    color: '#DC2626',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockButton: {
    backgroundColor: '#EF4444',
  },
  unblockButton: {
    backgroundColor: '#10B981',
  },
  deleteButton: {
    backgroundColor: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});

export default UsersManagementScreen;
