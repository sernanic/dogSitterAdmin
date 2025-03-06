import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import { useAuthStore } from '../../store/useAuthStore';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const register = useAuthStore(state => state.register);

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Password strength validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      // Register the user with explicit sitter role
      await register(name, email, password);
      
      // Get the current auth state
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      const user = useAuthStore.getState().user;
      
      setIsLoading(false);
      
      if (!isAuthenticated || !user) {
        // Email confirmation required
        alert(
          'Registration successful! Please check your email to confirm your account before logging in.'
        );
        router.replace('/login');
      } else if (user.role !== 'sitter') {
        // Something went wrong with role assignment
        setError('Failed to set up sitter account properly. Please try again or contact support.');
        // Logout to clean up the state
        await useAuthStore.getState().logout();
      } else {
        // Successfully registered and authenticated as sitter
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      setIsLoading(false);
      // Provide more specific error messages based on the error type
      if (error.message?.includes('sitter')) {
        setError('Failed to set up sitter account. Please try again.');
      } else if (error.message?.includes('email')) {
        setError('This email is already registered. Please use a different email.');
      } else {
        setError(error?.message || 'Registration failed. Please try again.');
      }
      console.error('Registration error:', error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.logoContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=200&auto=format&fit=crop' }}
            style={styles.logo}
          />
          <Text style={styles.appName}>PawSitter</Text>
          <Text style={styles.tagline}>Create your account and start offering pet sitting services</Text>
        </View>
        
        <View style={styles.formContainer}>
          {error && <Text style={styles.errorText}>{error}</Text>}
          
          <View style={styles.inputContainer}>
            <User size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Full Name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoComplete="name"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Mail size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Lock size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry={!showPassword}
              autoComplete="new-password"
              autoCapitalize="none"
              textContentType="newPassword" // iOS will suggest a strong password
              passwordRules="minlength: 6; required: lower; required: upper; required: digit; required: [-];"
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}
            >
              {showPassword ? (
                <EyeOff size={20} color="#999" />
              ) : (
                <Eye size={20} color="#999" />
              )}
            </TouchableOpacity>
          </View>
          
          <View style={styles.inputContainer}>
            <Lock size={20} color="#999" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#999"
              secureTextEntry={!showConfirmPassword}
              autoComplete="new-password"
              autoCapitalize="none"
              textContentType="newPassword"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}
            >
              {showConfirmPassword ? (
                <EyeOff size={20} color="#999" />
              ) : (
                <Eye size={20} color="#999" />
              )}
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.registerButton, isLoading && styles.registerButtonDisabled]} 
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.registerButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.termsText}>
            By signing up, you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.loginText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  backButton: {
    padding: 10,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#333',
  },
  tagline: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  formContainer: {
    marginBottom: 20,
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 15,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    marginBottom: 15,
    paddingHorizontal: 15,
    backgroundColor: '#F5F5F5',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    color: '#333',
  },
  eyeIcon: {
    padding: 10,
  },
  registerButton: {
    backgroundColor: '#62C6B9',
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginVertical: 20,
  },
  registerButtonDisabled: {
    backgroundColor: '#A7E0D9',
  },
  registerButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  termsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  termsLink: {
    color: '#62C6B9',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 20,
  },
  footerText: {
    color: '#666',
    marginRight: 5,
  },
  loginText: {
    color: '#62C6B9',
    fontWeight: '600',
  },
});