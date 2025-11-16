import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from '../../services/apiService';
import { checkAuthToken, handleAuthError, debugAuthState } from '../../utils/authUtils';
import { buildApiUrl } from '../../config/api';

const { width } = Dimensions.get('window');

type PeriodOption = 'week' | 'month' | 'year';

const PERIOD_TO_DAYS: Record<PeriodOption, number> = {
  week: 7,
  month: 30,
  year: 365,
};

interface CompanyOverviewData {
  total_revenue?: number;
  total_bookings?: number;
  active_packages?: number;
  average_rating?: number;
  total_packages?: number;
  conversion_rate?: number;
}

interface BookingAnalyticsData {
  period_days: number;
  total_bookings: number;
  status_breakdown?: Record<string, number>;
  daily_bookings?: Array<{ date: string; bookings: number }>;
  popular_packages?: Array<{ name: string; bookings: number }>;
  average_daily_bookings?: number;
}

interface RevenueAnalyticsData {
  period_days: number;
  total_revenue: number;
  average_daily_revenue?: number;
  daily_revenue?: Array<{ date: string; revenue: number }>;
  revenue_by_package?: Array<{ name: string; revenue: number }>;
  total_bookings?: number;
}

const formatCurrency = (value: number) =>
  `Rs. ${value.toLocaleString()}`;

const formatStatusLabel = (status: string) =>
  status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const AnalyticsScreen: React.FC = () => {
  const [overview, setOverview] = useState<CompanyOverviewData | null>(null);
  const [bookingAnalytics, setBookingAnalytics] = useState<BookingAnalyticsData | null>(null);
  const [revenueAnalytics, setRevenueAnalytics] = useState<RevenueAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('month');

  const fetchAnalytics = async (days: number, isRefresh = false) => {
    if (!isRefresh) {
      setIsLoading(true);
    }

    try {
      // Check authentication first
      const token = await checkAuthToken();
      if (!token) {
        await handleAuthError('Please log in to view analytics');
        return;
      }

      // Try to fetch analytics data with fallback to basic company data
      let hasAuthError = false;

      // Fetch analytics with individual error handling
      const overviewResponse = await apiService.getCompanyOverview().catch(async (error) => {
        console.error('Overview fetch failed:', error);
        return { success: false, message: 'Failed to load overview', data: null };
      });

      const bookingResponse = await apiService.getBookingAnalytics(days).catch(async (error) => {
        console.error('Booking analytics fetch failed:', error);
        return { success: false, message: 'Failed to load booking analytics', data: null };
      });

      const revenueResponse = await apiService.getRevenueAnalytics(days).catch(async (error) => {
        console.error('Revenue analytics fetch failed:', error);
        return { success: false, message: 'Failed to load revenue analytics', data: null };
      });

      // Check for authentication errors
      const responses = [overviewResponse, bookingResponse, revenueResponse];
      hasAuthError = responses.some(response => 
        response.message?.includes('credentials') || 
        response.message?.includes('401') ||
        response.message?.includes('Unauthorized')
      );

      if (hasAuthError) {
        await handleAuthError();
        return;
      }

      // Process successful responses
      if (overviewResponse.success && overviewResponse.data) {
        setOverview(overviewResponse.data as CompanyOverviewData);
      } else {
        // Fallback: try to get basic company data
        await fetchFallbackData();
      }

      if (bookingResponse.success && bookingResponse.data) {
        setBookingAnalytics(bookingResponse.data as BookingAnalyticsData);
      }

      if (revenueResponse.success && revenueResponse.data) {
        setRevenueAnalytics(revenueResponse.data as RevenueAnalyticsData);
      }

    } catch (error) {
      console.error('Analytics fetch error:', error);
      // Try fallback data instead of showing error
      await fetchFallbackData();
    } finally {
      if (!isRefresh) {
        setIsLoading(false);
      }
      setRefreshing(false);
    }
  };

  // Fallback function to get basic company data when analytics fail
  const fetchFallbackData = async () => {
    try {
      const token = await checkAuthToken();
      if (!token) return;

      // Try to get basic company bookings for fallback data
      const response = await fetch(buildApiUrl('/bookings/company'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const bookings = await response.json();
        if (Array.isArray(bookings)) {
          const totalRevenue = bookings.reduce((sum: number, booking: any) => 
            sum + (booking.total_amount || 0), 0
          );
          
          const totalBookings = bookings.length;
          const confirmedBookings = bookings.filter((b: any) => b.status === 'confirmed').length;

          // Set fallback overview data
          setOverview({
            total_revenue: totalRevenue,
            total_bookings: totalBookings,
            active_packages: 0, // Will be updated if we can fetch packages
            average_rating: 0,
          });

          // Set basic booking analytics
          setBookingAnalytics({
            period_days: 30,
            total_bookings: totalBookings,
            status_breakdown: {
              confirmed: confirmedBookings,
              pending: bookings.filter((b: any) => b.status === 'pending').length,
              cancelled: bookings.filter((b: any) => b.status === 'cancelled').length,
            },
          });

          console.log('Loaded fallback analytics data');
        }
      }
    } catch (error) {
      console.error('Fallback data fetch failed:', error);
    }
  };

  useEffect(() => {
    // Debug authentication state
    debugAuthState();
    fetchAnalytics(PERIOD_TO_DAYS[selectedPeriod]);
  }, [selectedPeriod]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(PERIOD_TO_DAYS[selectedPeriod], true);
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: string;
    color: string;
  }> = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statHeader}>
        <AntDesign name={icon as any} size={24} color={color} />
        <Text style={styles.statTitle}>{title}</Text>
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
    </View>
  );

  const totalRevenue = revenueAnalytics?.total_revenue ?? overview?.total_revenue ?? 0;
  const totalBookings = bookingAnalytics?.total_bookings ?? overview?.total_bookings ?? 0;
  const activePackages = overview?.active_packages ?? overview?.total_packages ?? 0;
  const averageRating = overview?.average_rating ?? 0;
  const popularPackages: Array<{ name: string; bookings: number }> =
    bookingAnalytics?.popular_packages ?? [];
  const statusBreakdownEntries: Array<[string, number]> = bookingAnalytics?.status_breakdown
    ? Object.entries(bookingAnalytics.status_breakdown).map(
        ([status, count]) => [status, Number(count)] as [string, number]
      )
    : [];
  const revenueTrendToDisplay = Array.isArray(revenueAnalytics?.daily_revenue) 
    ? revenueAnalytics.daily_revenue
        .filter(
          (entry): entry is { date: string; revenue: number } =>
            !!entry && typeof entry.date === 'string' && typeof entry.revenue === 'number'
        )
        .slice(-7)
    : [];
  const revenueByPackage = Array.isArray(revenueAnalytics?.revenue_by_package)
    ? revenueAnalytics.revenue_by_package.filter(
        (item): item is { name: string; revenue: number } =>
          !!item && typeof item.name === 'string' && typeof item.revenue === 'number'
      )
    : [];
  const periodDays =
    bookingAnalytics?.period_days ??
    revenueAnalytics?.period_days ??
    PERIOD_TO_DAYS[selectedPeriod];
  const hasAnyData =
    !!overview ||
    popularPackages.length > 0 ||
    statusBreakdownEntries.length > 0 ||
    revenueTrendToDisplay.length > 0 ||
    revenueByPackage.length > 0;
  const averageRatingDisplay =
    averageRating && Number.isFinite(averageRating) && averageRating > 0
      ? averageRating.toFixed(1)
      : '—';

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Analytics Dashboard</Text>
        <TouchableOpacity onPress={() => fetchAnalytics(PERIOD_TO_DAYS[selectedPeriod])}>
          <AntDesign name="reload1" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['week', 'month', 'year'] as const).map((period) => (
          <TouchableOpacity
            key={period}
            style={[
              styles.periodButton,
              selectedPeriod === period && styles.periodButtonActive,
            ]}
            onPress={() => setSelectedPeriod(period)}
          >
            <Text
              style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {hasAnyData ? (
          <>
            {/* Key Metrics */}
            <View style={styles.metricsGrid}>
              <StatCard
                title="Total Revenue"
                value={formatCurrency(totalRevenue)}
                icon="pay-circle1"
                color="#10b981"
              />
              <StatCard
                title="Total Bookings"
                value={totalBookings}
                icon="calendar"
                color="#3b82f6"
              />
              <StatCard
                title="Active Packages"
                value={activePackages}
                icon="gift"
                color="#f59e0b"
              />
              <StatCard
                title="Average Rating"
                value={averageRatingDisplay}
                icon="star"
                color="#ef4444"
              />
            </View>

            {/* Popular Packages */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popular Packages</Text>
              {popularPackages.length > 0 ? (
                popularPackages.map((pkg, index) => (
                  <View key={`${pkg.name}-${index}`} style={styles.popularPackageItem}>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{pkg.name || 'Unknown Package'}</Text>
                      <Text style={styles.packageBookings}>{pkg.bookings} bookings</Text>
                    </View>
                    <View style={styles.packageRank}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubText}>No booking popularity data yet.</Text>
              )}
            </View>

            {/* Booking Status Breakdown */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Booking Status Breakdown</Text>
              {statusBreakdownEntries.length > 0 ? (
                statusBreakdownEntries.map(([status, count]) => (
                  <View key={status} style={styles.trendRow}>
                    <Text style={styles.trendLabel}>{formatStatusLabel(status)}</Text>
                    <Text style={styles.trendValue}>{count}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubText}>No booking status data available.</Text>
              )}
            </View>

            {/* Revenue Trend */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Revenue (Last {periodDays} days)</Text>
              {revenueTrendToDisplay.length > 0 ? (
                revenueTrendToDisplay.map((entry, index) => (
                  <View key={`${entry.date}-${index}`} style={styles.trendRow}>
                    <Text style={styles.trendLabel}>
                      {new Date(entry.date).toLocaleDateString()}
                    </Text>
                    <Text style={styles.trendValue}>{formatCurrency(entry.revenue)}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptySubText}>No revenue trend data available.</Text>
              )}
            </View>

            {/* Revenue by Package */}
            {revenueByPackage.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Revenue by Package</Text>
                {revenueByPackage.map((item, index) => (
                  <View key={`${item.name}-${index}`} style={styles.popularPackageItem}>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{item.name || 'Unknown Package'}</Text>
                      <Text style={styles.packageBookings}>{formatCurrency(item.revenue)}</Text>
                    </View>
                    <View style={styles.packageRank}>
                      <Text style={styles.rankText}>#{index + 1}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <AntDesign name="barschart" size={64} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No Analytics Data</Text>
            <Text style={styles.emptyText}>
              Start creating tour packages and getting bookings to see analytics!
            </Text>
          </View>
        )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  periodSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 8,
    padding: 4,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  periodButtonActive: {
    backgroundColor: '#3b82f6',
  },
  periodButtonText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    width: (width - 60) / 2,
    marginBottom: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statTitle: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  popularPackageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  packageInfo: {
    flex: 1,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  packageBookings: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  packageRank: {
    backgroundColor: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingPackage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  bookingCustomer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  bookingDate: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
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
  emptySubText: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 250,
  },
});

export default AnalyticsScreen;
