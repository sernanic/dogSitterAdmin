import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, Modal, Platform, Linking } from 'react-native';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../lib/supabase';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import StripeLogger from '../../utils/StripeLogger';
import * as Clipboard from 'expo-clipboard';

interface PaymentSetupModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSetupComplete: () => void;
}

const PaymentSetupModal = ({ isVisible, onClose, onSetupComplete }: PaymentSetupModalProps) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onboardingUrl, setOnboardingUrl] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<'none' | 'pending' | 'active' | 'restricted'>('none');
  
  // Get user from auth store
  const user = useAuthStore(state => state.user);
  const refreshSession = useAuthStore(state => state.refreshSession);

  // Generate onboarding URL when modal opens
  useEffect(() => {
    if (isVisible && user) {
      checkStripeStatus();
    }
  }, [isVisible, user]);

  // Check if user already has a Stripe account
  const checkStripeStatus = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Get user profile to check for stripe_account_id
      const { data, error } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user?.id)
        .single();
        
      if (error) throw error;
      
      if (data?.stripe_account_id) {
        // User already has a Stripe account, check its status
        const { data: statusData, error: statusError } = await supabase
          .functions
          .invoke('check-stripe-status', {
            body: { account_id: data.stripe_account_id }
          });
          
        if (statusError) throw statusError;
        
        setAccountStatus(statusData?.status || 'none');
        
        if (statusData?.status === 'active') {
          // Account is fully set up
          setLoading(false);
          return;
        } else if (statusData?.onboarding_url) {
          // Account needs more info, provide onboarding URL
          setOnboardingUrl(statusData.onboarding_url);
          setLoading(false);
          return;
        }
      }
      
      // No account or needs setup, generate onboarding URL
      generateOnboardingUrl();
      
    } catch (err: any) {
      StripeLogger.logError('PaymentSetupModal.checkStripeStatus', err, { userId: user?.id });
      setError('Failed to check payment account status: ' + (err.message || err));
      setLoading(false);
    }
  };

  // Generate onboarding URL for Stripe Connect
  const generateOnboardingUrl = async () => {
    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Get the current session to ensure we have a fresh JWT
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        throw new Error(`Failed to get authentication session: ${sessionError.message}`);
      }

      const session = sessionData?.session;
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      // Log session state for debugging
      StripeLogger.logSuccess('PaymentSetupModal.generateOnboardingUrl', 'Session state', { 
        userId: user.id,
        hasAccessToken: !!session.access_token,
        tokenExpiry: session.expires_at
      });

      // Call the Supabase Edge Function to generate an onboarding URL
      const { data, error } = await supabase.functions.invoke(
        'onboard-sitter',
        {
          body: { userId: user.id },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      );
        
      if (error) {
        // Log the complete error for debugging
        StripeLogger.logError('PaymentSetupModal.generateOnboardingUrl', error, { 
          userId: user.id,
          errorType: 'FunctionInvokeError',
          errorDetails: JSON.stringify(error, null, 2)
        });
        throw error;
      }
      
      if (!data?.url) {
        throw new Error('No onboarding URL returned from Edge Function');
      }

      setOnboardingUrl(data.url);
      setAccountStatus('pending');
      StripeLogger.logSuccess('PaymentSetupModal.generateOnboardingUrl', 'Successfully generated onboarding URL', { 
        userId: user.id,
        hasUrl: true
      });
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      StripeLogger.logError('PaymentSetupModal.generateOnboardingUrl', err, { 
        userId: user?.id,
        errorType: err.constructor.name,
        statusCode: err.statusCode,
        errorDetails: JSON.stringify(err, null, 2)
      });
      setError(`Failed to start payment setup: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Check if Stripe setup is complete
  const checkStripeSetupComplete = async () => {
    setLoading(true);
    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      // Check if account exists and is properly set up
      if (profileData?.stripe_account_id) {
        const { data: statusData, error: statusError } = await supabase
          .functions
          .invoke('check-stripe-status', {
            body: { account_id: profileData.stripe_account_id }
          });
          
        if (statusError) throw statusError;

        if (statusData?.status === 'active') {
          // Account setup is complete!
          StripeLogger.logSuccess('PaymentSetupModal.checkStripeSetupComplete', 'Stripe setup verified complete', { userId: user?.id });
          onSetupComplete();
          
          Alert.alert(
            'Setup Complete', 
            'Your payment account has been successfully set up! You can now receive payments from dog owners.',
            [{ 
              text: 'Great!', 
              onPress: () => {
                onClose();
              }
            }]
          );
        }
      }
    } catch (err) {
      StripeLogger.logError('PaymentSetupModal.checkStripeSetupComplete', err, { userId: user?.id });
    } finally {
      setLoading(false);
    }
  };
  
  // Open Stripe onboarding in external browser
  const openStripeOnboarding = async () => {
    if (!onboardingUrl) return;
    
    // Check if the URL can be opened
    const canOpen = await Linking.canOpenURL(onboardingUrl);
    
    if (canOpen) {
      await Linking.openURL(onboardingUrl);
      
      // Copy the return URL to clipboard for convenience
      const returnURL = onboardingUrl.split('?')[0].replace(/\/[^\/]*$/, '/stripe-return');
      await Clipboard.setStringAsync(returnURL);
      
      // Show instructions on how to return
      Alert.alert(
        'Setup Started',
        'Complete the setup in your browser. When finished, return to the app and click "I completed setup" to verify.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', 'Could not open the setup URL. Please try again later.');
    }
  };

  // If modal is not visible, don't render anything
  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Setup</Text>
          <View style={styles.headerRight} />
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color="#4f46e5" />
              <Text style={styles.loadingText}>Setting up your payment account...</Text>
            </View>
          ) : error ? (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ef4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={checkStripeStatus}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : accountStatus === 'active' ? (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="check-circle-outline" size={48} color="#10b981" />
              <Text style={styles.successText}>Your payment account is active!</Text>
              <Text style={styles.infoText}>
                You're all set to receive payments from dog owners. Payments will be deposited directly
                to your connected bank account.
              </Text>
              <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                <Text style={styles.doneButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          ) : onboardingUrl ? (
            <View style={styles.centerContent}>
              <MaterialCommunityIcons name="credit-card-outline" size={64} color="#4f46e5" />
              <Text style={styles.setupTitle}>Set Up Your Payment Account</Text>
              <Text style={styles.infoText}>
                You'll be redirected to Stripe's secure website to set up your payment account.
                Complete all the required information to receive payments from dog owners.
              </Text>
              
              <TouchableOpacity style={styles.primaryButton} onPress={openStripeOnboarding}>
                <Text style={styles.primaryButtonText}>Open Setup Process</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.secondaryButton} onPress={checkStripeSetupComplete}>
                <Text style={styles.secondaryButtonText}>I completed setup</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.centerContent}>
              <Text style={styles.infoText}>
                Something went wrong. Please try again later.
              </Text>
              <TouchableOpacity style={styles.retryButton} onPress={checkStripeStatus}>
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  setupTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4f46e5',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 24,
    width: '80%',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    width: '80%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  successText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  infoText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    marginTop: 24,
    backgroundColor: '#4f46e5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f8f9fa',
  },
});

export default PaymentSetupModal;
