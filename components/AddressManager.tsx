import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Address, getAddressesByProfileId, upsertAddress, setPrimaryAddress, supabase } from '../lib/supabase';
import { useAuthStore } from '../store/useAuthStore';
import AddressAutocomplete from './AddressAutocomplete';

interface AddressManagerProps {
  onAddressSelected?: (address: Address) => void;
  showAddButton?: boolean;
  showEditButtons?: boolean;
}

export default function AddressManager({
  onAddressSelected,
  showAddButton = true,
  showEditButtons = true,
}: AddressManagerProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Partial<Address> | null>(null);
  
  const user = useAuthStore(state => state.user);
  
  // Load addresses when component mounts
  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user?.id]);
  
  // Load addresses from Supabase
  const loadAddresses = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const addressList = await getAddressesByProfileId(user.id);
      setAddresses(addressList);
    } catch (err) {
      console.log('Error loading addresses:', err);
      setError('Failed to load addresses. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle saving a new or edited address
  const handleSaveAddress = async (addressData: Partial<Address>) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Prepare address data
      const addressToSave: Partial<Address> = {
        ...addressData,
        profile_id: user.id,
      };
      
      // If this is the first address, make it primary
      if (addresses.length === 0) {
        addressToSave.is_primary = true;
      }
      
      // Save address to Supabase
      const savedAddress = await upsertAddress(addressToSave);
      
      // Update local state
      if (editingAddress?.id) {
        // Editing existing address
        setAddresses(prev => prev.map(addr => 
          addr.id === savedAddress.id ? savedAddress : addr
        ));
      } else {
        // Adding new address
        setAddresses(prev => [...prev, savedAddress]);
      }
      
      // Reset form state
      setIsAddingAddress(false);
      setEditingAddress(null);
      
      // Refresh addresses to ensure we have the latest data
      loadAddresses();
    } catch (err) {
      console.log('Error saving address:', err);
      Alert.alert('Error', 'Failed to save address. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle setting an address as primary
  const handleSetPrimary = async (addressId: string) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Update in Supabase
      await setPrimaryAddress(addressId, user.id);
      
      // Update local state
      setAddresses(prev => prev.map(addr => ({
        ...addr,
        is_primary: addr.id === addressId
      })));
      
      // Refresh addresses to ensure we have the latest data
      loadAddresses();
    } catch (err) {
      console.log('Error setting primary address:', err);
      Alert.alert('Error', 'Failed to set primary address. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle deleting an address
  const handleDeleteAddress = async (addressId: string) => {
    if (!user?.id) return;
    
    // Confirm deletion
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Delete from Supabase
              const { error } = await supabase
                .from('addresses')
                .delete()
                .eq('id', addressId)
                .eq('profile_id', user.id);
                
              if (error) throw error;
              
              // Update local state
              setAddresses(prev => prev.filter(addr => addr.id !== addressId));
              
              // If we deleted the primary address and have other addresses,
              // make the first one primary
              const remainingAddresses = addresses.filter(addr => addr.id !== addressId);
              if (remainingAddresses.length > 0 && !remainingAddresses.some(addr => addr.is_primary)) {
                await handleSetPrimary(remainingAddresses[0].id);
              }
            } catch (err) {
              console.log('Error deleting address:', err);
              Alert.alert('Error', 'Failed to delete address. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Handle editing an address
  const handleEditAddress = (address: Address) => {
    setEditingAddress(address);
    setIsAddingAddress(true);
  };
  
  // Render an address item
  const renderAddressItem = ({ item }: { item: Address }) => (
    <View style={[styles.addressItem, item.is_primary && styles.primaryAddress]}>
      <TouchableOpacity 
        style={styles.addressContent}
        onPress={() => onAddressSelected && onAddressSelected(item)}
      >
        <View style={styles.addressHeader}>
          <Text style={styles.addressText}>{item.formatted_address}</Text>
          {item.is_primary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>Primary</Text>
            </View>
          )}
        </View>
        
        {(item.latitude && item.longitude) && (
          <Text style={styles.coordinatesText}>
            {item.latitude.toFixed(6)}, {item.longitude.toFixed(6)}
          </Text>
        )}
      </TouchableOpacity>
      
      {showEditButtons && (
        <View style={styles.addressActions}>
          {!item.is_primary && (
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => handleSetPrimary(item.id)}
            >
              <MaterialIcons name="star-outline" size={20} color="#555" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleEditAddress(item)}
          >
            <MaterialIcons name="edit" size={20} color="#555" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleDeleteAddress(item.id)}
          >
            <MaterialIcons name="delete-outline" size={20} color="#ff4444" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
  
  // If adding or editing an address, show the address form
  if (isAddingAddress) {
    return (
      <View style={styles.container}>

        
        <View style={styles.autocompleteWrapper}>
          <AddressAutocomplete
            initialAddress={editingAddress || undefined}
            onAddressSelected={handleSaveAddress}
            required
          />
        </View>
        
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => {
            if (editingAddress) {
              handleSaveAddress(editingAddress);
            } else {
              Alert.alert('Error', 'Please select an address using the autocomplete or fill in the address fields.');
            }
          }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>Save Address</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {loading && addresses.length === 0 ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadAddresses}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : addresses.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="location-outline" size={48} color="#ccc" />
          <Text style={styles.emptyText}>No addresses found</Text>
          {showAddButton && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setIsAddingAddress(true)}
            >
              <Text style={styles.addButtonText}>Add Address</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={addresses}
            renderItem={renderAddressItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
          
          {showAddButton && (
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setIsAddingAddress(true)}
            >
              <Ionicons name="add" size={20} color="white" style={styles.addIcon} />
              <Text style={styles.addButtonText}>Add New Address</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  loader: {
    marginVertical: 20,
  },
  errorContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#ff4444',
    marginBottom: 10,
  },
  retryButton: {
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#333',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 16,
  },
  addressItem: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#62C6B9',
  },
  primaryAddress: {
    borderColor: '#62C6B9',
    borderWidth: 2,
  },
  addressContent: {
    flex: 1,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#666',
  },
  primaryBadge: {
    backgroundColor: '#62C6B9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  primaryBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#62C6B9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  addIcon: {
    marginRight: 8,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '500',
  },
  formHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    zIndex: 50,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  formDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  saveButton: {
    backgroundColor: '#62C6B9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    zIndex: 50,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '500',
    fontSize: 16,
  },
  autocompleteWrapper: {
    minHeight: 250, // Add fixed height to contain autocomplete dropdown
    zIndex: 100,    // Ensure higher z-index for dropdown
    width: '100%',
  },
}); 