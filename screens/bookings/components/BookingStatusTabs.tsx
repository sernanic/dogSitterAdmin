import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

// Define the possible tab values
export type BookingStatusTab = 'upcoming' | 'completed';

interface BookingStatusTabsProps {
  currentTab: BookingStatusTab;
  onTabChange: (tab: BookingStatusTab) => void;
}

const BookingStatusTabs: React.FC<BookingStatusTabsProps> = ({ currentTab, onTabChange }) => {
  return (
    <View style={styles.tabsContainer}>
      <TouchableOpacity
        style={[styles.tab, currentTab === 'upcoming' && styles.activeTab]}
        onPress={() => onTabChange('upcoming')}
      >
        <Text style={[styles.tabText, currentTab === 'upcoming' && styles.activeTabText]}>
          Upcoming
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, currentTab === 'completed' && styles.activeTab]}
        onPress={() => onTabChange('completed')}
      >
        <Text style={[styles.tabText, currentTab === 'completed' && styles.activeTabText]}>
          Completed
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0', // Match modal header border
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent', // Inactive tab has no underline
  },
  activeTab: {
    borderBottomColor: '#63C7B8', // Active tab underline color
  },
  tabText: {
    fontSize: 16,
    color: '#6C757D', // Inactive text color
    fontWeight: '500',
  },
  activeTabText: {
    color: '#343A40', // Active text color
    fontWeight: '600',
  },
});

export default BookingStatusTabs;
