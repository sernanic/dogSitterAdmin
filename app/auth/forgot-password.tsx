import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Mail, ArrowLeft, CircleCheck as CheckCircle } from 'lucide-react-native';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleResetPassword = () => {
    // Basic validation
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    // Mock password reset - in a real app, this would call an API
    setError(null);
    setSubmitted(true);
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
        
        {!submitted ? (
          <View style={styles.formContainer}>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password
            </Text>
            
            {error && <Text style={styles.errorText}>{error}</Text>}
            
            <View style={styles.inputContainer}>
              <Mail size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <TouchableOpacity style={styles.resetButton} onPress={handleResetPassword}>
              <Text style={styles.resetButtonText}>Send Reset Link</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.cancelButtonText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.successContainer}>
            <CheckCircle size={60} color="#62C6B9" />
            <Text style={styles.successTitle}>Email Sent</Text>
            <Text style={styles.successText}>
              We've sent a password reset link to {email}. Please check your inbox and follow the instructions.
            </Text>
            <TouchableOpacity 
              style={styles.backToLoginButton} 
              onPress={() => router.back()}
            >
              <Text style={styles.backToLoginText}>Back to Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 5,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 10,
    fontFamily: 'Inter-Regular',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    marginBottom: 20,
    paddingHorizontal: 10,
    height: 50,
    backgroundColor: '#F9F9F9',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 50,
    fontFamily: 'Inter-Regular',
  },
  resetButton: {
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  cancelButton: {
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontFamily: 'Inter-SemiBold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  successText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    fontFamily: 'Inter-Regular',
  },
  backToLoginButton: {
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  backToLoginText: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
});