import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import apiService from '../../services/apiService';

interface RouteParams {
  packageId: string;
  packageName: string;
  packagePrice: number;
  maxParticipants: number;
  availableDates?: string[];
}

const CreateBookingScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const {
    packageId,
    packageName,
    packagePrice,
    maxParticipants,
    availableDates: availableDatesParam,
  } = route.params as RouteParams;
  const { user } = useAppSelector((state) => state.auth);
  
  const [numberOfPeople, setNumberOfPeople] = useState('1');
  const normalizedAvailableDates = useMemo(() => {
    if (!availableDatesParam || !Array.isArray(availableDatesParam)) {
      return [] as string[];
    }

    return availableDatesParam
      .map((date) => {
        const parsed = new Date(date);
        if (isNaN(parsed.getTime())) {
          return null;
        }
        parsed.setHours(0, 0, 0, 0);
        return parsed.toISOString();
      })
      .filter((date): date is string => Boolean(date));
  }, [availableDatesParam]);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    normalizedAvailableDates[0] || null
  );
  const [manualTravelDate, setManualTravelDate] = useState('');
  const [contactPhone, setContactPhone] = useState(user?.phone_number || '');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactNumber, setEmergencyContactNumber] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const hasPresetDates = normalizedAvailableDates.length > 0;

  useEffect(() => {
    if (normalizedAvailableDates.length > 0) {
      setSelectedDate((current) => {
        if (current && normalizedAvailableDates.includes(current)) {
          return current;
        }
        return normalizedAvailableDates[0];
      });
      setManualTravelDate('');
    } else {
      setSelectedDate(null);
    }
  }, [normalizedAvailableDates]);

  const formatDateForDisplay = (value?: string | null) => {
    if (!value) {
      return 'Select a date';
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString();
    }

    return value;
  };

  const participantCountForTotals = parseInt(numberOfPeople || '1', 10);
  const displayTravelDate = hasPresetDates
    ? formatDateForDisplay(selectedDate)
    : formatDateForDisplay(manualTravelDate);

  const totalPrice = (Number.isNaN(participantCountForTotals) ? 0 : participantCountForTotals) * packagePrice;

  const handleCreateBooking = async () => {
    const participantsCount = parseInt(numberOfPeople || '1', 10);

    if (!numberOfPeople || Number.isNaN(participantsCount) || participantsCount <= 0) {
      Alert.alert('Error', 'Please enter a valid number of people');
      return;
    }

    if (participantsCount > maxParticipants) {
      Alert.alert('Error', `Only ${maxParticipants} slots available`);
      return;
    }

    if (!contactPhone) {
      Alert.alert('Error', 'Please enter your contact phone number');
      return;
    }

    setIsLoading(true);

    try {
      let finalTravelDateIso: string | null = null;

      if (hasPresetDates) {
        if (!selectedDate) {
          Alert.alert('Error', 'Please select one of the available travel dates.');
          return;
        }
        finalTravelDateIso = selectedDate;
      } else {
        if (!manualTravelDate) {
          Alert.alert('Error', 'Please enter a travel date in YYYY-MM-DD format.');
          return;
        }

        const parsedManualDate = new Date(manualTravelDate);
        if (isNaN(parsedManualDate.getTime())) {
          Alert.alert('Error', 'Please enter a valid date in YYYY-MM-DD format.');
          return;
        }

        parsedManualDate.setHours(0, 0, 0, 0);
        finalTravelDateIso = parsedManualDate.toISOString();
      }

      const parsedFinalDate = new Date(finalTravelDateIso);
      if (isNaN(parsedFinalDate.getTime())) {
        Alert.alert('Error', 'The selected travel date is invalid.');
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedFinalDate < today) {
        Alert.alert('Error', 'Travel date must be in the future');
        return;
      }

      const bookingData = {
        tour_package_id: packageId,
        travel_date: parsedFinalDate.toISOString(),
        number_of_people: participantsCount,
        contact_phone: contactPhone,
        emergency_contact_name: emergencyContactName || '',
        emergency_contact_number: emergencyContactNumber || '',
        special_requests: specialRequests || null,
      };

      console.log('Creating booking with data:', bookingData);

      const response = await apiService.createBooking(bookingData);

      if (response.success) {
        Alert.alert(
          'Booking Created!',
          'Your booking has been created successfully. You will receive a confirmation email shortly.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.goBack();
                // Navigate to bookings tab
                try {
                  const parent = navigation.getParent();
                  if (parent && 'jumpTo' in parent) {
                    (parent as any).jumpTo('Bookings');
                  }
                } catch (error) {
                  console.log('Navigation error:', error);
                }
              },
            },
          ]
        );
      } else {
        console.error('Booking creation failed:', response);
        Alert.alert('Error', response.message || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      Alert.alert('Error', 'Network error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Book Package</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Package Info */}
        <View style={styles.packageInfo}>
          <Text style={styles.packageName}>{packageName}</Text>
          <Text style={styles.packagePrice}>Rs. {packagePrice} per person</Text>
        </View>

        {/* Booking Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Number of People *</Text>
            <TextInput
              style={styles.input}
              value={numberOfPeople}
              onChangeText={setNumberOfPeople}
              keyboardType="number-pad"
              placeholder="1"
            />
            <Text style={styles.helperText}>
              Maximum {maxParticipants} people available
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Travel Date *</Text>
            {hasPresetDates ? (
              <>
                <Text style={styles.helperText}>
                  Select one of the available departure dates provided by the travel company.
                </Text>
                <View style={styles.dateOptionsContainer}>
                  {normalizedAvailableDates.map((date) => {
                    const isSelected = selectedDate === date;
                    return (
                      <TouchableOpacity
                        key={date}
                        style={[styles.dateOption, isSelected && styles.dateOptionSelected]}
                        onPress={() => setSelectedDate(date)}
                      >
                        <Text
                          style={[
                            styles.dateOptionText,
                            isSelected && styles.dateOptionTextSelected,
                          ]}
                        >
                          {new Date(date).toLocaleDateString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={manualTravelDate}
                  onChangeText={setManualTravelDate}
                  placeholder="YYYY-MM-DD"
                />
                <Text style={styles.helperText}>
                  Enter your preferred travel date (YYYY-MM-DD)
                </Text>
              </>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone *</Text>
            <TextInput
              style={styles.input}
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              placeholder="Your phone number"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="Emergency contact person"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emergency Contact Number</Text>
            <TextInput
              style={styles.input}
              value={emergencyContactNumber}
              onChangeText={setEmergencyContactNumber}
              keyboardType="phone-pad"
              placeholder="Emergency contact phone"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Requests</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={specialRequests}
              onChangeText={setSpecialRequests}
              placeholder="Any special requirements or requests..."
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Price Summary */}
        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Booking Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Package:</Text>
            <Text style={styles.summaryValue}>{packageName}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Travel Date:</Text>
            <Text style={styles.summaryValue}>{displayTravelDate}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Number of People:</Text>
            <Text style={styles.summaryValue}>{numberOfPeople || '1'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Price per Person:</Text>
            <Text style={styles.summaryValue}>Rs. {packagePrice}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Amount:</Text>
            <Text style={styles.totalValue}>Rs. {totalPrice}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.bookButton, isLoading && styles.disabledButton]}
          onPress={handleCreateBooking}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Text style={styles.bookButtonText}>Confirm Booking</Text>
              <Text style={styles.bookButtonSubtext}>Rs. {totalPrice}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    padding: 20,
  },
  packageInfo: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
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
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  form: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  dateOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  dateOption: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  dateOptionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#2563eb',
  },
  dateOptionText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  dateOptionTextSelected: {
    color: 'white',
  },
  helperText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  summary: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 8,
    paddingTop: 16,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3B82F6',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  bookButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  bookButtonSubtext: {
    color: 'white',
    fontSize: 14,
    opacity: 0.9,
    marginTop: 2,
  },
});

export default CreateBookingScreen;