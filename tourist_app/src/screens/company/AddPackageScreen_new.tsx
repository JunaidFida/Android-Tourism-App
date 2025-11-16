import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { selectUser } from '../../store/selectors';
import { apiService } from '../../services/apiService';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { buildApiUrl } from '../../config/api';

const AddPackageScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const user = useAppSelector(selectUser);
  const isEditMode = route?.params?.mode === 'edit';
  const editingPackage = route?.params?.package;

  const initialLocationAddress =
    editingPackage?.location?.address ||
    editingPackage?.location_address ||
    '';
  const initialLatitude =
    typeof editingPackage?.location?.latitude === 'number'
      ? editingPackage.location.latitude
      : typeof editingPackage?.latitude === 'number'
        ? editingPackage.latitude
        : 0;
  const initialLongitude =
    typeof editingPackage?.location?.longitude === 'number'
      ? editingPackage.location.longitude
      : typeof editingPackage?.longitude === 'number'
        ? editingPackage.longitude
        : 0;

  const [formData, setFormData] = useState({
    title: editingPackage?.title || editingPackage?.name || '',
    description: editingPackage?.description || '',
    price: editingPackage?.price?.toString() || '',
    duration_days: editingPackage?.duration_days?.toString() || '1',
    group_size: (editingPackage?.group_size || editingPackage?.max_participants)?.toString() || '10',
    category: editingPackage?.category || 'adventure',
    difficulty_level: editingPackage?.difficulty_level || 'easy',
    location_address: initialLocationAddress,
    included_spots: editingPackage?.included_spots?.join(', ') || editingPackage?.destinations?.join(', ') || '',
    includes: editingPackage?.includes?.join(', ') || '',
    excludes: editingPackage?.excludes?.join(', ') || '',
  });

  const [availableDates, setAvailableDates] = useState<string[]>(
    editingPackage?.available_dates
      ? editingPackage.available_dates
          .map((date: string) => {
            const parsed = new Date(date);
            if (isNaN(parsed.getTime())) {
              return null;
            }
            parsed.setHours(0, 0, 0, 0);
            return parsed.toISOString();
          })
          .filter((date: string | null): date is string => !!date)
      : []
  );

  const [selectedImages, setSelectedImages] = useState<string[]>(editingPackage?.image_urls || []);
  const [loading, setLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerValue, setDatePickerValue] = useState<Date>(new Date());
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  }>({
    latitude: initialLatitude,
    longitude: initialLongitude,
    address: initialLocationAddress,
  });

  const normalizeDate = (date: Date) => {
    const cloned = new Date(date);
    cloned.setHours(0, 0, 0, 0);
    return cloned;
  };

  const addDateToList = (date: Date) => {
    const normalized = normalizeDate(date);
    const isoString = normalized.toISOString();

    setAvailableDates((prev) => {
      const exists = prev.some((existing) => {
        const existingDate = normalizeDate(new Date(existing));
        return existingDate.getTime() === normalized.getTime();
      });

      if (exists) {
        return prev;
      }

      return [...prev, isoString];
    });
  };

  const handleDatePickerChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }

    if (event.type === 'dismissed') {
      return;
    }

    const date = selectedDate || datePickerValue;

    if (Platform.OS === 'ios') {
      setDatePickerValue(date);
    } else {
      addDateToList(date);
    }
  };

  const confirmIOSDate = () => {
    addDateToList(datePickerValue);
    setShowDatePicker(false);
  };

  const handleRemoveDate = (dateIso: string) => {
    setAvailableDates((prev) => prev.filter((date) => date !== dateIso));
  };

  const getFullImageUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) {
      return url;
    }
    return buildApiUrl(url);
  };

  const applySelectedLocation = useCallback(
    (selectedLocation: {
      latitude: number;
      longitude: number;
      address?: string;
      name?: string;
    }) => {
      if (
        !selectedLocation ||
        typeof selectedLocation.latitude !== 'number' ||
        !Number.isFinite(selectedLocation.latitude) ||
        typeof selectedLocation.longitude !== 'number' ||
        !Number.isFinite(selectedLocation.longitude)
      ) {
        return;
      }

      setLocation({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        address: selectedLocation.address || location.address,
      });

      if (selectedLocation.address) {
        setFormData((prev) => ({
          ...prev,
          location_address: selectedLocation.address || prev.location_address,
        }));
      }
    },
    [location.address]
  );

  const openLocationPicker = () => {
    const hasValidCoordinates =
      typeof location.latitude === 'number' &&
      Number.isFinite(location.latitude) &&
      typeof location.longitude === 'number' &&
      Number.isFinite(location.longitude);

    const initialLocationPayload = hasValidCoordinates
      ? {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || formData.location_address || undefined,
          name: formData.title || undefined,
        }
      : undefined;

    navigation.navigate(
      'LocationPicker' as never,
      {
        initialLocation: initialLocationPayload,
        onLocationSelected: applySelectedLocation,
      } as never
    );
  };

  const handleRemoveImage = (imageUrl: string) => {
    setSelectedImages((prev) => prev.filter((url) => url !== imageUrl));
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      const asset = result.assets[0];
      setIsUploadingImage(true);

      const uploadResponse = await apiService.uploadImage({
        uri: asset.uri,
        name: asset.fileName || `package_${Date.now()}.jpg`,
        type: asset.mimeType || 'image/jpeg',
      });

      if (uploadResponse.success && uploadResponse.data) {
        const uploadedUrl = uploadResponse.data.image_url || uploadResponse.data.url;
        if (uploadedUrl) {
          setSelectedImages((prev) => [...prev, uploadedUrl]);
        } else {
          Alert.alert('Upload Failed', 'The server did not return an image URL.');
        }
      } else {
        Alert.alert('Upload Failed', uploadResponse.message || 'Unable to upload image. Please try again.');
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'An error occurred while selecting the image.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.title.trim() || !formData.description.trim() || !formData.price.trim() || 
        !formData.location_address.trim() || !formData.category) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const durationDays = parseInt(formData.duration_days);
    if (isNaN(durationDays) || durationDays <= 0) {
      Alert.alert('Error', 'Please enter a valid duration');
      return;
    }

    const groupSize = parseInt(formData.group_size);
    if (isNaN(groupSize) || groupSize <= 0) {
      Alert.alert('Error', 'Please enter a valid group size');
      return;
    }

    // Ensure user ID exists
    if (!user?.id) {
      Alert.alert('Error', 'User information not found. Please log in again.');
      return;
    }

    if (!location || !Number.isFinite(location.latitude) || !Number.isFinite(location.longitude)) {
      Alert.alert('Error', 'Please select a valid location for this package using the map picker.');
      return;
    }

    if (location.latitude === 0 && location.longitude === 0) {
      Alert.alert('Error', 'Please select a valid location for this package using the map picker.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: formData.title.trim(), // Use 'title' as alias for 'name'
        description: formData.description.trim(),
        price: price,
        duration_days: durationDays,
        group_size: groupSize, // Use 'group_size' as alias for 'max_participants'
        category: formData.category,
        difficulty_level: formData.difficulty_level,
        location: {
          address: formData.location_address.trim(),
          latitude: location.latitude,
          longitude: location.longitude,
        },
        destinations: formData.included_spots ? formData.included_spots.split(',').map(s => s.trim()).filter(s => s) : [],
        included_spots: formData.included_spots ? formData.included_spots.split(',').map(s => s.trim()).filter(s => s) : [],
        includes: formData.includes ? formData.includes.split(',').map(s => s.trim()).filter(s => s) : [],
        excludes: formData.excludes ? formData.excludes.split(',').map(s => s.trim()).filter(s => s) : [],
        image_urls: selectedImages,
        available_dates: availableDates,
        status: 'active',
        created_by: user?.id,
        travel_company_id: user?.id, // Explicitly set travel_company_id
      };

      let response;
      if (isEditMode && editingPackage?.id) {
        response = await apiService.updateTourPackage(editingPackage.id, payload);
      } else {
        response = await apiService.createTourPackage(payload);
      }

      if (response.success) {
        Alert.alert(
          'Success',
          `Package ${isEditMode ? 'updated' : 'created'} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Error', response.message || `Failed to ${isEditMode ? 'update' : 'create'} package`);
      }
    } catch (error: any) {
      console.error('Package operation error:', error);
      Alert.alert('Error', error.message || `Failed to ${isEditMode ? 'update' : 'create'} package`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditMode ? 'Edit Package' : 'Add New Package'}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Package Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter package title"
              value={formData.title}
              onChangeText={(text) => setFormData(prev => ({ ...prev, title: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your tour package"
              value={formData.description}
              onChangeText={(text) => setFormData(prev => ({ ...prev, description: text }))}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Price (Rs.) *</Text>
              <TextInput
                style={styles.input}
                placeholder="0"
                value={formData.price}
                onChangeText={(text) => setFormData(prev => ({ ...prev, price: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Duration (days) *</Text>
              <TextInput
                style={styles.input}
                placeholder="1"
                value={formData.duration_days}
                onChangeText={(text) => setFormData(prev => ({ ...prev, duration_days: text }))}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Group Size *</Text>
              <TextInput
                style={styles.input}
                placeholder="10"
                value={formData.group_size}
                onChangeText={(text) => setFormData(prev => ({ ...prev, group_size: text }))}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Difficulty Level *</Text>
              <TouchableOpacity
                style={styles.picker}
                onPress={() => {
                  Alert.alert('Select Difficulty', '', [
                    { text: 'Easy', onPress: () => setFormData(prev => ({ ...prev, difficulty_level: 'easy' })) },
                    { text: 'Medium', onPress: () => setFormData(prev => ({ ...prev, difficulty_level: 'medium' })) },
                    { text: 'Hard', onPress: () => setFormData(prev => ({ ...prev, difficulty_level: 'hard' })) },
                  ]);
                }}
              >
                <Text style={styles.pickerText}>{formData.difficulty_level}</Text>
                <AntDesign name="down" size={16} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => {
                Alert.alert('Select Category', '', [
                  { text: 'Adventure', onPress: () => setFormData(prev => ({ ...prev, category: 'adventure' })) },
                  { text: 'Cultural', onPress: () => setFormData(prev => ({ ...prev, category: 'cultural' })) },
                  { text: 'Nature', onPress: () => setFormData(prev => ({ ...prev, category: 'nature' })) },
                  { text: 'Historical', onPress: () => setFormData(prev => ({ ...prev, category: 'historical' })) },
                  { text: 'Beach', onPress: () => setFormData(prev => ({ ...prev, category: 'beach' })) },
                  { text: 'Mountain', onPress: () => setFormData(prev => ({ ...prev, category: 'mountain' })) },
                ]);
              }}
            >
              <Text style={styles.pickerText}>{formData.category}</Text>
              <AntDesign name="down" size={16} color="#6B7280" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter location address"
              value={formData.location_address}
              onChangeText={(text) => {
                setFormData(prev => ({ ...prev, location_address: text }));
                setLocation(prev => ({ ...prev, address: text }));
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={openLocationPicker}
          >
            <AntDesign name="enviromento" size={16} color="#2563EB" />
            <Text style={styles.secondaryButtonText}>Pick Location on Map</Text>
          </TouchableOpacity>

          <View style={styles.locationSummary}>
            <Text style={styles.helperText}>
              Latitude:{' '}
              {typeof location.latitude === 'number' && Number.isFinite(location.latitude)
                ? location.latitude.toFixed(6)
                : 'Not set'}
            </Text>
            <Text style={styles.helperText}>
              Longitude:{' '}
              {typeof location.longitude === 'number' && Number.isFinite(location.longitude)
                ? location.longitude.toFixed(6)
                : 'Not set'}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Included Tourist Spots</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter spots separated by commas"
              value={formData.included_spots}
              onChangeText={(text) => setFormData(prev => ({ ...prev, included_spots: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's Included</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter items separated by commas"
              value={formData.includes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, includes: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>What's Excluded</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter items separated by commas"
              value={formData.excludes}
              onChangeText={(text) => setFormData(prev => ({ ...prev, excludes: text }))}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Available Dates</Text>
            <Text style={styles.helperText}>
              Add the dates when this package is available for booking.
            </Text>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                setDatePickerValue(new Date());
                setShowDatePicker(true);
              }}
            >
              <AntDesign name="calendar" size={16} color="#2563EB" />
              <Text style={styles.secondaryButtonText}>Add Available Date</Text>
            </TouchableOpacity>

            {availableDates.length > 0 ? (
              <View style={styles.chipContainer}>
                {availableDates.map((date) => (
                  <View key={date} style={styles.chip}>
                    <Text style={styles.chipText}>{new Date(date).toLocaleDateString()}</Text>
                    <TouchableOpacity style={styles.chipRemoveButton} onPress={() => handleRemoveDate(date)}>
                      <AntDesign name="close" size={12} color="white" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.helperTextMuted}>No dates added yet.</Text>
            )}
          </View>
        </View>

        {showDatePicker && (
          <View style={styles.datePickerWrapper}>
            <DateTimePicker
              value={datePickerValue}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDatePickerChange}
              minimumDate={new Date()}
            />
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerActions}>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.datePickerCancel]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.datePickerButton, styles.datePickerConfirm]}
                  onPress={confirmIOSDate}
                >
                  <Text style={[styles.datePickerButtonText, styles.datePickerConfirmText]}>Add Date</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Images</Text>
          <Text style={styles.helperText}>
            Upload images to showcase this tour package. The images will be stored on the server and linked automatically.
          </Text>

          <View style={styles.imageGrid}>
            {selectedImages.map((imageUrl) => (
              <View key={imageUrl} style={styles.imageItem}>
                <Image source={{ uri: getFullImageUrl(imageUrl) }} style={styles.imageThumbnail} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => handleRemoveImage(imageUrl)}
                >
                  <AntDesign name="close" size={12} color="white" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity
              style={styles.imagePickerButton}
              onPress={handlePickImage}
              disabled={isUploadingImage}
            >
              {isUploadingImage ? (
                <ActivityIndicator color="#2563EB" />
              ) : (
                <>
                  <AntDesign name="plus" size={20} color="#2563EB" />
                  <Text style={styles.imagePickerText}>Add Image</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {selectedImages.length === 0 && !isUploadingImage && (
            <Text style={styles.helperTextMuted}>
              Add at least one image to help travellers understand your package better.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? 'Update Package' : 'Create Package'}
            </Text>
          )}
        </TouchableOpacity>
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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  helperTextMuted: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 8,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  pickerText: {
    fontSize: 16,
    color: '#111827',
    textTransform: 'capitalize',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  locationSummary: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  chipRemoveButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 4,
    borderRadius: 12,
  },
  datePickerWrapper: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 12,
  },
  datePickerButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  datePickerCancel: {
    backgroundColor: '#F3F4F6',
  },
  datePickerConfirm: {
    backgroundColor: '#2563EB',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  datePickerConfirmText: {
    color: 'white',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  imageItem: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#E5E7EB',
  },
  imageThumbnail: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 4,
    borderRadius: 12,
  },
  imagePickerButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  imagePickerText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default AddPackageScreen;