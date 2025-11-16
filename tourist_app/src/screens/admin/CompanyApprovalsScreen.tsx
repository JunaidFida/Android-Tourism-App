import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { AdminService } from '../../services/adminService';
import { CommonStyles, createRoleStyles } from '../../theme/styles';
import { Colors } from '../../theme/colors';

interface PendingCompany {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  created_at: string;
  is_active: boolean;
}

const CompanyApprovalsScreen: React.FC = () => {
  const roleStyles = createRoleStyles('admin');
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPendingCompanies();
  }, []);

  const loadPendingCompanies = async () => {
    try {
      // Load actual pending companies from the API
      const response = await AdminService.getUsers({ role: 'travel_company' as any, is_active: false });
      const pendingCompanies = response.users
        .filter(user => !user.is_active)
        .map((user: any) => ({
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          phone_number: user.phone_number,
          created_at: user.created_at,
          is_active: user.is_active,
        }));
      setPendingCompanies(pendingCompanies);
    } catch (error) {
      console.error('Error loading pending companies:', error);
      setPendingCompanies([]);
      Alert.alert('Error', 'Failed to load pending companies');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPendingCompanies();
  };

  const handleApprove = async (companyId: string, companyName: string) => {
    Alert.alert(
      'Approve Company',
      `Are you sure you want to approve ${companyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              // Call the actual API to approve the company
              await AdminService.updateUserStatus(companyId, true);
              setPendingCompanies(prev => prev.filter(company => company.id !== companyId));
              Alert.alert('Success', `${companyName} has been approved`);
            } catch (error) {
              Alert.alert('Error', 'Failed to approve company');
            }
          },
        },
      ]
    );
  };

  const handleReject = async (companyId: string, companyName: string) => {
    Alert.alert(
      'Reject Company',
      `Are you sure you want to reject ${companyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              // Call the actual API to delete/reject the company
              await AdminService.deleteUser(companyId);
              setPendingCompanies(prev => prev.filter(company => company.id !== companyId));
              Alert.alert('Success', `${companyName} has been rejected`);
            } catch (error) {
              Alert.alert('Error', 'Failed to reject company');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={CommonStyles.loading}>
        <ActivityIndicator size="large" color={Colors.admin.primary} />
        <Text style={CommonStyles.loadingText}>Loading pending approvals...</Text>
      </View>
    );
  }

  return (
    <View style={CommonStyles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Company Approvals</Text>
        <TouchableOpacity onPress={loadPendingCompanies}>
          <AntDesign name="reload1" size={22} color={Colors.admin.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        style={styles.content}
      >
        {pendingCompanies.length === 0 ? (
          <View style={styles.emptyState}>
            <AntDesign name="checkcircleo" size={64} color={Colors.neutral[400]} />
            <Text style={styles.emptyTitle}>No Pending Approvals</Text>
            <Text style={styles.emptySubtitle}>All companies have been reviewed</Text>
          </View>
        ) : (
          pendingCompanies.map((company) => (
            <View key={company.id} style={styles.companyCard}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.full_name}</Text>
                <Text style={styles.companyEmail}>{company.email}</Text>
                <Text style={styles.companyPhone}>{company.phone_number}</Text>
                <Text style={styles.companyDate}>
                  Applied: {new Date(company.created_at).toLocaleDateString()}
                </Text>
              </View>

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApprove(company.id, company.full_name)}
                >
                  <AntDesign name="check" size={16} color="white" />
                  <Text style={styles.approveButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleReject(company.id, company.full_name)}
                >
                  <AntDesign name="close" size={16} color="white" />
                  <Text style={styles.rejectButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.neutral[900],
  },
  content: {
    flex: 1,
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  companyCard: {
    backgroundColor: Colors.neutral[0],
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
  companyInfo: {
    marginBottom: 16,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  companyEmail: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 2,
  },
  companyPhone: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: 2,
  },
  companyDate: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: Colors.success[500],
  },
  rejectButton: {
    backgroundColor: Colors.error[500],
  },
  approveButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  rejectButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});

export default CompanyApprovalsScreen;