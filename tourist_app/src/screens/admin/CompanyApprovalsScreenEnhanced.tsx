import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  Alert, 
  RefreshControl,
  SafeAreaView,
  Modal,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { AdminService, AdminUserItem } from '../../services/adminService';
import { UserRole } from '../../types';
import { useNavigation } from '@react-navigation/native';
import { CommonStyles, createRoleStyles } from '../../theme/styles';
import { Colors } from '../../theme/colors';

const CompanyApprovalsScreenEnhanced: React.FC = () => {
  const navigation = useNavigation();
  const roleStyles = createRoleStyles('admin');
  const [pendingCompanies, setPendingCompanies] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<AdminUserItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadPendingCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AdminService.getUsers({ 
        role: UserRole.TRAVEL_COMPANY, 
        is_active: false, 
        limit: 100 
      });
      setPendingCompanies(res.users);
    } catch (err) {
      console.error('AdminService.getPendingCompanies failed', err);
      Alert.alert('Error', 'Failed to load pending companies');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPendingCompanies();
    setRefreshing(false);
  }, [loadPendingCompanies]);

  useEffect(() => {
    loadPendingCompanies();
  }, [loadPendingCompanies]);

  const loadCompanyDetails = async (company: AdminUserItem) => {
    setLoadingDetails(true);
    try {
      const details = await AdminService.getUserDetails(company.id);
      setCompanyDetails(details);
    } catch (error) {
      console.error('Failed to load company details:', error);
      Alert.alert('Error', 'Failed to load company details');
    } finally {
      setLoadingDetails(false);
    }
  };

  const showCompanyDetails = async (company: AdminUserItem) => {
    setSelectedCompany(company);
    setShowDetailsModal(true);
    await loadCompanyDetails(company);
  };

  const approveCompany = async (company: AdminUserItem) => {
    Alert.alert(
      'Approve Travel Company',
      `Are you sure you want to approve "${company.full_name}" as a travel company?\n\nThey will be able to:\n• Log into their account\n• Create and manage tour packages\n• Receive bookings from tourists\n• Access company dashboard and analytics`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              await AdminService.updateUserStatus(company.id, true);
              setPendingCompanies((prev) => prev.filter((u) => u.id !== company.id));
              setShowDetailsModal(false);
              Alert.alert(
                'Company Approved!', 
                `${company.full_name} has been successfully approved as a travel company. They can now log in and start creating tour packages.`
              );
            } catch (err) {
              console.error('Failed to approve company', err);
              Alert.alert('Error', 'Could not approve company. Please try again.');
            }
          }
        }
      ]
    );
  };

  const rejectCompany = async (company: AdminUserItem) => {
    Alert.alert(
      'Reject Travel Company Application',
      `Are you sure you want to reject "${company.full_name}"'s travel company application?\n\n⚠️ This will permanently delete their account and they will need to register again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AdminService.deleteUser(company.id);
              setPendingCompanies((prev) => prev.filter((u) => u.id !== company.id));
              setShowDetailsModal(false);
              Alert.alert('Application Rejected', `${company.full_name}'s application has been rejected and their account deleted.`);
            } catch (err) {
              console.error('Failed to reject company', err);
              Alert.alert('Error', 'Could not reject company application. Please try again.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const renderCompanyItem = ({ item }: { item: AdminUserItem }) => (
    <TouchableOpacity 
      style={styles.companyCard}
      onPress={() => showCompanyDetails(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{item.full_name}</Text>
          <Text style={styles.companyEmail}>{item.email}</Text>
          {item.phone_number && (
            <Text style={styles.companyPhone}>📞 {item.phone_number}</Text>
          )}
        </View>
        <View style={styles.pendingBadge}>
          <Text style={styles.pendingText}>PENDING</Text>
        </View>
      </View>
      
      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <AntDesign name="calendar" size={16} color={Colors.neutral[500]} />
          <Text style={styles.detailText}>Applied: {formatDate(item.created_at || '')}</Text>
        </View>
        <View style={styles.detailRow}>
          <AntDesign name="idcard" size={16} color={Colors.neutral[500]} />
          <Text style={styles.detailText}>ID: {item.id.slice(-8).toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.tapHint}>
        <Text style={styles.tapHintText}>Tap to view details and approve</Text>
        <AntDesign name="right" size={16} color={Colors.neutral[400]} />
      </View>
    </TouchableOpacity>
  );

  const renderDetailsModal = () => (
    <Modal
      visible={showDetailsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowDetailsModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setShowDetailsModal(false)}
          >
            <AntDesign name="close" size={24} color={Colors.neutral[700]} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Company Application</Text>
          <View style={{ width: 24 }} />
        </View>

        {selectedCompany && (
          <ScrollView style={styles.modalContent}>
            {/* Company Basic Info */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Company Information</Text>
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <AntDesign name="user" size={20} color={Colors.company.primary} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Company Name</Text>
                    <Text style={styles.detailValue}>{selectedCompany.full_name}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <AntDesign name="mail" size={20} color={Colors.company.primary} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Email Address</Text>
                    <Text style={styles.detailValue}>{selectedCompany.email}</Text>
                  </View>
                </View>
                
                {selectedCompany.phone_number && (
                  <View style={styles.detailRow}>
                    <AntDesign name="phone" size={20} color={Colors.company.primary} />
                    <View style={styles.detailTextContainer}>
                      <Text style={styles.detailLabel}>Phone Number</Text>
                      <Text style={styles.detailValue}>{selectedCompany.phone_number}</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <AntDesign name="calendar" size={20} color={Colors.company.primary} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Application Date</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedCompany.created_at || '')}</Text>
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <AntDesign name="idcard" size={20} color={Colors.company.primary} />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Company ID</Text>
                    <Text style={styles.detailValue}>{selectedCompany.id}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Additional Details */}
            {loadingDetails ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.company.primary} />
                <Text style={styles.loadingText}>Loading company details...</Text>
              </View>
            ) : companyDetails && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Additional Information</Text>
                <View style={styles.detailCard}>
                  {companyDetails.preferences && (
                    <View style={styles.detailRow}>
                      <AntDesign name="setting" size={20} color={Colors.company.primary} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Preferences Set</Text>
                        <Text style={styles.detailValue}>Yes</Text>
                      </View>
                    </View>
                  )}
                  
                  {companyDetails.profile_picture && (
                    <View style={styles.detailRow}>
                      <AntDesign name="picture" size={20} color={Colors.company.primary} />
                      <View style={styles.detailTextContainer}>
                        <Text style={styles.detailLabel}>Profile Picture</Text>
                        <Text style={styles.detailValue}>Provided</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Approval Information */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>After Approval</Text>
              <View style={styles.approvalInfoCard}>
                <Text style={styles.approvalTitle}>The company will be able to:</Text>
                <View style={styles.approvalPoint}>
                  <AntDesign name="check" size={16} color={Colors.success[600]} />
                  <Text style={styles.approvalPointText}>Log into their company account</Text>
                </View>
                <View style={styles.approvalPoint}>
                  <AntDesign name="check" size={16} color={Colors.success[600]} />
                  <Text style={styles.approvalPointText}>Create and manage tour packages</Text>
                </View>
                <View style={styles.approvalPoint}>
                  <AntDesign name="check" size={16} color={Colors.success[600]} />
                  <Text style={styles.approvalPointText}>Receive bookings from tourists</Text>
                </View>
                <View style={styles.approvalPoint}>
                  <AntDesign name="check" size={16} color={Colors.success[600]} />
                  <Text style={styles.approvalPointText}>Access company dashboard and analytics</Text>
                </View>
                <View style={styles.approvalPoint}>
                  <AntDesign name="check" size={16} color={Colors.success[600]} />
                  <Text style={styles.approvalPointText}>Manage tourist spots and locations</Text>
                </View>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={() => rejectCompany(selectedCompany)}
              >
                <AntDesign name="close" size={20} color="white" />
                <Text style={styles.rejectButtonText}>Reject Application</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.approveButton}
                onPress={() => approveCompany(selectedCompany)}
              >
                <AntDesign name="check" size={20} color="white" />
                <Text style={styles.approveButtonText}>Approve Company</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <AntDesign name="checkcircleo" size={64} color={Colors.success[500]} />
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptySubtitle}>
        No pending travel company applications at the moment.
      </Text>
      <TouchableOpacity style={styles.refreshEmptyButton} onPress={onRefresh}>
        <AntDesign name="reload1" size={20} color={Colors.primary[600]} />
        <Text style={styles.refreshEmptyText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={[CommonStyles.header, roleStyles.headerGradient]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <AntDesign name="arrowleft" size={24} color={Colors.neutral[0]} />
        </TouchableOpacity>
        <Text style={[CommonStyles.headerTitle, { color: Colors.neutral[0] }]}>Company Approvals</Text>
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
        >
          <AntDesign name="reload1" size={20} color={Colors.neutral[0]} />
        </TouchableOpacity>
      </View>

      {pendingCompanies.length > 0 && (
        <View style={styles.statsBar}>
          <View style={roleStyles.statCard}>
            <Text style={[styles.statNumber, roleStyles.primaryText]}>{pendingCompanies.length}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>
        </View>
      )}

      <FlatList
        data={pendingCompanies}
        keyExtractor={(item) => item.id}
        renderItem={renderCompanyItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading ? renderEmptyState : null}
      />

      {renderDetailsModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  companyCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  companyEmail: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  companyPhone: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  pendingBadge: {
    backgroundColor: Colors.warning[100],
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.warning[500],
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.warning[700],
  },
  cardDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginLeft: 8,
  },
  tapHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  tapHintText: {
    fontSize: 14,
    color: Colors.primary[600],
    fontWeight: '500',
  },
  backButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  statsBar: {
    padding: 20,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: Colors.neutral[500],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  refreshEmptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary[100],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  refreshEmptyText: {
    color: Colors.primary[600],
    fontWeight: '600',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  detailSection: {
    marginBottom: 24,
  },
  detailSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 12,
  },
  detailCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  detailTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.neutral[900],
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: Colors.neutral[500],
  },
  approvalInfoCard: {
    backgroundColor: Colors.success[50],
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.success[500],
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success[800],
    marginBottom: 12,
  },
  approvalPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  approvalPointText: {
    fontSize: 14,
    color: Colors.success[700],
    marginLeft: 8,
    flex: 1,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 20,
    paddingBottom: 40,
  },
  rejectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondary[500],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  rejectButtonText: {
    color: Colors.neutral[0],
    fontSize: 16,
    fontWeight: '600',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success[600],
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  approveButtonText: {
    color: Colors.neutral[0],
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompanyApprovalsScreenEnhanced;