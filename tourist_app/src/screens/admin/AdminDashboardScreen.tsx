import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { AdminService, AdminDashboard } from '../../services/adminService';
import { UserRole } from '../../types';
import { CommonStyles, createRoleStyles } from '../../theme/styles';
import { Colors } from '../../theme/colors';

const AdminDashboardScreen: React.FC<any> = ({ navigation }) => {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const dashboardData = await AdminService.getDashboard();
      setData(dashboardData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const Stat: React.FC<{ title: string; value: string | number; icon: any; color: string }> = ({ title, value, icon, color }) => (
    <View style={styles.statCard}> 
      <View style={styles.cardHeader}>
        <AntDesign name={icon} size={20} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );

  // Extracted from nested ternary for clarity
  const renderContent = () => {
    if (loading) {
      return <Text style={styles.loading}>Loading...</Text>;
    }
    if (data) {
      return (
        <>
          <View style={styles.grid}>
            <Stat title="Total Users" value={data.users.total} icon="team" color="#3b82f6" />
            <Stat title="Active Users" value={data.users.active} icon="user" color="#10b981" />
            <Stat title="Tourists" value={data.users.tourists} icon="smileo" color="#6366f1" />
            <Stat title="Companies" value={data.users.companies} icon="bank" color="#f59e0b" />
            <Stat title="Admins" value={data.users.admins} icon="idcard" color="#ef4444" />
            <Stat title="Revenue" value={`$${data.revenue.total}`} icon="pay-circle1" color="#22c55e" />
          </View>

          <View style={styles.spacer} />

          {/* Quick Stats */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
            <View style={styles.actionsGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('UsersManagement')}>
                <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' }]}>
                  <AntDesign name="team" size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>Manage Users</Text>
                <Text style={styles.actionSubtitle}>UC-11: Add, edit, activate/deactivate users</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('CompanyApprovals')}>
                <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
                  <AntDesign name="checkcircleo" size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>Company Approvals</Text>
                <Text style={styles.actionSubtitle}>UC-11: Approve/reject travel companies</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('TouristSpotsManagement')}>
                <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                  <AntDesign name="enviromento" size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>Tourist Spots</Text>
                <Text style={styles.actionSubtitle}>UC-11: Manage tourist spot listings</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('SystemSettings')}>
                <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                  <AntDesign name="setting" size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>System Settings</Text>
                <Text style={styles.actionSubtitle}>UC-11: Configure system parameters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      );
    }
    return <Text style={styles.empty}>No data</Text>;
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2563eb', '#3b82f6']}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <Text style={styles.title}>Admin Dashboard</Text>
          <TouchableOpacity onPress={load} style={styles.refreshButton}>
            <AntDesign name="reload1" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderContent()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f8fafc' 
  },
  header: { 
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { 
    fontSize: 28, 
    fontWeight: '700', 
    color: '#ffffff' 
  },
  refreshButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  scrollView: {
    flex: 1,
  },
  loading: { 
    padding: 16,
    textAlign: 'center',
    color: '#6b7280',
  },
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    padding: 16,
    paddingTop: 24,
    paddingBottom: 16,
    marginTop: 0,
    marginBottom: 8,
  },
  statCard: { 
    width: '48%', 
    backgroundColor: 'white', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 8 
  },
  cardTitle: { 
    marginLeft: 8, 
    color: '#6b7280', 
    fontWeight: '600',
    fontSize: 13,
  },
  cardValue: { 
    fontSize: 24, 
    fontWeight: '700',
    marginTop: 4,
  },
  section: { 
    backgroundColor: 'white', 
    margin: 16, 
    marginTop: 16,
    borderRadius: 12, 
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#111827', 
    marginBottom: 16 
  },
  actionsGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  actionCard: { 
    width: '48%', 
    backgroundColor: '#f8fafc', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  actionTitle: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#111827', 
    textAlign: 'center', 
    marginBottom: 4 
  },
  actionSubtitle: { 
    fontSize: 11, 
    color: '#6b7280', 
    textAlign: 'center', 
    lineHeight: 14 
  },
  empty: { 
    padding: 16, 
    color: '#6b7280',
    textAlign: 'center',
  },
  spacer: {
    height: 16,
  },
});

export default AdminDashboardScreen;
