// Centralized API Configuration
const FALLBACK_DEV_BASE_URL = 'http://10.141.224.126:8000';
const FALLBACK_PROD_BASE_URL = 'https://your-production-api.com';

const normalizeHost = (host: string, defaultPort: string) => {
  if (!host || typeof host !== 'string') {
    return null;
  }
  if (host.startsWith('http://') || host.startsWith('https://')) {
    return host;
  }
  const portSuffix = host.includes(':') ? '' : `:${defaultPort}`;
  return `http://${host}${portSuffix}`;
};

export const API_BASE_URL = (() => {
  try {
    const explicitEnvUrl =
      process.env?.EXPO_PUBLIC_API_BASE_URL ||
      process.env?.API_BASE_URL ||
      null;

    if (explicitEnvUrl && typeof explicitEnvUrl === 'string') {
      return explicitEnvUrl;
    }

    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      const devHost = process.env?.EXPO_PUBLIC_DEV_API_HOST || null;
      if (devHost && typeof devHost === 'string') {
        const devPort = process.env?.EXPO_PUBLIC_DEV_API_PORT || '8000';
        const normalizedHost = normalizeHost(devHost, devPort);
        if (normalizedHost) {
          return normalizedHost;
        }
      }
      return FALLBACK_DEV_BASE_URL;
    }

    const prodUrl = process.env?.EXPO_PUBLIC_PROD_API_BASE_URL || null;
    if (prodUrl && typeof prodUrl === 'string') {
      return prodUrl;
    }

    return FALLBACK_PROD_BASE_URL;
  } catch (error) {
    console.error('Error determining API_BASE_URL:', error);
    return FALLBACK_DEV_BASE_URL;
  }
})();

// Currency formatting utility
export const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

// Export for easy access
export default {
  API_BASE_URL,
  formatCurrency,
};
