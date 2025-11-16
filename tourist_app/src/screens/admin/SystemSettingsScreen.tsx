import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import apiService from '../../services/apiService';

const SystemSettingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [settings, setSettings] = useState({
    allowUserRegistration: true,
    autoApproveCompanies: false,
    autoApproveTouristSpots: false,
    maintenanceMode: false,
  });
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await apiService.get<typeof settings>('/admin/system-settings');
      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof typeof settings, value: boolean) => {
    setUpdating(key);
    try {
      const response = await apiService.put<{ message: string; key: string; value: boolean }>('/admin/system-settings', { key, value });
      
      if (response.success && response.data) {
        setSettings(prev => ({ ...prev, [key]: value }));
        Alert.alert('Success', response.data.message || `${key} has been ${value ? 'enabled' : 'disabled'}`);
      } else {
        Alert.alert('Error', response.message || 'Failed to update setting');
      }
    } catch (error) {
      console.error('Failed to update setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setUpdating(null);
    }
  };

  const settingsItems = [
    {
      title: 'User Registration',
      description: 'Allow new users to register',
      key: 'allowUserRegistration' as const,
      icon: 'adduser',
    },
    {
      title: 'Auto-approve Companies',
      description: 'Automatically approve travel company registrations',
      key: 'autoApproveCompanies' as const,
      icon: 'bank',
    },
    {
      title: 'Auto-approve Tourist Spots',
      description: 'Automatically approve new tourist spot submissions',
      key: 'autoApproveTouristSpots' as const,
      icon: 'enviromento',
    },
    {
      title: 'Maintenance Mode',
      description: 'Put the system in maintenance mode',
      key: 'maintenanceMode' as const,
      icon: 'tool',
      warning: true,
    },
  ];

  const renderSettingItem = (item: typeof settingsItems[0]) => (
    <View key={item.key} style={[styles.settingItem, item.warning && styles.warningItem]}>
      <View style={styles.settingInfo}>
        <View style={styles.settingHeader}>
          <AntDesign 
            name={item.icon as any} 
            size={20} 
            color={item.warning ? '#EF4444' : '#3B82F6'} 
          />
          <Text style={[styles.settingTitle, item.warning && styles.warningTitle]}>
            {item.title}
          </Text>
        </View>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      {updating === item.key ? (
        <ActivityIndicator size="small" color={item.warning ? '#EF4444' : '#3B82F6'} />
      ) : (
        <Switch
          value={settings[item.key]}
          onValueChange={(value) => updateSetting(item.key, value)}
          trackColor={{ false: '#F3F4F6', true: item.warning ? '#FEE2E2' : '#DBEAFE' }}
          thumbColor={settings[item.key] ? (item.warning ? '#EF4444' : '#3B82F6') : '#9CA3AF'}
          disabled={updating !== null}
        />
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <AntDesign name="arrowleft" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>System Settings</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.headerTitle}>System Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>General Settings</Text>
          <Text style={styles.sectionDescription}>
            Configure system-wide settings and preferences
          </Text>
        </View>

        <View style={styles.settingsContainer}>
          {settingsItems.map(renderSettingItem)}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>System Information</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>App Version:</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Database Status:</Text>
              <Text style={[styles.infoValue, styles.statusOnline]}>Online</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Last Backup:</Text>
              <Text style={styles.infoValue}>2 hours ago</Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Server Status:</Text>
              <Text style={[styles.infoValue, styles.statusOnline]}>Healthy</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.dangerCard}>
            <TouchableOpacity 
              style={styles.dangerButton}
              onPress={() => Alert.alert(
                'Clear Cache',
                'This will clear all cached data. Continue?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: () => Alert.alert('Success', 'Cache cleared') }
                ]
              )}
            >
              <AntDesign name="delete" size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Clear System Cache</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.dangerButton}
              onPress={() => Alert.alert(
                'Reset Analytics',
                'This will reset all analytics data. This action cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Reset', style: 'destructive', onPress: () => Alert.alert('Success', 'Analytics reset') }
                ]
              )}
            >
              <AntDesign name="warning" size={20} color="#EF4444" />
              <Text style={styles.dangerButtonText}>Reset Analytics Data</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  warningItem: {
    backgroundColor: '#FEF2F2',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 12,
  },
  warningTitle: {
    color: '#EF4444',
  },
  settingDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 32,
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statusOnline: {
    color: '#10B981',
  },
  dangerCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    marginBottom: 12,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#EF4444',
    marginLeft: 12,
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
});

export default SystemSettingsScreen;