import { BASE_URL, buildApiUrl } from '../config/api';
import { apiService } from '../services/apiService';

export class ApiTester {
  // Test basic connectivity to backend
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing API connection...');
      console.log('🌐 Base URL:', BASE_URL);
      
      const response = await fetch(buildApiUrl('/health-check'));
      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Backend is reachable!');
        console.log('📥 Health check response:', data);
        return true;
      } else {
        console.log('❌ Backend responded with error:', response.status);
        return false;
      }
    } catch (error) {
      console.log('❌ Failed to connect to backend:', error);
      return false;
    }
  }

  // Test API endpoints
  static async testEndpoints() {
    console.log('🧪 Testing API endpoints...');
    
    const endpoints = [
      { name: 'Health Check', url: '/health-check' },
      { name: 'Tourist Spots', url: '/tourist-spots/' },
      { name: 'Tour Packages', url: '/tour-packages/' },
    ];

    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing ${endpoint.name}...`);
        const response = await fetch(buildApiUrl(endpoint.url));
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ${endpoint.name}: OK (${response.status})`);
          console.log('📥 Sample data:', JSON.stringify(data).substring(0, 200) + '...');
        } else {
          console.log(`❌ ${endpoint.name}: Error ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Network error -`, error);
      }
    }
  }

  // Test authentication flow
  static async testAuth(email: string = 'test@example.com', password: string = 'testpass') {
    console.log('🔐 Testing authentication flow...');
    
    try {
      // Test signup first
      console.log('🔍 Testing signup...');
      const signupResult = await apiService.register({
        email,
        password,
        full_name: 'Test User',
        role: 'tourist'
      });
      
      if (signupResult.success) {
        console.log('✅ Signup successful');
      } else {
        console.log('❌ Signup failed:', signupResult.message);
      }

      // Test login
      console.log('🔍 Testing login...');
      const loginResult = await apiService.loginWithForm(email, password);
      
      if (loginResult.success) {
        console.log('✅ Login successful');
        console.log('🎯 Token received:', loginResult.data?.access_token ? 'Yes' : 'No');
        return loginResult.data?.access_token;
      } else {
        console.log('❌ Login failed:', loginResult.message);
        return null;
      }
    } catch (error) {
      console.log('❌ Auth test error:', error);
      return null;
    }
  }

  // Test authenticated endpoints
  static async testAuthenticatedEndpoints(token?: string) {
    if (!token) {
      console.log('⚠️  No token provided, testing without authentication...');
    } else {
      console.log('🔐 Testing authenticated endpoints...');
    }

    try {
      // Test user profile
      const profileResult = await apiService.getUserProfile();
      if (profileResult.success) {
        console.log('✅ User profile retrieved');
        console.log('👤 User data:', profileResult.data);
      } else {
        console.log('❌ Failed to get user profile:', profileResult.message);
      }

      // Test user bookings
      const bookingsResult = await apiService.getUserBookings();
      if (bookingsResult.success) {
        console.log('✅ User bookings retrieved');
        console.log('📅 Bookings count:', bookingsResult.data?.length || 0);
      } else {
        console.log('❌ Failed to get user bookings:', bookingsResult.message);
      }
    } catch (error) {
      console.log('❌ Authenticated endpoints test error:', error);
    }
  }

  // Comprehensive test suite
  static async runFullTest() {
    console.log('🚀 Starting comprehensive API tests...');
    console.log('=' .repeat(50));

    // Step 1: Test basic connectivity
    const isConnected = await this.testConnection();
    if (!isConnected) {
      console.log('❌ Cannot proceed with tests - backend not reachable');
      return false;
    }

    console.log('');

    // Step 2: Test endpoints
    await this.testEndpoints();
    console.log('');

    // Step 3: Test auth flow
    const token = await this.testAuth();
    console.log('');

    // Step 4: Test authenticated endpoints
    await this.testAuthenticatedEndpoints(token);

    console.log('');
    console.log('🏁 API tests completed!');
    console.log('=' .repeat(50));

    return true;
  }

  // Quick debug info
  static printDebugInfo() {
    console.log('🐛 API Debug Information:');
    console.log('📍 Base URL:', BASE_URL);
    console.log('📱 Platform:', require('react-native').Platform.OS);
    console.log('🔧 Environment:', __DEV__ ? 'Development' : 'Production');
    console.log('');
  }

  // Test specific endpoint with custom data
  static async testCustomEndpoint(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: any
  ) {
    try {
      console.log(`🔍 Testing ${method} ${endpoint}...`);
      
      let result;
      switch (method) {
        case 'GET':
          result = await apiService.get(endpoint);
          break;
        case 'POST':
          result = await apiService.post(endpoint, data);
          break;
        case 'PUT':
          result = await apiService.put(endpoint, data);
          break;
        case 'DELETE':
          result = await apiService.delete(endpoint);
          break;
      }

      if (result.success) {
        console.log(`✅ ${method} ${endpoint}: Success`);
        console.log('📥 Response data:', result.data);
      } else {
        console.log(`❌ ${method} ${endpoint}: Failed`);
        console.log('💬 Error message:', result.message);
      }

      return result;
    } catch (error) {
      console.log(`❌ ${method} ${endpoint}: Network error -`, error);
      return null;
    }
  }
}

// Helper function to run tests from app
export const runApiTests = () => {
  ApiTester.printDebugInfo();
  ApiTester.runFullTest();
};

export default ApiTester;
