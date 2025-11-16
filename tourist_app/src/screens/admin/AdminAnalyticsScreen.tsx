import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { AdminService } from '../../services/adminService';

const { width } = Dimensions.get('window');

interface UserActivity {
  period_days: number;
  total_users: number;
  new_users: number;
  active_users: number;
  activity_by_role: {
    tourist: number;
    travel_company: number;
    admin: number;
  };
}

interface PopularSpot {
  spot_id: string;
  name: string;
  region: string;
  visit_count: number;
  average_rating: number;
}

const AdminAnalyticsScreen: React.FC = () => {
  const [userActivity, setUserActivity] = useState<UserActivity | null>(null);
  const [popularSpots, setPopularSpots] = useState<PopularSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [activityData, spotsData] = await Promise.all([
        AdminService.getUserActivity(30),
        AdminService.getPopularSpots(10)
      ]);
      
      setUserActivity(activityData);
      setPopularSpots(spotsData.popular_spots || []);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#2563eb', '#3b82f6']} style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
        <Text style={styles.subtitle}>System insights and metrics</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* User Activity Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Activity (Last 30 Days)</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <AntDesign name="team" size={24} color="#3b82f6" />
              <Text style={styles.statValue}>{userActivity?.total_users || 0}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <AntDesign name="user" size={24} color="#10b981" />
              <Text style={styles.statValue}>{userActivity?.active_users || 0}</Text>
              <Text style={styles.statLabel}>Active Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <AntDesign name="adduser" size={24} color="#f59e0b" />
              <Text style={styles.statValue}>{userActivity?.new_users || 0}</Text>
              <Text style={styles.statLabel}>New Users</Text>
            </View>
            
            <View style={styles.statCard}>
              <AntDesign name="linechart" size={24} color="#8b5cf6" />
              <Text style={styles.statValue}>
                {userActivity ? Math.round((userActivity.active_users / userActivity.total_users) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Engagement</Text>
            </View>
          </View>
        </View>

        {/* Activity by Role */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity by User Type</Text>
          
          <View style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <AntDesign name="smileo" size={20} color="#6366f1" />
              <Text style={styles.roleTitle}>Tourists</Text>
            </View>
            <Text style={styles.roleValue}>{userActivity?.activity_by_role?.tourist || 0}</Text>
            <Text style={styles.roleSubtext}>active in last 30 days</Text>
          </View>

          <View style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <AntDesign name="bank" size={20} color="#f59e0b" />
              <Text style={styles.roleTitle}>Travel Companies</Text>
            </View>
            <Text style={styles.roleValue}>{userActivity?.activity_by_role?.travel_company || 0}</Text>
            <Text style={styles.roleSubtext}>active in last 30 days</Text>
          </View>

          <View style={styles.roleCard}>
            <View style={styles.roleHeader}>
              <AntDesign name="idcard" size={20} color="#ef4444" />
              <Text style={styles.roleTitle}>Administrators</Text>
            </View>
            <Text style={styles.roleValue}>{userActivity?.activity_by_role?.admin || 0}</Text>
            <Text style={styles.roleSubtext}>active in last 30 days</Text>
          </View>
        </View>

        {/* Most Visited Places */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Visited Tourist Spots</Text>
          
          {popularSpots.length > 0 ? (
            popularSpots.map((spot, index) => (
              <View key={spot.spot_id} style={styles.spotCard}>
                <View style={styles.spotRank}>
                  <Text style={styles.rankText}>{index + 1}</Text>
                </View>
                <View style={styles.spotInfo}>
                  <Text style={styles.spotName}>{spot.name}</Text>
                  <Text style={styles.spotRegion}>{spot.region}</Text>
                </View>
                <View style={styles.spotStats}>
                  <View style={styles.spotVisits}>
                    <AntDesign name="eye" size={14} color="#6b7280" />
                    <Text style={styles.visitCount}>{spot.visit_count}</Text>
                  </View>
                  <View style={styles.spotRating}>
                    <AntDesign name="star" size={14} color="#FFD700" />
                    <Text style={styles.ratingText}>{spot.average_rating.toFixed(1)}</Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>No data available</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
    textAlign: 'center',
  },
  roleCard: {
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
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 8,
  },
  roleValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#3b82f6',
    marginBottom: 4,
  },
  roleSubtext: {
    fontSize: 13,
    color: '#6b7280',
  },
  spotCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  spotRank: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  spotInfo: {
    flex: 1,
  },
  spotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  spotRegion: {
    fontSize: 13,
    color: '#6b7280',
  },
  spotStats: {
    alignItems: 'flex-end',
  },
  spotVisits: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  visitCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 4,
  },
  spotRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 4,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingVertical: 20,
  },
});

export default AdminAnalyticsScreen;
