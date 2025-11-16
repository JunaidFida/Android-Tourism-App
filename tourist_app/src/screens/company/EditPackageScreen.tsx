import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { buildApiUrl } from '../../config/api';
import * as ImagePicker from 'expo-image-picker';

interface RouteParams {
  packageId: string;
}

interface PackageData {
  name: string;
  description: string;
  price: number;
  duration_days: number;
  destinations: string[];
  start_date: string;
  end_date: string;
  max_participants: number;
  image_urls: string[];
  highlights: string[];
  included_services: string[];
  excluded_services: string[];
  terms_conditions: string;
}

const EditPackageScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { packageId } = route.params as RouteParams;
  
  const [packageData, setPackageData] = useState<PackageData>({
    name: '',
    description: '',
    price: 0,
    duration_days: 1,
    destinations: [''],
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    max_participants: 10,
    image_urls: [],
    highlights: [''],
    included_services: [''],
    excluded_services: [''],
    terms_conditions: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [selectedStartDate, setSelectedStartDate] = useState(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState(new Date());

  useEffect(() => {
    loadPackageData();
  }, [packageId]);

  const loadPackageData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/tour-packages/${packageId}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPackageData({
          name: data.name || '',
          description: data.description || '',
          price: data.price || 0,
          duration_days: data.duration_days || 1,
          destinations: data.destinations || [''],
          start_date: data.start_date || new Date().toISOString().split('T')[0],
          end_date: data.end_date || new Date().toISOString().split('T')[0],
          max_participants: data.max_participants || 10,
          image_urls: data.image_urls || [],
          highlights: data.highlights || [''],
          included_services: data.included_services || [''],
          excluded_services: data.excluded_services || [''],
          terms_conditions: data.terms_conditions || '',
        });
        
        if (data.start_date) {
          setSelectedStartDate(new Date(data.start_date));
        }
        if (data.end_date) {
          setSelectedEndDate(new Date(data.end_date));
        }
      } else {
        Alert.alert('Error', 'Failed to load package data');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, date?: Date, isStartDate: boolean = true) => {
    if (isStartDate) {
      setShowStartDatePicker(false);
      if (date) {
        setSelectedStartDate(date);
        setPackageData(prev => ({
          ...prev,
          start_date: date.toISOString().split('T')[0]
        }));
      }
    } else {
      setShowEndDatePicker(false);
      if (date) {
        setSelectedEndDate(date);
        setPackageData(prev => ({
          ...prev,
          end_date: date.toISOString().split('T')[0]
        }));
      }
    }
  };

  const addArrayItem = (field: keyof PackageData, value: string = '') => {
    setPackageData(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }));
  };

  const removeArrayItem = (field: keyof PackageData, index: number) => {
    setPackageData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }));
  };

  const updateArrayItem = (field: keyof PackageData, index: number, value: string) => {
    setPackageData(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }));
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setPackageData(prev => ({
        ...prev,
        image_urls: [...prev.image_urls, result.assets[0].uri]
      }));
    }
  };

  const removeImage = (index: number) => {
    setPackageData(prev => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== index)
    }));
  };

  const validateForm = (): boolean => {
    if (!packageData.name.trim()) {
      Alert.alert('Error', 'Package name is required');
      return false;
    }
    if (!packageData.description.trim()) {
      Alert.alert('Error', 'Package description is required');
      return false;
    }
    if (packageData.price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return false;
    }
    if (packageData.duration_days < 1) {
      Alert.alert('Error', 'Duration must be at least 1 day');
      return false;
    }
    if (packageData.max_participants < 1) {
      Alert.alert('Error', 'Maximum participants must be at least 1');
      return false;
    }
    if (packageData.destinations.length === 0 || !packageData.destinations[0].trim()) {
      Alert.alert('Error', 'At least one destination is required');
      return false;
    }
    return true;
  };

  const savePackage = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/tour-packages/${packageId}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(packageData),
      });

      if (response.ok) {
        Alert.alert('Success', 'Package updated successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          }
        ]);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to update package');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setSaving(false);
    }
  };

  const renderArrayInput = (
    field: keyof PackageData,
    label: string,
    placeholder: string,
    icon: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{label}</Text>
      {(packageData[field] as string[]).map((item, index) => (
        <View key={index} style={styles.arrayInputRow}>
          <TextInput
            style={styles.arrayTextInput}
            value={item}
            onChangeText={(text) => updateArrayItem(field, index, text)}
            placeholder={placeholder}
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => removeArrayItem(field, index)}
          >
            <AntDesign name="close" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => addArrayItem(field)}
      >
        <AntDesign name="plus" size={16} color="#3B82F6" />
        <Text style={styles.addButtonText}>Add {label}</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading package data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <AntDesign name="arrowleft" size={24} color="#3B82F6" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Package</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <Text style={styles.inputLabel}>Package Name *</Text>
          <TextInput
            style={styles.textInput}
            value={packageData.name}
            onChangeText={(text) => setPackageData(prev => ({ ...prev, name: text }))}
            placeholder="Enter package name"
          />

          <Text style={styles.inputLabel}>Description *</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={packageData.description}
            onChangeText={(text) => setPackageData(prev => ({ ...prev, description: text }))}
            placeholder="Describe your tour package"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Price (Rs.) *</Text>
              <TextInput
                style={styles.textInput}
                value={packageData.price.toString()}
                onChangeText={(text) => setPackageData(prev => ({ ...prev, price: parseFloat(text) || 0 }))}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Duration (days) *</Text>
              <TextInput
                style={styles.textInput}
                value={packageData.duration_days.toString()}
                onChangeText={(text) => setPackageData(prev => ({ ...prev, duration_days: parseInt(text) || 1 }))}
                placeholder="1"
                keyboardType="numeric"
              />
            </View>
          </View>

          <Text style={styles.inputLabel}>Max Participants *</Text>
          <TextInput
            style={styles.textInput}
            value={packageData.max_participants.toString()}
            onChangeText={(text) => setPackageData(prev => ({ ...prev, max_participants: parseInt(text) || 1 }))}
            placeholder="10"
            keyboardType="numeric"
          />
        </View>

        {/* Dates */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tour Dates</Text>
          
          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>Start Date</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={styles.dateText}>{packageData.start_date}</Text>
                <AntDesign name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <View style={styles.halfWidth}>
              <Text style={styles.inputLabel}>End Date</Text>
              <TouchableOpacity
                style={styles.dateSelector}
                onPress={() => setShowEndDatePicker(true)}
              >
                <Text style={styles.dateText}>{packageData.end_date}</Text>
                <AntDesign name="calendar" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Destinations */}
        {renderArrayInput('destinations', 'Destinations', 'Enter destination name', 'enviromento')}

        {/* Highlights */}
        {renderArrayInput('highlights', 'Highlights', 'Enter highlight feature', 'star')}

        {/* Included Services */}
        {renderArrayInput('included_services', 'Included Services', 'Enter included service', 'check')}

        {/* Excluded Services */}
        {renderArrayInput('excluded_services', 'Excluded Services', 'Enter excluded service', 'close')}

        {/* Images */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Package Images</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
            {packageData.image_urls.map((url, index) => (
              <View key={index} style={styles.imageContainer}>
                <Image source={{ uri: url }} style={styles.packageImage} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={() => removeImage(index)}
                >
                  <AntDesign name="close" size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
              <AntDesign name="plus" size={32} color="#6B7280" />
              <Text style={styles.addImageText}>Add Image</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={packageData.terms_conditions}
            onChangeText={(text) => setPackageData(prev => ({ ...prev, terms_conditions: text }))}
            placeholder="Enter terms and conditions"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={savePackage}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Update Package</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showStartDatePicker && (
        <DateTimePicker
          value={selectedStartDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleDateChange(event, date, true)}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={selectedEndDate}
          mode="date"
          display="default"
          onChange={(event, date) => handleDateChange(event, date, false)}
          minimumDate={selectedStartDate}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
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
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  arrayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  arrayTextInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    marginRight: 12,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: '#3B82F6',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
  },
  addButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
  },
  imagesContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  packageImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageButton: {
    width: 120,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
  },
  saveButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default EditPackageScreen;
