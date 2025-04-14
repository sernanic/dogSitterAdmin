import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { List, Calendar } from 'lucide-react-native';

interface BookingViewToggleProps {
  viewMode: 'list' | 'calendar';
  onViewChange: (view: 'list' | 'calendar') => void;
}

const BookingViewToggle: React.FC<BookingViewToggleProps> = ({ viewMode, onViewChange }) => {
  return (
    <View style={styles.viewToggleContainer}>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'list' && styles.activeToggleButton]}
        onPress={() => onViewChange('list')}
      >
        <List size={18} color={viewMode === 'list' ? '#63C7B8' : '#6C757D'} />
        <Text style={[styles.toggleButtonText, viewMode === 'list' && styles.activeToggleButtonText]}>
          List
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggleButton, viewMode === 'calendar' && styles.activeToggleButton]}
        onPress={() => onViewChange('calendar')}
      >
        <Calendar size={18} color={viewMode === 'calendar' ? '#63C7B8' : '#6C757D'} />
        <Text style={[styles.toggleButtonText, viewMode === 'calendar' && styles.activeToggleButtonText]}>
          Calendar
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  viewToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#F8F9FA', // Light background for the container
    borderRadius: 20,
    padding: 4, // Padding inside the container
    marginBottom: 15,
    marginHorizontal: 20, // Center it slightly
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16, // Rounded buttons
    marginHorizontal: 4, // Space between buttons
  },
  activeToggleButton: {
    backgroundColor: '#FFFFFF', // White background for active
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: '#6C757D', // Default text color
  },
  activeToggleButtonText: {
    color: '#63C7B8', // Active text color
    fontWeight: '600',
  },
});

export default BookingViewToggle;
