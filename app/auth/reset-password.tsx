import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Platform,
  ToastAndroid
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Lock } from 'lucide-react-native';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Password validation
  const validatePassword = (password: string) => {
    // Require at least 8 characters, including one uppercase, one lowercase, one number
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return regex.test(password);
  };

  const handleResetPassword = async () => {
    // Reset states
    setError(null);
    
    // Validate password fields
    if (!newPassword || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters long and include uppercase, lowercase, and numbers');
      return;
    }

    try {
      setLoading(true);

      // Update the password using Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Password updated successfully
      setSuccess(true);
      
      // Show success message
      if (Platform.OS === 'android') {
        ToastAndroid.show('Password updated successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Your password has been updated.');
      }

      // Redirect to login after a short delay
      setTimeout(() => {
        router.replace('/auth');
      }, 2000);

    } catch (err: any) {
      console.log('Error updating password:', err);
      setError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show a message if no access token or session is found
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };

    checkSession();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Lock size={48} color="#62C6B9" />
        </View>
        
        <Text style={styles.title}>Create New Password</Text>
        <Text style={styles.subtitle}>
          Your new password must be different from previously used passwords.
        </Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {success ? (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Password updated successfully! Redirecting...
            </Text>
            <ActivityIndicator size="small" color="#62C6B9" style={styles.activityIndicator} />
          </View>
        ) : (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                editable={!loading}
              />
            </View>

            <Text style={styles.passwordRequirements}>
              Password must be at least 8 characters and include uppercase, lowercase, and numbers.
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E1E1E1',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  passwordRequirements: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#888',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#62C6B9',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#A8DEDA',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  successContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 16,
  },
  activityIndicator: {
    marginTop: 16,
  },
});
