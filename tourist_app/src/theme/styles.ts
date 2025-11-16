import { StyleSheet } from 'react-native';
import { Colors, getThemeColors } from './colors';

// Common styles used across the app
export const CommonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  
  safeArea: {
    flex: 1,
    backgroundColor: Colors.neutral[0],
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: Colors.neutral[0],
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  
  content: {
    flex: 1,
    padding: 20,
  },
  
  card: {
    backgroundColor: Colors.neutral[0],
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  section: {
    backgroundColor: Colors.neutral[0],
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
    color: Colors.neutral[900],
    marginBottom: 16,
  },
  
  button: {
    backgroundColor: Colors.primary[600],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  buttonText: {
    color: Colors.neutral[0],
    fontSize: 16,
    fontWeight: '600',
  },
  
  secondaryButton: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[300],
  },
  
  secondaryButtonText: {
    color: Colors.neutral[700],
    fontSize: 16,
    fontWeight: '600',
  },
  
  input: {
    borderWidth: 1,
    borderColor: Colors.neutral[300],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: Colors.neutral[0],
  },
  
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
    marginBottom: 8,
  },
  
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  spaceBetween: {
    justifyContent: 'space-between',
  },
  
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
  
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.neutral[500],
  },
  
  errorText: {
    color: Colors.secondary[500],
    fontSize: 14,
    marginTop: 4,
  },
  
  successText: {
    color: Colors.success[600],
    fontSize: 14,
    marginTop: 4,
  },
});

// Generate role-specific styles
export const createRoleStyles = (role: 'tourist' | 'company' | 'admin' = 'tourist') => {
  const colors = getThemeColors(role);
  
  return StyleSheet.create({
    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    primaryButtonText: {
      color: Colors.neutral[0],
      fontSize: 16,
      fontWeight: '600',
    },
    
    accentButton: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    headerGradient: {
      backgroundColor: colors.primary,
    },
    
    statCard: {
      backgroundColor: Colors.neutral[0],
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 5,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    
    primaryText: {
      color: colors.primary,
    },
    
    accentText: {
      color: colors.accent,
    },
  });
};