import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { buildApiUrl } from '../../config/api';

interface RatePackageScreenParams {
  tourPackageId: string;
  packageName?: string;
  bookingId?: string;
}

const RatePackageScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params as RatePackageScreenParams | undefined;
  const authState = useSelector((state: RootState) => state.auth);
  const user = authState?.user;
  
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const packageName = useMemo(() => params?.packageName || 'Tour Package', [params?.packageName]);

  const submitRating = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating between 1-5 stars');
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication required', 'Please log in again to rate this package.');
      return;
    }

  if (!params?.tourPackageId) {
      Alert.alert('Error', 'Package details missing. Please reopen the booking and try again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const token = (await AsyncStorage.getItem('access_token')) || (await AsyncStorage.getItem('authToken'));
      if (!token) {
        Alert.alert('Authentication required', 'Please log in again to rate this package.');
        return;
      }

      const response = await fetch(buildApiUrl('/ratings/'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tour_package_id: params?.tourPackageId,
          tourist_id: user.id,
          rating,
          review: comment || undefined,
          booking_id: params?.bookingId,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Rating Submitted', 
          'Thank you for your feedback!',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            }
          ]
        );
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to submit rating');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <AntDesign
              name={rating >= star ? 'star' : 'staro'}
              size={40}
              color={rating >= star ? '#FFD700' : '#d1d5db'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const getRatingText = () => {
    switch (rating) {
      case 1: return 'Poor';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Very Good';
      case 5: return 'Excellent';
      default: return 'Select a rating';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView style={styles.scrollView}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <AntDesign name="arrowleft" size={24} color="#111827" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rate Package</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Package Info */}
          <View style={styles.packageInfo}>
            <Text style={styles.packageName} numberOfLines={2}>
              {packageName}
            </Text>
            <Text style={styles.subtitle}>
              How was your experience with this package?
            </Text>
          </View>

          {/* Star Rating */}
          <View style={styles.ratingSection}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            {renderStars()}
            <Text style={styles.ratingText}>{getRatingText()}</Text>
          </View>

          {/* Comment Section */}
          <View style={styles.commentSection}>
            <Text style={styles.sectionTitle}>Your Review (Optional)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Share your experience with this tour package..."
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              placeholderTextColor="#9ca3af"
              textAlignVertical="top"
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.submitButton,
              (rating === 0 || isSubmitting) && styles.submitButtonDisabled
            ]}
            onPress={submitRating}
            disabled={rating === 0 || isSubmitting}
          >
            <Text style={[
              styles.submitButtonText,
              (rating === 0 || isSubmitting) && styles.submitButtonTextDisabled
            ]}>
              {isSubmitting ? 'Submitting...' : 'Submit Rating'}
            </Text>
          </TouchableOpacity>

          {/* Rating Guidelines */}
          <View style={styles.guidelines}>
            <Text style={styles.guidelinesTitle}>Rating Guidelines:</Text>
            <View style={styles.guidelineItem}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.guidelineText}>1 Star: Poor experience</Text>
            </View>
            <View style={styles.guidelineItem}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.guidelineText}>2 Stars: Fair experience</Text>
            </View>
            <View style={styles.guidelineItem}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.guidelineText}>3 Stars: Good experience</Text>
            </View>
            <View style={styles.guidelineItem}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.guidelineText}>4 Stars: Very good experience</Text>
            </View>
            <View style={styles.guidelineItem}>
              <AntDesign name="star" size={16} color="#FFD700" />
              <Text style={styles.guidelineText}>5 Stars: Excellent experience</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 32,
  },
  packageInfo: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  packageName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  ratingSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#3B82F6',
  },
  commentSection: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    minHeight: 120,
    backgroundColor: '#f8fafc',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    margin: 20,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#d1d5db',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  submitButtonTextDisabled: {
    color: '#9ca3af',
  },
  guidelines: {
    padding: 20,
    backgroundColor: 'white',
    marginTop: 8,
    marginBottom: 20,
  },
  guidelinesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  guidelineText: {
    fontSize: 14,
    color: '#6b7280',
  },
});

export default RatePackageScreen;
