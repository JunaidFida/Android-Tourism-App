// Unified color system for the entire app
export const Colors = {
  // Primary brand colors
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  
  // Secondary colors
  secondary: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Success colors
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  
  // Warning colors
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  
  // Neutral colors
  neutral: {
    0: '#ffffff',
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Error colors
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Special colors
  purple: {
    500: '#8b5cf6',
    600: '#7c3aed',
  },
  
  cyan: {
    500: '#06b6d4',
    600: '#0891b2',
  },
  
  // Role-specific colors
  tourist: {
    primary: '#3b82f6',
    secondary: '#10b981',
    accent: '#8b5cf6',
  },
  
  company: {
    primary: '#059669',
    secondary: '#0891b2',
    accent: '#d97706',
  },
  
  admin: {
    primary: '#dc2626',
    secondary: '#7c3aed',
    accent: '#059669',
  },
};

// Theme variants for different user roles
export const getThemeColors = (role: 'tourist' | 'company' | 'admin' = 'tourist') => {
  const baseColors = {
    background: Colors.neutral[0],
    surface: Colors.neutral[0],
    surfaceVariant: Colors.neutral[50],
    border: Colors.neutral[200],
    text: Colors.neutral[900],
    textSecondary: Colors.neutral[500],
    textMuted: Colors.neutral[400],
  };

  switch (role) {
    case 'company':
      return {
        ...baseColors,
        primary: Colors.company.primary,
        primaryLight: Colors.success[100],
        secondary: Colors.company.secondary,
        accent: Colors.company.accent,
      };
    
    case 'admin':
      return {
        ...baseColors,
        primary: Colors.admin.primary,
        primaryLight: Colors.secondary[100],
        secondary: Colors.admin.secondary,
        accent: Colors.admin.accent,
      };
    
    default: // tourist
      return {
        ...baseColors,
        primary: Colors.tourist.primary,
        primaryLight: Colors.primary[100],
        secondary: Colors.tourist.secondary,
        accent: Colors.tourist.accent,
      };
  }
};