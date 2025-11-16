import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Provider } from 'react-redux';
import { store } from './src/store';
import ErrorBoundary from './src/components/ErrorBoundary';
import AuthProvider from './src/components/AuthProvider';

// Navigation
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <AuthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <AppNavigator />
              <StatusBar style="auto" />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </AuthProvider>
      </Provider>
    </ErrorBoundary>
  );
}
