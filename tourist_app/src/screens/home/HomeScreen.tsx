import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/selectors';
import { UserRole } from '../../types';
import apiService from '../../services/apiService';
import recommendationService from '../../services/recommendationService';
import { buildApiUrl } from '../../config/api';

const Colors = {
  primary: { 600: '#2563eb' },
  secondary: { 600: '#dc2626' },
  error: { 500: '#ef4444' },
  warning: { 500: '#f59e0b' },
  neutral: { 0: '#ffffff', 900: '#111827' }
};

interface PopularDestination {
  id: string;
  name: string;
  image_url: string;
  rating: number;
  region: string;
}

interface FeaturedPackage {
  id: string;
  name: string;
  price: number;
  duration_days: number;
  image_url: string;
  rating: number;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const user = useAppSelector(selectUser);
  const [popularDestinations, setPopularDestinations] = useState<PopularDestination[]>([]);
  const [featuredPackages, setFeaturedPackages] = useState<FeaturedPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  // Helper function to resolve image URLs (handles both absolute and relative URLs)
  const resolveImageUrl = (url?: string | string[] | null): string => {
    const defaultSpotImage = 'https://via.placeholder.com/200x120/3b82f6/ffffff?text=Tourist+Spot';
    const defaultPackageImage = 'https://via.placeholder.com/250x140/3b82f6/ffffff?text=Tour+Package';
    
    // Handle array of URLs - take the first one
    let imageUrl: string | null = null;
    if (Array.isArray(url)) {
      imageUrl = url.length > 0 ? url[0] : null;
    } else if (typeof url === 'string') {
      imageUrl = url;
    }
    
    // If no URL, return default
    if (!imageUrl) {
      return defaultSpotImage;
    }
    
    // If already an absolute URL, return as is
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    // If relative URL, prepend API base URL
    const normalizedUrl = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    try {
      return buildApiUrl(normalizedUrl);
    } catch (error) {
      console.error('Error building image URL:', error);
      return defaultSpotImage;
    }
  };

  const loadHomeData = async () => {
    try {
      // Load popular destinations using recommendation service
      const spotsResponse = await recommendationService.getPopularSpots(10);
      if (spotsResponse.success && spotsResponse.data && Array.isArray(spotsResponse.data)) {
        // Map RecommendedSpot to PopularDestination format
        const mappedSpots = spotsResponse.data.map((spot: any) => {
          // Extract image URL from image_urls array or use image_url if available
          const imageUrl = resolveImageUrl(spot.image_urls || spot.image_url);
          
          return {
            id: spot.id || spot._id,
            name: spot.name,
            image_url: imageUrl,
            rating: spot.rating || spot.average_rating || 0,
            region: spot.region || 'Unknown'
          };
        });
        setPopularDestinations(mappedSpots);
      } else {
        setPopularDestinations([]);
      }

      // Load featured packages using recommendation service
      const packagesResponse = await recommendationService.getFeaturedPackages(10);
      if (packagesResponse.success && packagesResponse.data && Array.isArray(packagesResponse.data)) {
        // Map RecommendedPackage to FeaturedPackage format
        const mappedPackages = packagesResponse.data.map((pkg: any) => {
          // Extract image URL from image_urls array or use image_url if available
          const imageUrl = resolveImageUrl(pkg.image_urls || pkg.image_url);
          
          return {
            id: pkg.id || pkg._id,
            name: pkg.name || pkg.title,
            price: pkg.price || 0,
            duration_days: pkg.duration_days || pkg.duration || 1,
            image_url: imageUrl,
            rating: pkg.rating || pkg.average_rating || 0
          };
        });
        setFeaturedPackages(mappedPackages);
      } else {
        setFeaturedPackages([]);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleSpecificContent = () => {
    switch (user?.role) {
      case UserRole.TRAVEL_COMPANY:
        return {
          welcomeText: `Welcome back, ${user.full_name}`,
          subtitle: 'Manage your tour packages and grow your business',
          quickActions: [
            {
              title: 'Add Package',
              subtitle: 'Create new tours',
              icon: 'plus',
              color: Colors.primary[600],
              onPress: () => navigation.navigate('AddPackage' as never)
            },
            {
              title: 'Manage',
              subtitle: 'Edit packages',
              icon: 'setting',
              color: Colors.secondary[600],
              onPress: () => navigation.navigate('ManagePackages' as never)
            },
            {
              title: 'Analytics',
              subtitle: 'View performance',
              icon: 'barschart',
              color: Colors.error[500],
              onPress: () => navigation.navigate('Analytics' as never)
            }
          ]
        };

      case UserRole.ADMIN:
        return {
          welcomeText: `Welcome, ${user.full_name}`,
          subtitle: 'System administration and user management',
          quickActions: [
            {
              title: 'Users',
              subtitle: 'Manage users',
              icon: 'team',
              color: Colors.primary[600],
              onPress: () => Alert.alert('Info', 'Use the Users tab to manage users')
            },
            {
              title: 'Analytics',
              subtitle: 'System stats',
              icon: 'barschart',
              color: Colors.secondary[600],
              onPress: () => Alert.alert('Info', 'Use the Analytics tab to view system stats')
            },
            {
              title: 'Settings',
              subtitle: 'System config',
              icon: 'setting',
              color: Colors.error[500],
              onPress: () => Alert.alert('Info', 'System settings coming soon')
            }
          ]
        };

      default: // Tourist
        return {
          welcomeText: `Welcome, ${user?.full_name || 'Explorer'}`,
          subtitle: 'Discover amazing places and book unforgettable tours',
          quickActions: [
            {
              title: 'Browse Tour Packages',
              subtitle: 'UC-3: View available packages',
              icon: 'gift',
              color: Colors.primary[600],
              onPress: () => navigation.navigate('Packages' as never)
            },
            {
              title: 'Book Tour Package',
              subtitle: 'UC-4: Reserve your trip',
              icon: 'calendar',
              color: Colors.secondary[600],
              onPress: () => navigation.navigate('Packages' as never)
            },
            {
              title: 'Search Tourist Spots',
              subtitle: 'UC-6: Find destinations',
              icon: 'search1',
              color: Colors.warning[500],
              onPress: () => navigation.navigate('Explore' as never)
            },
            {
              title: 'Rate Tour Package',
              subtitle: 'UC-5: Share your experience',
              icon: 'star',
              color: Colors.error[500],
              onPress: () => {
                // Navigate to Bookings tab using jumpTo
                try {
                  const parent = navigation.getParent();
                  if (parent && 'jumpTo' in parent) {
                    (parent as any).jumpTo('Bookings');
                  }
                } catch (error) {
                  console.log('Navigation error:', error);
                }
              }
            },
            {
              title: 'Manage Profile',
              subtitle: 'UC-7: Update your info',
              icon: 'user',
              color: '#8b5cf6',
              onPress: () => navigation.navigate('Profile' as never)
            },
            {
              title: 'Maps Navigation',
              subtitle: 'UC-12: Get directions',
              icon: 'enviromento',
              color: '#06b6d4',
              onPress: () => {
                const parent = navigation.getParent();
                if (parent) {
                  (parent as any).navigate('Maps', {});
                } else {
                  (navigation as any).navigate('Maps', {});
                }
              }
            }
          ]
        };
    }
  };

  const content = getRoleSpecificContent();

  const renderDestinationCard = (destination: PopularDestination) => (
    <TouchableOpacity
      key={destination.id}
      style={styles.destinationCard}
      onPress={() => {
        // Navigate to spot details
        (navigation as any).navigate('SpotDetails', {
          spotId: destination.id
        });
      }}
    >
      <Image
        source={{ uri: destination.image_url }}
        style={styles.destinationImage}
        resizeMode="cover"
        onError={(error) => {
          console.log('Image load error for:', destination.image_url, error.nativeEvent.error);
        }}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={styles.destinationInfo}>
        <Text style={styles.destinationName} numberOfLines={2}>
          {destination.name}
        </Text>
        <View style={styles.destinationFooter}>
          <Text style={styles.destinationRegion} numberOfLines={1}>{destination.region}</Text>
          <View style={styles.ratingContainer}>
            <AntDesign name="star" size={14} color="#FFD700" />
            <Text style={styles.ratingText}>{destination.rating.toFixed(1)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderPackageCard = (pkg: FeaturedPackage) => (
    <TouchableOpacity
      key={pkg.id}
      style={styles.packageCard}
      onPress={() => {
        // Navigate to package details
        (navigation as any).navigate('PackageDetails', {
          packageId: pkg.id
        });
      }}
    >
      <Image
        source={{ uri: pkg.image_url }}
        style={styles.packageImage}
        resizeMode="cover"
        onError={(error) => {
          console.log('Image load error for:', pkg.image_url, error.nativeEvent.error);
        }}
        defaultSource={require('../../../assets/icon.png')}
      />
      <View style={styles.packageBadge}>
        <Text style={styles.packageBadgeText}>FEATURED</Text>
      </View>
      <View style={styles.packageInfo}>
        <Text style={styles.packageName} numberOfLines={2}>
          {pkg.name}
        </Text>
        <Text style={styles.packageDuration}>{pkg.duration_days} days</Text>
        <View style={styles.packageFooter}>
          <Text style={styles.packagePrice}>Rs. {pkg.price.toLocaleString()}</Text>
          <View style={styles.ratingContainer}>
            <AntDesign name="star" size={12} color="#FFD700" />
            <Text style={styles.ratingText}>
              {(pkg.rating || 0).toFixed(1)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <LinearGradient
        colors={[Colors.primary[600], '#3b82f6']}
        style={styles.header}
      >
        <Text style={styles.welcomeText}>{content.welcomeText}</Text>
        <Text style={styles.subtitle}>{content.subtitle}</Text>
      </LinearGradient>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        {content.quickActions.map((action, index) => (
          <TouchableOpacity
            key={index}
            style={styles.actionCard}
            onPress={action.onPress}
          >
            <AntDesign name={action.icon as any} size={32} color={action.color} />
            <Text style={styles.actionTitle}>{action.title}</Text>
            <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content Sections */}
      <View style={styles.content}>
        {user?.role === UserRole.TOURIST && (
          <>
            <Text style={styles.sectionTitle}>Popular Destinations</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.horizontalScroll}
              contentContainerStyle={styles.scrollContent}
              decelerationRate="fast"
              snapToInterval={195}
              snapToAlignment="start"
            >
              {popularDestinations.length > 0 ? (
                popularDestinations.map(renderDestinationCard)
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No destinations available</Text>
                </View>
              )}
            </ScrollView>

            <Text style={styles.sectionTitle}>Featured Packages</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.horizontalScroll}
              contentContainerStyle={styles.scrollContent}
              decelerationRate="fast"
              snapToInterval={295}
              snapToAlignment="start"
            >
              {featuredPackages.length > 0 ? (
                featuredPackages.map(renderPackageCard)
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No packages available</Text>
                </View>
              )}
            </ScrollView>
          </>
        )}

        {user?.role === UserRole.TRAVEL_COMPANY && (
          <>
            <Text style={styles.sectionTitle}>Recent Bookings</Text>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => {
                try {
                  const parent = navigation.getParent();
                  if (parent && 'jumpTo' in parent) {
                    (parent as any).jumpTo('Bookings');
                  }
                } catch (error) {
                  console.log('Navigation error:', error);
                }
              }}
            >
              <Text style={styles.quickActionButtonText}>View All Bookings</Text>
              <AntDesign name="right" size={16} color={Colors.primary[600]} />
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Quick Stats</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>Active Packages</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>45</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
            </View>
          </>
        )}

        {user?.role === UserRole.ADMIN && (
          <>
            <Text style={styles.sectionTitle}>System Overview</Text>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => Alert.alert('Info', 'Use the Users tab for admin functions')}
            >
              <Text style={styles.quickActionButtonText}>Access Admin Panel</Text>
              <AntDesign name="right" size={16} color={Colors.primary[600]} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  header: {
    padding: 40,
    paddingTop: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.neutral[0],
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.neutral[0],
    opacity: 0.9,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  actionCard: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    width: '31%',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 14,
  },
  actionSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 12,
  },
  content: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 15,
    marginTop: 20,
    paddingLeft: 20,
  },
  horizontalScroll: {
    marginBottom: 20,
    paddingLeft: 20,
  },
  destinationCard: {
    width: 180,
    backgroundColor: Colors.neutral[0],
    borderRadius: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  destinationImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#E5E7EB',
  },
  destinationInfo: {
    padding: 12,
  },
  destinationName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 8,
    lineHeight: 20,
  },
  destinationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  destinationRegion: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    marginRight: 8,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  packageCard: {
    width: 280,
    backgroundColor: Colors.neutral[0],
    borderRadius: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
  },
  packageImage: {
    width: '100%',
    height: 160,
    backgroundColor: '#E5E7EB',
  },
  packageBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.warning[500],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  packageBadgeText: {
    color: Colors.neutral[0],
    fontSize: 10,
    fontWeight: '700',
  },
  packageInfo: {
    padding: 16,
  },
  packageName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 6,
    lineHeight: 22,
    minHeight: 44,
  },
  packageDuration: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
  },
  packageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary[600],
  },
  quickActionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.neutral[0],
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  quickActionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
    padding: 20,
    borderRadius: 15,
    marginHorizontal: 5,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary[600],
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  scrollContent: {
    paddingRight: 20,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default HomeScreen;
