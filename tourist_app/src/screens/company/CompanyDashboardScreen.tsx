import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/selectors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../../config/api';
import { CommonStyles, createRoleStyles } from '../../theme/styles';
import { Colors } from '../../theme/colors';

interface DashboardStats {
  activePackages: number;
  totalBookings: number;
  averageRating: number;
  totalRevenue: number;
}

const CompanyDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAppSelector(selectUser);
  const roleStyles = createRoleStyles('company');
  const [stats, setStats] = useState<DashboardStats>({
    activePackages: 0,
    totalBookings: 0,
    averageRating: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      if (!token) {
        console.error('No authentication token found');
        setStats({
          activePackages: 0,
          totalBookings: 0,
          averageRating: 0,
          totalRevenue: 0,
        });
        return;
      }

      let activePackages = 0;
      let totalBookings = 0;
      let totalRating = 0;
      let ratingCount = 0;
      let totalRevenue = 0;

      // Fetch company packages using apiService for consistency
      try {
        const packagesResponse = await fetch(buildApiUrl(`/tour-packages/company/${user?.id}`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (packagesResponse.ok) {
          const packages = await packagesResponse.json();
          if (Array.isArray(packages)) {
            activePackages = packages.filter((pkg: any) => pkg.status === 'active').length;
          }
        } else if (packagesResponse.status === 401) {
          console.error('Authentication failed for packages');
          // Clear invalid token
          await AsyncStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error('Error fetching packages:', error);
      }

      // Fetch company bookings
      try {
        const bookingsResponse = await fetch(buildApiUrl('/bookings/company'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (bookingsResponse.ok) {
          const bookings = await bookingsResponse.json();
          if (Array.isArray(bookings)) {
            totalBookings = bookings.length;
            
            // Calculate total revenue and ratings
            bookings.forEach((booking: any) => {
              if (booking.total_amount) {
                totalRevenue += booking.total_amount;
              }
              if (booking.rating) {
                totalRating += booking.rating;
                ratingCount++;
              }
            });
          }
        } else if (bookingsResponse.status === 401) {
          console.error('Authentication failed for bookings');
          // Clear invalid token
          await AsyncStorage.removeItem('access_token');
        }
      } catch (error) {
        console.error('Error fetching bookings:', error);
      }

      setStats({
        activePackages,
        totalBookings,
        averageRating: ratingCount > 0 ? totalRating / ratingCount : 0,
        totalRevenue,
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats({
        activePackages: 0,
        totalBookings: 0,
        averageRating: 0,
        totalRevenue: 0,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const dashboardItems = [
    {
      title: 'Add Tour Package',
      description: 'UC-8: Create new tour packages',
      icon: 'plus',
      onPress: () => navigation.navigate('AddPackage' as never),
      color: Colors.company.primary,
    },
    {
      title: 'Update Tour Package',
      description: 'UC-9: Edit existing tour packages',
      icon: 'edit',
      onPress: () => navigation.navigate('ManagePackages' as never),
      color: Colors.company.secondary,
    },
    {
      title: 'Delete Tour Package',
      description: 'UC-10: Remove tour packages',
      icon: 'delete',
      onPress: () => navigation.navigate('ManagePackages' as never),
      color: Colors.error[500],
    },
    {
      title: 'Manage Tourist Spots',
      description: 'Add and manage your tourist spots',
      icon: 'enviromento',
      onPress: () => navigation.navigate('ManageSpots' as never),
      color: Colors.purple[500],
    },
    {
      title: 'View Bookings',
      description: 'See all bookings for your packages',
      icon: 'calendar',
      onPress: () => navigation.navigate('CompanyBookings' as never),
      color: Colors.warning[500],
    },
    {
      title: 'Analytics',
      description: 'View performance metrics',
      icon: 'barschart',
      onPress: () => navigation.navigate('Analytics' as never),
      color: Colors.company.accent,
    },
  ];

  if (loading) {
    return (
      <View style={CommonStyles.loading}>
        <ActivityIndicator size="large" color={Colors.company.primary} />
        <Text style={CommonStyles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#2563eb', '#3b82f6']}
        style={styles.header}
      >
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.companyName}>{user?.full_name}</Text>
        <Text style={styles.subtitle}>Travel Company Dashboard</Text>
      </LinearGradient>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.activePackages}</Text>
            <Text style={styles.statLabel}>Active Packages</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{stats.averageRating.toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avg Rating</Text>
          </View>
        </View>

        <View style={styles.revenueCard}>
          <Text style={styles.revenueLabel}>Total Revenue</Text>
          <Text style={styles.revenueAmount}>Rs. {stats.totalRevenue.toLocaleString()}</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.sectionTitle}>Tour Package Management</Text>
          <View style={styles.actionsGrid}>
            {dashboardItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.actionCard}
                onPress={item.onPress}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.color }]}>
                  <AntDesign name={item.icon as any} size={24} color="white" />
                </View>
                <Text style={styles.actionTitle}>{item.title}</Text>
                <Text style={styles.actionDescription}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.9,
  },
  companyName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9,
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 24,
    marginTop: 0,
    gap: 12,
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  revenueCard: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 24,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  revenueAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f59e0b',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
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
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    textAlign: 'center',
  },
  actionDescription: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 14,
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
});

export default CompanyDashboardScreen;
