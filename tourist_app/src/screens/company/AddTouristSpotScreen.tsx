import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import CompanySpotService, { TouristSpotData } from '../../services/companySpotService';
import apiService from '../../services/apiService';

const CATEGORIES = [
  'Historical', 'Natural', 'Adventure', 'Religious', 'Cultural', 
  'Entertainment', 'Shopping', 'Food & Dining', 'Museums', 'Parks'
];


const AddTouristSpotScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [spotData, setSpotData] = useState<TouristSpotData>({
    name: '',
    description: '',
    location: {
      latitude: 31.5204,
      longitude: 74.3587,
      address: '',
    },
    categories: [],
    images: [],
  });

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

      setSpotData((prev) => ({
        ...prev,
        location: {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
          address: selectedLocation.address || prev.location.address,
        },
      }));
    },
    []
  );

  const openLocationPicker = () => {
    const hasValidCoordinates =
      typeof spotData.location.latitude === 'number' &&
      Number.isFinite(spotData.location.latitude) &&
      typeof spotData.location.longitude === 'number' &&
      Number.isFinite(spotData.location.longitude);

    const initialLocationPayload = hasValidCoordinates
      ? {
          latitude: spotData.location.latitude,
          longitude: spotData.location.longitude,
          address: spotData.location.address,
          name: spotData.name,
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

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to add tourist spots');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setSpotData((prev) => ({
        ...prev,
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          address: address[0]
            ? `${address[0].street || ''}${address[0].street && address[0].city ? ', ' : ''}${address[0].city || ''}${address[0].country ? `, ${address[0].country}` : ''}`
            : prev.location.address,
        },
      }));
    } catch (error) {
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLocationLoading(false);
    }
  };

  const checkLocationExists = async () => {
    const result = await CompanySpotService.checkSpotExists(
      spotData.location.latitude,
      spotData.location.longitude
    );

    if (result.success && result.exists) {
      Alert.alert(
        'Location Already Exists',
        `A tourist spot "${result.spot?.name}" already exists at this location. Please choose a different location.`,
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const toggleCategory = (category: string) => {
    setSpotData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category],
    }));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to add photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingImage(true);
        
        try {
          // Upload image immediately
          const uploadResponse = await apiService.uploadImage({
            uri: asset.uri,
            name: asset.fileName || `spot_${Date.now()}.jpg`,
            type: asset.mimeType || 'image/jpeg',
          });

          if (uploadResponse.success && uploadResponse.data) {
            const uploadedUrl = uploadResponse.data.image_url || uploadResponse.data.url;
            if (uploadedUrl) {
              setSpotData(prev => ({
                ...prev,
                images: [...prev.images, uploadedUrl],
              }));
            } else {
              Alert.alert('Upload Failed', 'The server did not return an image URL.');
            }
          } else {
            Alert.alert('Upload Failed', uploadResponse.message || 'Unable to upload image. Please try again.');
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please check your connection and try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
      setUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingImage(true);
        
        try {
          // Upload image immediately
          const uploadResponse = await apiService.uploadImage({
            uri: asset.uri,
            name: `spot_${Date.now()}.jpg`,
            type: 'image/jpeg',
          });

          if (uploadResponse.success && uploadResponse.data) {
            const uploadedUrl = uploadResponse.data.image_url || uploadResponse.data.url;
            if (uploadedUrl) {
              setSpotData(prev => ({
                ...prev,
                images: [...prev.images, uploadedUrl],
              }));
            } else {
              Alert.alert('Upload Failed', 'The server did not return an image URL.');
            }
          } else {
            Alert.alert('Upload Failed', uploadResponse.message || 'Unable to upload image. Please try again.');
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
          Alert.alert('Error', 'Failed to upload image. Please check your connection and try again.');
        } finally {
          setUploadingImage(false);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setSpotData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!spotData.name.trim() || !spotData.description.trim()) {
      Alert.alert('Error', 'Name and description are required');
      return;
    }

    if (spotData.categories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    if (spotData.images.length === 0) {
      Alert.alert('Error', 'Please add at least one photo');
      return;
    }

    const locationExists = await checkLocationExists();
    if (!locationExists) return;

    setLoading(true);
    try {
      const result = await CompanySpotService.addTouristSpot(spotData);
      
      if (result.success) {
        Alert.alert(
          'Success',
          'Tourist spot added successfully! It will be reviewed by admin before being published.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', result.message || 'Failed to add tourist spot');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
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
        <Text style={styles.headerTitle}>Add Tourist Spot</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Spot Name *</Text>
            <TextInput
              style={styles.textInput}
              value={spotData.name}
              onChangeText={(text) => setSpotData(prev => ({ ...prev, name: text }))}
              placeholder="Enter tourist spot name"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={spotData.description}
              onChangeText={(text) => setSpotData(prev => ({ ...prev, description: text }))}
              placeholder="Describe the tourist spot"
              multiline
              numberOfLines={4}
            />
          </View>

        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.locationContainer}>
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider={PROVIDER_GOOGLE}
                region={{
                  latitude:
                    typeof spotData.location.latitude === 'number' && Number.isFinite(spotData.location.latitude)
                      ? spotData.location.latitude
                      : 31.5204,
                  longitude:
                    typeof spotData.location.longitude === 'number' && Number.isFinite(spotData.location.longitude)
                      ? spotData.location.longitude
                      : 74.3587,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
              >
                {Number.isFinite(spotData.location.latitude) && Number.isFinite(spotData.location.longitude) && (
                  <Marker
                    coordinate={{
                      latitude: spotData.location.latitude,
                      longitude: spotData.location.longitude,
                    }}
                    title="Tourist Spot Location"
                  />
                )}
              </MapView>
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={openLocationPicker}
              >
                <AntDesign name="pushpin" size={16} color="white" />
                <Text style={styles.locationButtonText}>Pick on Map</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.locationButton, styles.secondaryLocationButton]}
                onPress={getCurrentLocation}
                disabled={locationLoading}
              >
                {locationLoading ? (
                  <ActivityIndicator color="#2563EB" />
                ) : (
                  <>
                    <AntDesign name="enviromento" size={16} color="#2563EB" />
                    <Text style={[styles.locationButtonText, styles.secondaryLocationButtonText]}>
                      Use Current Location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={styles.textInput}
              value={spotData.location.address}
              onChangeText={(text) => setSpotData(prev => ({
                ...prev,
                location: { ...prev.location, address: text }
              }))}
              placeholder="Enter address"
            />
          </View>

          <View style={styles.coordinatesRow}>
            <Text style={styles.coordinatesText}>
              Latitude:{' '}
              {Number.isFinite(spotData.location.latitude)
                ? spotData.location.latitude.toFixed(6)
                : 'Not set'}
            </Text>
            <Text style={styles.coordinatesText}>
              Longitude:{' '}
              {Number.isFinite(spotData.location.longitude)
                ? spotData.location.longitude.toFixed(6)
                : 'Not set'}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories *</Text>
          <View style={styles.tagsContainer}>
            {CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.tag,
                  spotData.categories.includes(category) && styles.tagSelected
                ]}
                onPress={() => toggleCategory(category)}
              >
                <Text style={[
                  styles.tagText,
                  spotData.categories.includes(category) && styles.tagTextSelected
                ]}>
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos *</Text>
          {uploadingImage && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.uploadingText}>Uploading image...</Text>
            </View>
          )}
          <View style={styles.photoButtons}>
            <TouchableOpacity 
              style={[styles.photoButton, uploadingImage && styles.photoButtonDisabled]} 
              onPress={pickImage}
              disabled={uploadingImage}
            >
              <AntDesign name="picture" size={20} color="#2563EB" />
              <Text style={styles.photoButtonText}>Choose from Library</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.photoButton, uploadingImage && styles.photoButtonDisabled]} 
              onPress={takePhoto}
              disabled={uploadingImage}
            >
              <AntDesign name="camera" size={20} color="#2563EB" />
              <Text style={styles.photoButtonText}>Take Photo</Text>
            </TouchableOpacity>
          </View>
          
          {spotData.images.length > 0 && (
            <FlatList
              horizontal
              data={spotData.images}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item, index }) => (
                <View style={styles.imageContainer}>
                  <Image source={{ uri: item }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                    disabled={uploadingImage}
                  >
                    <AntDesign name="closecircle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
              showsHorizontalScrollIndicator={false}
            />
          )}
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.submitButtonText}>Add Tourist Spot</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
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
    shadowRadius: 3.84,
    elevation: 5,
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  locationContainer: {
    marginBottom: 16,
  },
  mapContainer: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  map: {
    flex: 1,
  },
  markerContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  marker: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    padding: 12,
    borderRadius: 8,
  },
  secondaryLocationButton: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  locationButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  secondaryLocationButtonText: {
    color: '#2563EB',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  tagSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  tagText: {
    fontSize: 14,
    color: '#374151',
  },
  tagTextSelected: {
    color: 'white',
  },
  locationActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  coordinatesRow: {
    marginTop: 8,
    backgroundColor: '#F9FAFB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  coordinatesText: {
    fontSize: 13,
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  photoButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  photoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  photoButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  imageContainer: {
    position: 'relative',
    marginRight: 12,
    marginBottom: 12,
  },
  imagePreview: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  uploadingText: {
    color: '#2563EB',
    fontSize: 14,
  },
  photoButtonDisabled: {
    opacity: 0.5,
  },
});

export default AddTouristSpotScreen;