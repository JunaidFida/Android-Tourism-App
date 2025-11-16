import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../../config/api';
import { formatCurrency } from '../../config/constants';

interface PackageBooking {
    id: string;
    user: {
        full_name: string;
        email: string;
        phone_number: string;
    };
    tour_package: {
        name: string;
        price: number;
        duration_days: number;
    };
    participants_count: number;
    total_amount: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    booking_date: string;
    preferred_date: string;
    special_requests?: string;
}

const PackageBookingsScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { packageId, packageTitle } = route.params as { packageId: string; packageTitle: string };

    const [bookings, setBookings] = useState<PackageBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('all');

    useEffect(() => {
        loadPackageBookings();
    }, [packageId]);

    const loadPackageBookings = async () => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await fetch(buildApiUrl(`/bookings/package/${packageId}`), {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                setBookings(Array.isArray(data) ? data : []);
            } else {
                Alert.alert('Error', 'Failed to load bookings');
                setBookings([]);
            }
        } catch (error) {
            console.error('Error loading package bookings:', error);
            Alert.alert('Error', 'An unexpected error occurred');
            setBookings([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadPackageBookings();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return '#10B981';
            case 'pending': return '#F59E0B';
            case 'cancelled': return '#EF4444';
            case 'completed': return '#3B82F6';
            default: return '#6B7280';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'confirmed': return 'Confirmed';
            case 'pending': return 'Pending';
            case 'cancelled': return 'Cancelled';
            case 'completed': return 'Completed';
            default: return status;
        }
    };

    const handleStatusUpdate = async (bookingId: string, newStatus: string) => {
        try {
            const token = await AsyncStorage.getItem('access_token');
            const response = await fetch(buildApiUrl(`/bookings/${bookingId}/status`), {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setBookings(prev => prev.map(booking =>
                    booking.id === bookingId ? { ...booking, status: newStatus as any } : booking
                ));
                Alert.alert('Success', `Booking ${newStatus} successfully`);
            } else {
                Alert.alert('Error', 'Failed to update booking status');
            }
        } catch (error) {
            console.error('Error updating booking status:', error);
            Alert.alert('Error', 'An unexpected error occurred');
        }
    };

    const showStatusOptions = (booking: PackageBooking) => {
        const options = [
            { text: 'Cancel', style: 'cancel' as const },
            { text: 'Confirm', onPress: () => handleStatusUpdate(booking.id, 'confirmed') },
            { text: 'Mark as Completed', onPress: () => handleStatusUpdate(booking.id, 'completed') },
            { text: 'Cancel Booking', onPress: () => handleStatusUpdate(booking.id, 'cancelled'), style: 'destructive' as const },
        ];

        Alert.alert('Update Booking Status', `Update status for ${booking.user.full_name}`, options);
    };

    const filteredBookings = selectedStatus === 'all'
        ? bookings
        : bookings.filter(booking => booking.status === selectedStatus);

    const renderBookingItem = ({ item }: { item: PackageBooking }) => (
        <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
                <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.user.full_name}</Text>
                    <Text style={styles.customerEmail}>{item.user.email}</Text>
                    <Text style={styles.customerPhone}>{item.user.phone_number}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
                </View>
            </View>

            <View style={styles.bookingDetails}>
                <View style={styles.detailRow}>
                    <AntDesign name="team" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{item.participants_count} participants</Text>
                </View>
                <View style={styles.detailRow}>
                    <AntDesign name="calendar" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                        Preferred: {new Date(item.preferred_date).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <AntDesign name="clockcircle" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>
                        Booked: {new Date(item.booking_date).toLocaleDateString()}
                    </Text>
                </View>
                <View style={styles.detailRow}>
                    <AntDesign name="pay-circle1" size={16} color="#6B7280" />
                    <Text style={styles.detailText}>{formatCurrency(item.total_amount)}</Text>
                </View>
            </View>

            {item.special_requests && (
                <View style={styles.specialRequests}>
                    <Text style={styles.specialRequestsLabel}>Special Requests:</Text>
                    <Text style={styles.specialRequestsText}>{item.special_requests}</Text>
                </View>
            )}

            <TouchableOpacity
                style={styles.updateButton}
                onPress={() => showStatusOptions(item)}
            >
                <Text style={styles.updateButtonText}>Update Status</Text>
                <AntDesign name="edit" size={16} color="#3B82F6" />
            </TouchableOpacity>
        </View>
    );

    const renderStatusFilter = () => (
        <View style={styles.filterContainer}>
            {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                <TouchableOpacity
                    key={status}
                    style={[
                        styles.filterButton,
                        selectedStatus === status && styles.filterButtonActive,
                    ]}
                    onPress={() => setSelectedStatus(status)}
                >
                    <Text
                        style={[
                            styles.filterButtonText,
                            selectedStatus === status && styles.filterButtonTextActive,
                        ]}
                    >
                        {status === 'all' ? 'All' : getStatusText(status)}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <AntDesign name="calendar" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptyDescription}>
                {selectedStatus === 'all'
                    ? 'This package has no bookings yet'
                    : `No ${selectedStatus} bookings found`
                }
            </Text>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loadingText}>Loading bookings...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <AntDesign name="arrowleft" size={24} color="#111827" />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Package Bookings</Text>
                    <Text style={styles.headerSubtitle}>{packageTitle}</Text>
                </View>
                <TouchableOpacity onPress={() => loadPackageBookings()}>
                    <AntDesign name="reload1" size={24} color="#3B82F6" />
                </TouchableOpacity>
            </View>

            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{bookings.length}</Text>
                    <Text style={styles.statLabel}>Total Bookings</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {bookings.filter(b => b.status === 'confirmed').length}
                    </Text>
                    <Text style={styles.statLabel}>Confirmed</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {bookings.filter(b => b.status === 'pending').length}
                    </Text>
                    <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                        {formatCurrency(bookings.reduce((sum, b) => sum + b.total_amount, 0))}
                    </Text>
                    <Text style={styles.statLabel}>Total Revenue</Text>
                </View>
            </View>

            {renderStatusFilter()}

            <FlatList
                data={filteredBookings}
                renderItem={renderBookingItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6B7280',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingVertical: 20,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#3B82F6',
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 4,
        textAlign: 'center',
    },
    filterContainer: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#F3F4F6',
    },
    filterButtonActive: {
        backgroundColor: '#3B82F6',
    },
    filterButtonText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterButtonTextActive: {
        color: 'white',
    },
    listContainer: {
        padding: 20,
    },
    bookingCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    bookingHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    customerInfo: {
        flex: 1,
    },
    customerName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    customerEmail: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 2,
    },
    customerPhone: {
        fontSize: 14,
        color: '#6B7280',
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: 'white',
    },
    bookingDetails: {
        marginBottom: 16,
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    detailText: {
        fontSize: 14,
        color: '#374151',
        marginLeft: 8,
    },
    specialRequests: {
        backgroundColor: '#F9FAFB',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    specialRequestsLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 4,
    },
    specialRequestsText: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#EFF6FF',
        borderColor: '#3B82F6',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    updateButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3B82F6',
        marginRight: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111827',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyDescription: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});

export default PackageBookingsScreen;