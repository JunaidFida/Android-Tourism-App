import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { buildApiUrl } from '../../config/api';
import { selectUser } from '../../store/selectors';
import { clearUser, updateUser } from '../../store/slices/authSlice';
import { UserRole } from '../../types';
import * as ImagePicker from 'expo-image-picker';

interface ProfileData {
  full_name: string;
  email: string;
  phone_number: string;
  profile_picture?: string;
  preferences?: {
    notifications: boolean;
    email_updates: boolean;
    language: string;
  };
}

const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectUser);
  const navigation = useNavigation();
  const [profileData, setProfileData] = useState<ProfileData>({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone_number: user?.phone_number || '',
    profile_picture: user?.profile_picture,
    preferences: {
      notifications: true,
      email_updates: true,
      language: 'English',
    },
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tempPreferences, setTempPreferences] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        full_name: user.full_name || '',
        email: user.email || '',
        phone_number: user.phone_number || '',
        profile_picture: user.profile_picture,
        preferences: {
          notifications: true,
          email_updates: true,
          language: 'English',
        },
      });
    }
  }, [user]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      
      // Upload image immediately
      try {
        const token = await AsyncStorage.getItem('access_token');
        const formData = new FormData();
        
        // Get file extension
        const uriParts = uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        formData.append('file', {
          uri: uri,
          name: `profile_${user?.id}.${fileType}`,
          type: `image/${fileType}`,
        } as any);

        const uploadResponse = await fetch(buildApiUrl('/images/upload'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          const imageUrl = uploadData.url || uploadData.image_url;
          
          setProfileData(prev => ({
            ...prev,
            profile_picture: imageUrl
          }));
        } else {
          Alert.alert('Error', 'Failed to upload image');
        }
      } catch (error) {
        console.error('Image upload error:', error);
        Alert.alert('Error', 'Failed to upload image');
      }
    }
  };

  const saveProfile = async () => {
    if (!profileData.full_name.trim() || !profileData.email.trim()) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl(`/users/${user?.id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          full_name: profileData.full_name,
          email: profileData.email,
          phone_number: profileData.phone_number,
          profile_picture: profileData.profile_picture,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        // Update Redux store with new user data
        dispatch(updateUser(updatedUser));
        
        // Also update AsyncStorage to persist changes
        await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
        
        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.detail || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(buildApiUrl('/auth/change-password'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Password changed successfully');
        setShowPasswordModal(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', 'Failed to change password');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          style: 'destructive',
          onPress: () => {
            dispatch(clearUser());
            AsyncStorage.multiRemove(['access_token', 'user_data']);
          }
        }
      ]
    );
  };

  const openPreferencesModal = () => {
    // Initialize temp preferences with current values
    setTempPreferences({
      ...profileData.preferences,
      ...getDefaultPreferences()
    });
    setShowPreferencesModal(true);
  };

  const getDefaultPreferences = () => {
    switch (user?.role) {
      case UserRole.TRAVEL_COMPANY:
        return {
          notifications: true,
          email_updates: true,
          business_categories: ['adventure', 'cultural'],
          target_regions: ['Punjab', 'Sindh'],
          booking_notifications: true,
          marketing_emails: false,
        };
      
      case UserRole.ADMIN:
        return {
          notifications: true,
          email_updates: true,
          system_alerts: true,
          user_activity_reports: true,
          security_notifications: true,
          maintenance_mode: false,
        };
      
      default: // Tourist
        return {
          notifications: true,
          email_updates: true,
          preferred_categories: ['historical', 'natural'],
          budget_range: { min: 20000, max: 100000 },
          preferred_regions: ['Punjab', 'Sindh'],
          travel_style: 'cultural',
          group_size_preference: 10,
        };
    }
  };

  const savePreferences = async () => {
    try {
      setIsLoading(true);
      
      // Update local state
      setProfileData(prev => ({
        ...prev,
        preferences: tempPreferences
      }));

      // Update user in Redux store
      dispatch(updateUser({ preferences: tempPreferences }));

      // Save to backend
      const token = await AsyncStorage.getItem('access_token');
      await fetch(buildApiUrl(`/users/${user?.id}/preferences`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ preferences: tempPreferences }),
      });

      Alert.alert('Success', 'Preferences saved successfully');
      setShowPreferencesModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save preferences');
    } finally {
      setIsLoading(false);
    }
  };

  const cancelPreferences = () => {
    setTempPreferences(null);
    setShowPreferencesModal(false);
  };

  const getRoleSpecificOptions = () => {
    switch (user?.role) {
      case UserRole.TRAVEL_COMPANY:
        return [
          {
            title: 'Company Preferences',
            icon: 'setting',
            onPress: () => openPreferencesModal(),
          },
          {
            title: 'Business Analytics',
            icon: 'barschart',
            onPress: () => navigation.navigate('Analytics' as never),
          },
          {
            title: 'Manage Packages',
            icon: 'gift',
            onPress: () => navigation.navigate('ManagePackages' as never),
          },
        ];
      
      case UserRole.ADMIN:
        return [];
      
      default: // Tourist
        return [
          {
            title: 'Travel Preferences',
            icon: 'heart',
            onPress: () => openPreferencesModal(),
          },
          {
            title: 'Booking History',
            icon: 'calendar',
            onPress: () => {
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
          {
            title: 'Explore Destinations',
            icon: 'search1',
            onPress: () => navigation.navigate('Explore' as never),
          },
        ];
    }
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Profile Information</Text>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Text style={styles.editButtonText}>
            {isEditing ? 'Cancel' : 'Edit'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileImageContainer}>
        <TouchableOpacity onPress={isEditing ? pickImage : undefined}>
          <Image
            source={
              profileData.profile_picture
                ? { 
                    uri: profileData.profile_picture.startsWith('http') 
                      ? profileData.profile_picture 
                      : buildApiUrl(profileData.profile_picture)
                  }
                : require('../../../assets/icon.png')
            }
            style={styles.profileImage}
          />
          {isEditing && (
            <View style={styles.imageEditOverlay}>
              <AntDesign name="camera" size={20} color="white" />
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Full Name</Text>
        <TextInput
          style={[styles.textInput, !isEditing && styles.disabledInput]}
          value={profileData.full_name}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, full_name: text }))}
          editable={isEditing}
          placeholder="Enter your full name"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={[styles.textInput, !isEditing && styles.disabledInput]}
          value={profileData.email}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, email: text }))}
          editable={isEditing}
          placeholder="Enter your email"
          keyboardType="email-address"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={[styles.textInput, !isEditing && styles.disabledInput]}
          value={profileData.phone_number}
          onChangeText={(text) => setProfileData(prev => ({ ...prev, phone_number: text }))}
          editable={isEditing}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />
      </View>

      {isEditing && (
        <TouchableOpacity
          style={styles.saveButton}
          onPress={saveProfile}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  const renderOptionsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Options</Text>
      
      <TouchableOpacity
        style={styles.optionItem}
        onPress={() => setShowPasswordModal(true)}
      >
        <AntDesign name="lock" size={20} color="#3B82F6" />
        <Text style={styles.optionText}>Change Password</Text>
        <AntDesign name="right" size={16} color="#9CA3AF" />
      </TouchableOpacity>

      {getRoleSpecificOptions().map((option, index) => (
        <TouchableOpacity
          key={index}
          style={styles.optionItem}
          onPress={option.onPress}
        >
          <AntDesign name={option.icon as any} size={20} color="#3B82F6" />
          <Text style={styles.optionText}>{option.title}</Text>
          <AntDesign name="right" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      ))}

      <TouchableOpacity
        style={[styles.optionItem, styles.logoutOption]}
        onPress={handleLogout}
      >
        <AntDesign name="logout" size={20} color="#EF4444" />
        <Text style={[styles.optionText, styles.logoutText]}>Logout</Text>
        <AntDesign name="right" size={16} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView style={styles.content}>
        {renderProfileSection()}
        {renderOptionsSection()}
      </ScrollView>

      {/* Password Change Modal */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Current Password"
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="New Password"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            
            <TextInput
              style={styles.modalInput}
              placeholder="Confirm New Password"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowPasswordModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={changePassword}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Change Password</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Preferences Modal */}
      <Modal
        visible={showPreferencesModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {user?.role === UserRole.TRAVEL_COMPANY ? 'Company Preferences' :
               user?.role === UserRole.ADMIN ? 'Admin Preferences' : 'Travel Preferences'}
            </Text>
            
            <ScrollView style={styles.preferencesScroll}>
              {/* Common Preferences */}
              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Notifications</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    tempPreferences?.notifications && styles.toggleButtonActive
                  ]}
                  onPress={() => setTempPreferences((prev: any) => ({
                    ...prev,
                    notifications: !prev?.notifications
                  }))}
                >
                  <Text style={styles.toggleText}>
                    {tempPreferences?.notifications ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.preferenceItem}>
                <Text style={styles.preferenceLabel}>Email Updates</Text>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    tempPreferences?.email_updates && styles.toggleButtonActive
                  ]}
                  onPress={() => setTempPreferences((prev: any) => ({
                    ...prev,
                    email_updates: !prev?.email_updates
                  }))}
                >
                  <Text style={styles.toggleText}>
                    {tempPreferences?.email_updates ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tourist-specific preferences */}
              {user?.role === UserRole.TOURIST && (
                <>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Budget Range (PKR)</Text>
                    <View style={styles.budgetContainer}>
                      <TextInput
                        style={styles.budgetInput}
                        placeholder="Min"
                        value={tempPreferences?.budget_range?.min?.toString() || ''}
                        onChangeText={(text) => setTempPreferences((prev: any) => ({
                          ...prev,
                          budget_range: {
                            ...prev?.budget_range,
                            min: parseInt(text) || 0
                          }
                        }))}
                        keyboardType="numeric"
                      />
                      <Text style={styles.budgetSeparator}>to</Text>
                      <TextInput
                        style={styles.budgetInput}
                        placeholder="Max"
                        value={tempPreferences?.budget_range?.max?.toString() || ''}
                        onChangeText={(text) => setTempPreferences((prev: any) => ({
                          ...prev,
                          budget_range: {
                            ...prev?.budget_range,
                            max: parseInt(text) || 0
                          }
                        }))}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Travel Style</Text>
                    <View style={styles.radioGroup}>
                      {['cultural', 'adventure', 'relaxation', 'business'].map((style) => (
                        <TouchableOpacity
                          key={style}
                          style={styles.radioOption}
                          onPress={() => setTempPreferences((prev: any) => ({
                            ...prev,
                            travel_style: style
                          }))}
                        >
                          <View style={[
                            styles.radioCircle,
                            tempPreferences?.travel_style === style && styles.radioSelected
                          ]} />
                          <Text style={styles.radioText}>{style.charAt(0).toUpperCase() + style.slice(1)}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Group Size Preference</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Preferred group size"
                      value={tempPreferences?.group_size_preference?.toString() || ''}
                      onChangeText={(text) => setTempPreferences((prev: any) => ({
                        ...prev,
                        group_size_preference: parseInt(text) || 1
                      }))}
                      keyboardType="numeric"
                    />
                  </View>
                </>
              )}

              {/* Company-specific preferences */}
              {user?.role === UserRole.TRAVEL_COMPANY && (
                <>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Booking Notifications</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        tempPreferences?.booking_notifications && styles.toggleButtonActive
                      ]}
                      onPress={() => setTempPreferences((prev: any) => ({
                        ...prev,
                        booking_notifications: !prev?.booking_notifications
                      }))}
                    >
                      <Text style={styles.toggleText}>
                        {tempPreferences?.booking_notifications ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Marketing Emails</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        tempPreferences?.marketing_emails && styles.toggleButtonActive
                      ]}
                      onPress={() => setTempPreferences((prev: any) => ({
                        ...prev,
                        marketing_emails: !prev?.marketing_emails
                      }))}
                    >
                      <Text style={styles.toggleText}>
                        {tempPreferences?.marketing_emails ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* Admin-specific preferences */}
              {user?.role === UserRole.ADMIN && (
                <>
                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>System Alerts</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        tempPreferences?.system_alerts && styles.toggleButtonActive
                      ]}
                      onPress={() => setTempPreferences((prev: any) => ({
                        ...prev,
                        system_alerts: !prev?.system_alerts
                      }))}
                    >
                      <Text style={styles.toggleText}>
                        {tempPreferences?.system_alerts ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>User Activity Reports</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        tempPreferences?.user_activity_reports && styles.toggleButtonActive
                      ]}
                      onPress={() => setTempPreferences((prev: any) => ({
                        ...prev,
                        user_activity_reports: !prev?.user_activity_reports
                      }))}
                    >
                      <Text style={styles.toggleText}>
                        {tempPreferences?.user_activity_reports ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.preferenceItem}>
                    <Text style={styles.preferenceLabel}>Security Notifications</Text>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        tempPreferences?.security_notifications && styles.toggleButtonActive
                      ]}
                      onPress={() => setTempPreferences((prev: any) => ({
                        ...prev,
                        security_notifications: !prev?.security_notifications
                      }))}
                    >
                      <Text style={styles.toggleText}>
                        {tempPreferences?.security_notifications ? 'ON' : 'OFF'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelPreferences}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.preferenceSaveButton]}
                onPress={savePreferences}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.confirmButtonText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  profileImageContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#3B82F6',
  },
  imageEditOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#3B82F6',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'white',
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
  disabledInput: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  saveButton: {
    backgroundColor: '#10B981',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    marginLeft: 16,
  },
  logoutOption: {
    borderBottomWidth: 0,
  },
  logoutText: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  preferenceLabel: {
    fontSize: 16,
    color: '#111827',
  },
  toggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    minWidth: 60,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#3B82F6',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  // Additional styles for enhanced preferences modal
  preferencesScroll: {
    maxHeight: 400,
    marginBottom: 20,
  },
  budgetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  budgetInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  budgetSeparator: {
    marginHorizontal: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  radioGroup: {
    marginTop: 8,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    marginRight: 12,
  },
  radioSelected: {
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
  },
  preferenceSaveButton: {
    backgroundColor: '#3B82F6',
  },
});

export default ProfileScreen;
