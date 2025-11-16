// Debug configuration for easy API URL switching
export const DEBUG_CONFIG = {
  // Set this to true to enable debug mode
  ENABLE_API_LOGGING: true,
  
  // Quick switch for different environments
  ENVIRONMENT: 'development' as 'development' | 'production' | 'staging',
  
  // Override URLs for specific testing scenarios
  FORCE_BASE_URL: null as string | null, // Set to override automatic URL selection
  
  // Network debugging
  SIMULATE_SLOW_NETWORK: false, // Adds delays to API calls
  NETWORK_DELAY_MS: 2000,
  
  // API endpoint testing
  USE_MOCK_DATA: false, // Switch to mock data instead of real API calls
  
  // Quick access URLs for different scenarios
  QUICK_URLS: {
    LOCALHOST: 'http://localhost:8000',
    LOCAL_IP: 'http://192.168.18.183:8000', // Your actual IP from constants
    STAGING: 'https://staging-api.yourdomain.com',
    PRODUCTION: 'https://api.yourdomain.com',
  },
};

// Helper function to get current API URL with debug info
export const getDebugInfo = () => {
  const info = {
    environment: DEBUG_CONFIG.ENVIRONMENT,
    forcedUrl: DEBUG_CONFIG.FORCE_BASE_URL,
    mockData: DEBUG_CONFIG.USE_MOCK_DATA,
    slowNetwork: DEBUG_CONFIG.SIMULATE_SLOW_NETWORK,
  };
  
  if (DEBUG_CONFIG.ENABLE_API_LOGGING) {
    console.log('🐛 Debug Info:', info);
  }
  
  return info;
};

// Helper to easily change environment
export const setEnvironment = (env: 'development' | 'production' | 'staging') => {
  DEBUG_CONFIG.ENVIRONMENT = env;
  console.log(`🔧 Environment switched to: ${env}`);
};

// Helper to force a specific URL
export const forceBaseUrl = (url: string | null) => {
  DEBUG_CONFIG.FORCE_BASE_URL = url;
  console.log(`🔧 Base URL forced to: ${url || 'auto-detect'}`);
};

// Mock data for testing (when USE_MOCK_DATA is true)
export const MOCK_DATA = {
  tourPackages: [
    {
      id: '1',
      name: 'Mountain Adventure',
      description: 'Explore beautiful mountains',
      price: 299,
      duration_days: 5,
      destinations: ['Mountain Peak', 'Valley View'],
      start_date: '2025-09-01',
      end_date: '2025-09-05',
      max_participants: 20,
      current_participants: 15,
      status: 'active',
    },
  ],
  touristSpots: [
    {
      id: '1',
      name: 'Beautiful Lake',
      description: 'A serene lake surrounded by mountains',
      location: 'Mountain Region',
      region: 'North',
      categories: ['Nature', 'Lake'],
      image_urls: ['https://example.com/lake.jpg'],
      rating: 4.5,
      total_ratings: 120,
    },
  ],
  userBookings: [
    {
      id: '1',
      tour_package_id: '1',
      status: 'confirmed',
      booking_date: '2025-08-15',
      participants: 2,
    },
  ],
};
