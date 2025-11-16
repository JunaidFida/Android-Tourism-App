import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { apiService } from '../../services/apiService';

const { width } = Dimensions.get('window');

interface PackageAnalytics {
  package_id: string;
  package_name: string;
  total_bookings: number;
  total_revenue: number;
  average_rating: number;
  review_count: number;
  booking_trend: Array<{ date: string; bookings: number }>;
  revenue_trend: Array<{ date: string; revenue: number }>;
  status_breakdown: Record<string, number>;
}

const formatCurrency = (value: number) => `Rs. ${value.toLocaleString()}`;

const PackageAnalyticsScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { packageId } = route.params as { packageId: string };
  
  const [analytics, setAnalytics] = useState<PackageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchPackageAnalytics = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    
    try {
      const response = await apiService.getPackageAnalytics(packageId);
      
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        console.error('Failed to fetch package analytics:', response.message);
      }
    } catch (error) {
      console.error('Error fetching package analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPackageAnalytics();
  }, [packageId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPackageAnalytics(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading package analytics...</Text>
      </View>
    );
  }

  if (!analytics) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Package Analytics</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyContainer}>
          <AntDesign name="barschart" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Analytics Data</Text>
          <Text style={styles.emptyText}>
            Analytics data is not available for this package yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Package Analytics</Text>
        <TouchableOpacity onPress={() => fetchPackageAnalytics()}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.packageHeader}>
          <Text style={styles.packageName}>{analytics.package_name}</Text>
        </View>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { borderLeftColor: '#10b981' }]}>
            <Text style={styles.metricValue}>{formatCurrency(analytics.total_revenue)}</Text>
            <Text style={styles.metricLabel}>Total Revenue</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={styles.metricValue}>{analytics.total_bookings}</Text>
            <Text style={styles.metricLabel}>Total Bookings</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={styles.metricValue}>{analytics.average_rating.toFixed(1)}</Text>
            <Text style={styles.metricLabel}>Average Rating</Text>
          </View>
          <View style={[styles.metricCard, { borderLeftColor: '#ef4444' }]}>
            <Text style={styles.metricValue}>{analytics.review_count}</Text>
            <Text style={styles.metricLabel}>Reviews</Text>
          </View>
        </View>

        {/* Booking Status Breakdown */}
        {analytics.status_breakdown && Object.keys(analytics.status_breakdown).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Status</Text>
            {Object.entries(analytics.status_breakdown).map(([status, count]) => (
              <View key={status} style={styles.statusRow}>
                <Text style={styles.statusLabel}>
                  {status.split('_').map(word => 
                    word.charAt(0).toUpperCase() + word.slice(1)
                  ).join(' ')}
                </Text>
                <Text style={styles.statusValue}>{count}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Revenue Trend */}
        {analytics.revenue_trend && analytics.revenue_trend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Revenue Trend (Last 7 Days)</Text>
            {analytics.revenue_trend.slice(-7).map((entry, index) => (
              <View key={`${entry.date}-${index}`} style={styles.trendRow}>
                <Text style={styles.trendLabel}>
                  {new Date(entry.date).toLocaleDateString()}
                </Text>
                <Text style={styles.trendValue}>{formatCurrency(entry.revenue)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Booking Trend */}
        {analytics.booking_trend && analytics.booking_trend.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Booking Trend (Last 7 Days)</Text>
            {analytics.booking_trend.slice(-7).map((entry, index) => (
              <View key={`${entry.date}-${index}`} style={styles.trendRow}>
                <Text style={styles.trendLabel}>
                  {new Date(entry.date).toLocaleDateString()}
                </Text>
                <Text style={styles.trendValue}>{entry.bookings} bookings</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  packageHeader: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  packageName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusLabel: {
    fontSize: 14,
    color: '#374151',
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  trendLabel: {
    fontSize: 14,
    color: '#374151',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default PackageAnalyticsScreen;