import 'react-native-get-random-values';
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { Address } from '../lib/supabase';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import Constants from 'expo-constants';

// Get API key directly for testing
const GOOGLE_PLACES_API_KEY = "AIzaSyDex8KhVir0fRdJ4WCyHrrt91YZrBX9JTk";

// Log API key availability for debugging (not the actual key for security)
console.log("Google Places API Key is set:", !!GOOGLE_PLACES_API_KEY, "Length:", GOOGLE_PLACES_API_KEY?.length);

// Function to verify if the API key is working
const verifyApiKey = async () => {
  try {
    // Simple test request to Google Places API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=1600+Amphitheatre&key=${GOOGLE_PLACES_API_KEY}`
    );
    const data = await response.json();
    console.log("API Key test result:", data.status);
    return data.status === "OK" || data.status === "ZERO_RESULTS";
  } catch (error) {
    console.error("API Key verification failed:", error);
    return false;
  }
};

interface AddressAutocompleteProps {
  onAddressSelected: (address: Partial<Address>) => void;
  initialAddress?: Partial<Address>;
  label?: string;
  placeholder?: string;
  required?: boolean;
  errorMessage?: string;
}

export default function AddressAutocomplete({
  onAddressSelected,
  initialAddress,
  label = 'Address',
  placeholder = 'Enter your address',
  required = false,
  errorMessage,
}: AddressAutocompleteProps) {
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [address, setAddress] = useState<Partial<Address>>(initialAddress || {});
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);

  // Update address when initialAddress changes
  useEffect(() => {
    if (initialAddress) {
      setAddress(initialAddress);
      // If we have a formatted address, switch to manual mode
      if (initialAddress.formatted_address) {
        setManualMode(true);
      }
    }
  }, [initialAddress]);

  // Verify API key on component mount
  useEffect(() => {
    const checkApiKey = async () => {
      const isValid = await verifyApiKey();
      setApiKeyValid(isValid);
      if (!isValid) {
        console.warn("Google Places API key is not valid - switching to manual mode");
        setManualMode(true);
      }
    };
    
    checkApiKey();
  }, []);

  // Handle Place Selection from Google Places
  const handlePlaceSelected = (data: any, details: any = null) => {
    if (details) {
      const newAddress: Partial<Address> = {
        ...address,
        formatted_address: details.formatted_address || '',
        latitude: details.geometry?.location.lat,
        longitude: details.geometry?.location.lng,
      };

      // Parse address components
      if (details.address_components) {
        for (const component of details.address_components) {
          const componentType = component.types[0];

          switch (componentType) {
            case 'street_number': {
              const streetNumber = component.long_name;
              newAddress.street_address = streetNumber + ' ' + (newAddress.street_address || '');
              break;
            }
            case 'route': {
              const street = component.long_name;
              newAddress.street_address = (newAddress.street_address || '').replace(street, '') + street;
              break;
            }
            case 'postal_code': {
              newAddress.postal_code = component.long_name;
              break;
            }
            case 'locality':
              newAddress.city = component.long_name;
              break;
            case 'administrative_area_level_1': {
              newAddress.state = component.long_name;
              break;
            }
            case 'country': {
              newAddress.country = component.long_name;
              break;
            }
          }
        }
      }

      setAddress(newAddress);
      onAddressSelected(newAddress);
      setManualMode(true);
    }
  };

  // Switch to manual entry mode
  const toggleManualMode = () => {
    setManualMode(!manualMode);
  };

  // Update a field in the address
  const updateAddressField = (field: keyof Address, value: string) => {
    const newAddress = { ...address, [field]: value };
    
    // Update formatted address if it's empty
    if (!newAddress.formatted_address && field !== 'formatted_address') {
      newAddress.formatted_address = [
        newAddress.street_address,
        newAddress.city,
        newAddress.state,
        newAddress.postal_code,
        newAddress.country
      ].filter(Boolean).join(', ');
    }
    
    setAddress(newAddress);
    onAddressSelected(newAddress);
  };

  // Call onAddressSelected when exiting the manual form to ensure the parent component has the latest data
  const handleManualEntrySubmit = () => {
    if (address.formatted_address || address.street_address) {
      onAddressSelected(address);
    }
    setManualMode(false);
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
      )}

      {apiKeyValid === false && (
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            Address search is currently unavailable. Please use manual entry.
          </Text>
        </View>
      )}

      {!manualMode ? (
        <View style={styles.autocompleteContainer}>
          {apiKeyValid === null && <ActivityIndicator style={styles.loader} />}
          {apiKeyValid !== false && (
            <GooglePlacesAutocomplete
              placeholder={placeholder}
              minLength={2}
              fetchDetails={true}
              onPress={handlePlaceSelected}
              onFail={(error) => {
                console.error("Google Places API failed:", error);
                setManualMode(true);
              }}
              onNotFound={() => console.log("No results found")}
              query={{
                key: GOOGLE_PLACES_API_KEY,
                language: 'en',
                types: 'address',
              }}
              styles={{
                container: {
                  flex: 0,
                  width: '100%',
                  zIndex: 200,
                },
                textInputContainer: {
                  width: '100%',
                  backgroundColor: 'white',
                  borderWidth: 1,
                  borderColor: '#D1D5DB',
                  borderRadius: 8,
                },
                textInput: {
                  height: 50,
                  fontSize: 16,
                  color: '#111827',
                  backgroundColor: 'white',
                  paddingHorizontal: 16,
                  marginBottom: 0,
                },
                listView: {
                  position: 'absolute',
                  top: 52,
                  left: 0,
                  right: 0,
                  backgroundColor: 'white',
                  borderColor: '#D1D5DB',
                  borderWidth: 1,
                  borderRadius: 8,
                  elevation: 5,
                  zIndex: 1000,
                  maxHeight: 200,
                },
                row: {
                  padding: 15,
                },
                description: {
                  color: '#333',
                  fontSize: 15,
                },
                separator: {
                  height: 1,
                  backgroundColor: '#EFEFEF',
                },
                poweredContainer: {
                  display: 'none',
                },
              }}
              textInputProps={{
                placeholderTextColor: '#6B7280',
                clearButtonMode: 'while-editing',
                onFocus: () => console.log('TextInput focused - suggestions should appear below'),
                autoCapitalize: 'none',
                autoCorrect: false,
              }}
              enablePoweredByContainer={false}
              debounce={300}
              keyboardShouldPersistTaps="handled"
              listViewDisplayed="auto"
              renderRow={(data) => (
                <View style={{flexDirection: 'row', alignItems: 'center', padding: 14}}>
                  <FontAwesome name="map-marker" size={16} color="#4B5563" style={{marginRight: 10}} />
                  <Text style={{fontSize: 16, color: '#333'}}>{data.description}</Text>
                </View>
              )}
            />
          )}
          <TouchableOpacity 
            style={styles.manualButton} 
            onPress={toggleManualMode}
          >
            <Text style={styles.manualButtonText}>Manual Entry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.manualContainer}>
          <View style={styles.formField}>
            <Text style={styles.fieldLabel}>Address</Text>
            <TextInput
              style={styles.input}
              value={address.formatted_address}
              onChangeText={(text) => updateAddressField('formatted_address', text)}
              placeholder="Full address"
            />
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.formFieldHalf]}>
              <Text style={styles.fieldLabel}>Street</Text>
              <TextInput
                style={styles.input}
                value={address.street_address}
                onChangeText={(text) => updateAddressField('street_address', text)}
                placeholder="Street address"
              />
            </View>
            
            <View style={[styles.formField, styles.formFieldHalf]}>
              <Text style={styles.fieldLabel}>City</Text>
              <TextInput
                style={styles.input}
                value={address.city}
                onChangeText={(text) => updateAddressField('city', text)}
                placeholder="City"
              />
            </View>
          </View>
          
          <View style={styles.formRow}>
            <View style={[styles.formField, styles.formFieldThird]}>
              <Text style={styles.fieldLabel}>State</Text>
              <TextInput
                style={styles.input}
                value={address.state}
                onChangeText={(text) => updateAddressField('state', text)}
                placeholder="State"
              />
            </View>
            
            <View style={[styles.formField, styles.formFieldThird]}>
              <Text style={styles.fieldLabel}>Postal Code</Text>
              <TextInput
                style={styles.input}
                value={address.postal_code}
                onChangeText={(text) => updateAddressField('postal_code', text)}
                placeholder="Zip code"
              />
            </View>
            
            <View style={[styles.formField, styles.formFieldThird]}>
              <Text style={styles.fieldLabel}>Country</Text>
              <TextInput
                style={styles.input}
                value={address.country}
                onChangeText={(text) => updateAddressField('country', text)}
                placeholder="Country"
              />
            </View>
          </View>

          <TouchableOpacity style={styles.manualButton} onPress={() => {
            handleManualEntrySubmit();
            toggleManualMode();
          }}>
            <Text style={styles.manualButtonText}>Use Autocomplete</Text>
          </TouchableOpacity>
        </View>
      )}

      {errorMessage && (
        <Text style={styles.errorMessage}>{errorMessage}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    color: '#374151',
  },
  required: {
    color: 'red',
  },
  autocompleteContainer: {
    position: 'relative',
    zIndex: 999,
    minHeight: 150,
    marginBottom: 50,
  },
  textInputContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    overflow: 'hidden',
  },
  textInput: {
    height: 50,
    fontSize: 16,
    color: '#111827',
    backgroundColor: 'white',
    paddingHorizontal: 16,
  },
  description: {
    fontSize: 15,
    color: '#333',
  },
  listView: {
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginTop: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: '100%',
  },
  row: {
    padding: 13,
    flexDirection: 'row',
  },
  manualButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  manualButtonText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '500',
  },
  manualContainer: {
    width: '100%',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  formField: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  formFieldHalf: {
    width: '48%',
  },
  formFieldThird: {
    width: '31%',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#4B5563',
  },
  input: {
    height: 45,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
    color: '#000',
  },
  errorMessage: {
    color: 'red',
    fontSize: 14,
    marginTop: 4,
  },
  warningContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  warningText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
}); 