import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch } from 'react-redux';
import { setUser } from '../store/slices/authSlice';
import { User } from '../types';
import { CommonStyles } from '../theme/styles';
import { Colors } from '../theme/colors';

interface AuthProviderProps {
  children: React.ReactNode;
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useDispatch();

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      // Check if user has stored authentication data
      const [token, userData] = await Promise.all([
        AsyncStorage.getItem('access_token'),
        AsyncStorage.getItem('user_data'),
      ]);

      if (token && userData) {
        const user: User = JSON.parse(userData);
        // Restore user session - this will set isAuthenticated to true
        dispatch(setUser(user));
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
      // Clear potentially corrupted data
      await AsyncStorage.multiRemove(['access_token', 'authToken', 'user_data']);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={CommonStyles.loading}>
        <ActivityIndicator size="large" color={Colors.primary[500]} />
        <Text style={[CommonStyles.loadingText, { marginTop: 16 }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

export default AuthProvider;