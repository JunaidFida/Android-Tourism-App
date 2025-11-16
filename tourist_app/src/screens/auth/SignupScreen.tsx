import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';
import { AuthService } from '../../services/authService';

type SignupScreenNavigationProp = StackNavigationProp<AuthStackParamList>;

interface SignupData {
  fullName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  role: 'tourist' | 'travel_company';
}

const SignupScreen: React.FC = () => {
  const navigation = useNavigation<SignupScreenNavigationProp>();
  const [formData, setFormData] = useState<SignupData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    role: 'tourist',
  });
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    // UC-01 Step 4: Validate entered data
    
    // Check if any required field is empty (UC-01 Alternative Flow 4a)
    if (!formData.fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return false;
    }
    
    if (!formData.email.trim()) {
      Alert.alert('Validation Error', 'Email address is required');
      return false;
    }
    
    if (!formData.password) {
      Alert.alert('Validation Error', 'Password is required');
      return false;
    }
    
    if (!formData.confirmPassword) {
      Alert.alert('Validation Error', 'Please confirm your password');
      return false;
    }

    // Email format validation (UC-01 Step 4)
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address format (example@domain.com)');
      return false;
    }

    // Password strength validation (UC-01 Step 4)
    if (formData.password.length < 8) {
      Alert.alert('Validation Error', 'Password must be at least 8 characters long');
      return false;
    }
    
    // Enhanced password strength check
    const hasUpperCase = /[A-Z]/.test(formData.password);
    const hasLowerCase = /[a-z]/.test(formData.password);
    const hasNumbers = /\d/.test(formData.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password);
    
    if (!hasUpperCase || !hasLowerCase || !hasNumbers) {
      Alert.alert(
        'Weak Password', 
        'Password must contain at least:\n• One uppercase letter\n• One lowercase letter\n• One number\n\nSpecial characters are recommended for better security.'
      );
      return false;
    }

    // Password confirmation match
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    // Phone number validation (if provided)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(formData.phoneNumber.replace(/\s/g, ''))) {
        Alert.alert('Validation Error', 'Please enter a valid phone number');
        return false;
      }
    }

    return true;
  };

  const handleSignup = async () => {
    // UC-01 Step 3: User clicks create account button
    // UC-01 Step 4: System validates the entered data
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // UC-01 Step 5: System successfully creates the user account
      await AuthService.register({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        fullName: formData.fullName.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        role: formData.role,
      });

      // UC-01 Step 5: System redirects user to Login page
      // Different success messages based on role as per use case requirements
      if (formData.role === 'travel_company') {
        Alert.alert(
          'Registration Submitted Successfully',
          `Dear ${formData.fullName},\n\nYour travel company registration has been submitted successfully!\n\n✅ Account created and stored in system database\n⏳ Pending admin approval\n📧 You will receive email notification once approved\n\nThank you for choosing our platform!`,
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      } else {
        Alert.alert(
          'Account Created Successfully',
          `Welcome ${formData.fullName}!\n\n✅ Your account has been created and stored in our system\n🎉 You can now log in and start exploring amazing destinations\n\nEnjoy your journey with us!`,
          [
            {
              text: 'Continue to Login',
              onPress: () => navigation.navigate('Login'),
            },
          ]
        );
      }
    } catch (error: any) {
      // UC-01 Alternative Flow 4a: Handle validation and creation errors
      let errorMessage = 'Failed to create account. Please try again.';
      
      if (error?.response?.data?.detail) {
        const detail = error.response.data.detail;
        if (detail.includes('Email already registered')) {
          errorMessage = 'This email address is already registered. Please use a different email or try logging in.';
        } else if (detail.includes('password')) {
          errorMessage = 'Password does not meet security requirements. Please choose a stronger password.';
        } else {
          errorMessage = detail;
        }
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Registration Failed', errorMessage);
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <LinearGradient
          colors={['#3B82F6', '#1E40AF']}
          style={styles.header}
        >
          <AntDesign name="user" size={60} color="white" />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join our travel community</Text>
        </LinearGradient>

        <View style={styles.formContainer}>
          {/* Role Selection */}
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'tourist' && styles.roleButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, role: 'tourist' })}
            >
              <AntDesign
                name="user"
                size={20}
                color={formData.role === 'tourist' ? 'white' : '#666'}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'tourist' && styles.roleButtonTextActive,
                ]}
              >
                Tourist
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.roleButton,
                formData.role === 'travel_company' && styles.roleButtonActive,
              ]}
              onPress={() =>
                setFormData({ ...formData, role: 'travel_company' })
              }
            >
              <AntDesign
                name="team"
                size={20}
                color={formData.role === 'travel_company' ? 'white' : '#666'}
              />
              <Text
                style={[
                  styles.roleButtonText,
                  formData.role === 'travel_company' && styles.roleButtonTextActive,
                ]}
              >
                Travel Company
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            placeholder="Full Name *"
            value={formData.fullName}
            onChangeText={(text) =>
              setFormData({ ...formData, fullName: text })
            }
            autoCapitalize="words"
          />

          <TextInput
            style={styles.input}
            placeholder="Email Address *"
            value={formData.email}
            onChangeText={(text) => setFormData({ ...formData, email: text })}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            value={formData.phoneNumber}
            onChangeText={(text) =>
              setFormData({ ...formData, phoneNumber: text })
            }
            keyboardType="phone-pad"
          />

          <TextInput
            style={styles.input}
            placeholder="Password *"
            value={formData.password}
            onChangeText={(text) =>
              setFormData({ ...formData, password: text })
            }
            secureTextEntry
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password *"
            value={formData.confirmPassword}
            onChangeText={(text) =>
              setFormData({ ...formData, confirmPassword: text })
            }
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.signupButton, isLoading && styles.disabledButton]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            <Text style={styles.signupButtonText}>
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </Text>
          </TouchableOpacity>

          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'white',
    opacity: 0.9,
    marginTop: 8,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  roleContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: 'white',
    gap: 8,
  },
  roleButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  roleButtonTextActive: {
    color: 'white',
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  signupButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#3B82F6',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  signupButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  loginText: {
    fontSize: 16,
    color: '#6b7280',
  },
  loginLink: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
});

export default SignupScreen;
