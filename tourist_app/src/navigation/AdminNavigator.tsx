import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import UsersManagementScreen from '../screens/admin/UsersManagementScreen';
import CompanyApprovalsScreen from '../screens/admin/CompanyApprovalsScreen';
import TouristSpotsManagementScreen from '../screens/admin/TouristSpotsManagementScreen';
import SystemSettingsScreen from '../screens/admin/SystemSettingsScreen';

export type AdminStackParamList = {
  AdminDashboard: undefined;
  UsersManagement: { filter?: { role?: string; is_active?: boolean } } | undefined;
  CompanyApprovals: undefined;
  TouristSpotsManagement: undefined;
  SystemSettings: undefined;
};

const Stack = createNativeStackNavigator<AdminStackParamList>();

const AdminNavigator: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      <Stack.Screen name="UsersManagement" component={UsersManagementScreen} />
      <Stack.Screen name="CompanyApprovals" component={CompanyApprovalsScreen} />
      <Stack.Screen name="TouristSpotsManagement" component={TouristSpotsManagementScreen} />
      <Stack.Screen name="SystemSettings" component={SystemSettingsScreen} />
    </Stack.Navigator>
  );
};

export default AdminNavigator;
