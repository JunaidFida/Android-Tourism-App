import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { AdminService, AdminDashboard } from '../../services/adminService';
import { CommonStyles, createRoleStyles } from '../../theme/styles';
import { Colors } from '../../theme/colors';

const AdminDashboardScreen: React.FC<any> = ({ navigation }) => {
  const roleStyles = createRoleStyles('admin');
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await AdminService.getDashboard();
      setData(res);
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
    <View style={[roleStyles.statCard, { borderLeftColor: color }]}> 
      <View style={styles.cardHeader}>
        <AntDesign name={icon} size={20} color={color} />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <Text style={[styles.cardValue, { color }]}>{value}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={CommonStyles.loading}>
        <ActivityIndicator size="large" color={Colors.admin.primary} />
        <Text style={CommonStyles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={CommonStyles.safeArea}>
      <View style={[CommonStyles.header, roleStyles.headerGradient]}>
        <Text style={[CommonStyles.headerTitle, { color: Colors.neutral[0] }]}>Admin Dashboard</Text>
        <TouchableOpacity onPress={load}>
          <AntDesign name="reload1" size={22} color={Colors.neutral[0]} />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={CommonStyles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {data ? (
          <>
            <View style={styles.grid}>
              <Stat title="Total Users" value={data.users.total} icon="team" color={Colors.admin.primary} />
              <Stat title="Active Users" value={data.users.active} icon="user" color={Colors.admin.secondary} />
              <Stat title="Tourists" value={data.users.tourists} icon="smileo" color={Colors.tourist.primary} />
              <Stat title="Companies" value={data.users.companies} icon="bank" color={Colors.company.primary} />
              <Stat title="Admins" value={data.users.admins} icon="idcard" color={Colors.admin.accent} />
              <Stat title="Revenue" value={`$${data.revenue.total}`} icon="pay-circle1" color={Colors.success[600]} />
            </View>

            <View style={CommonStyles.section}>
              <Text style={CommonStyles.sectionTitle}>Quick Actions</Text>
              <View style={styles.actions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('UsersManagement')}>
                  <View style={[roleStyles.iconContainer, { backgroundColor: Colors.admin.primary }]}>
                    <AntDesign name="setting" size={18} color={Colors.neutral[0]} />
                  </View>
                  <Text style={styles.actionText}>Manage Users</Text>
                  <AntDesign name="right" size={16} color={Colors.neutral[400]} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('CompanyApprovals')}>
                  <View style={[roleStyles.iconContainer, { backgroundColor: Colors.warning[500] }]}>
                    <AntDesign name="exclamationcircleo" size={18} color={Colors.neutral[0]} />
                  </View>
                  <Text style={styles.actionText}>Company Approvals</Text>
                  <AntDesign name="right" size={16} color={Colors.neutral[400]} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('TouristSpotsManagement')}>
                  <View style={[roleStyles.iconContainer, { backgroundColor: Colors.admin.secondary }]}>
                    <AntDesign name="enviromento" size={18} color={Colors.neutral[0]} />
                  </View>
                  <Text style={styles.actionText}>Manage Tourist Spots</Text>
                  <AntDesign name="right" size={16} color={Colors.neutral[400]} />
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('SystemSettings')}>
                  <View style={[roleStyles.iconContainer, { backgroundColor: Colors.admin.accent }]}>
                    <AntDesign name="tool" size={18} color={Colors.neutral[0]} />
                  </View>
                  <Text style={styles.actionText}>System Settings</Text>
                  <AntDesign name="right" size={16} color={Colors.neutral[400]} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={CommonStyles.centered}>
            <Text style={styles.empty}>No data available</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  grid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    padding: 16 
  },
  cardHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 6 
  },
  cardTitle: { 
    marginLeft: 8, 
    color: Colors.neutral[500], 
    fontWeight: '600' 
  },
  cardValue: { 
    fontSize: 18, 
    fontWeight: '700' 
  },
  actions: { 
    gap: 12 
  },
  actionBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 16, 
    backgroundColor: Colors.neutral[0], 
    borderRadius: 12, 
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  actionText: { 
    flex: 1,
    marginLeft: 16, 
    color: Colors.neutral[900], 
    fontWeight: '600',
    fontSize: 16,
  },
  empty: { 
    padding: 16, 
    color: Colors.neutral[500],
    fontSize: 16,
    textAlign: 'center',
  },
});

export default AdminDashboardScreen;