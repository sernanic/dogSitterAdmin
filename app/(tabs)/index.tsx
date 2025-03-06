import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, DollarSign, Star, Clock, Users } from 'lucide-react-native';

// Mock data for upcoming bookings
const upcomingBookings = [
  {
    id: '1',
    ownerName: 'Sarah Johnson',
    dogName: 'Max',
    dogBreed: 'Golden Retriever',
    date: 'Today, 2:00 PM',
    service: 'Dog Walking',
    duration: '30 min',
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '2',
    ownerName: 'Michael Chen',
    dogName: 'Bella',
    dogBreed: 'Beagle',
    date: 'Tomorrow, 9:00 AM',
    service: 'Home Sitting',
    duration: '3 hours',
    image: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?q=80&w=200&auto=format&fit=crop',
  },
];

// Mock data for earnings
const earningsData = {
  today: '$45',
  thisWeek: '$320',
  thisMonth: '$1,250',
};

export default function HomeScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 24,
    completedBookings: 18,
    averageRating: 4.8,
    totalClients: 12,
  });

  const onRefresh = () => {
    setRefreshing(true);
    // Simulate a data refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning,</Text>
            <Text style={styles.name}>Jessica</Text>
          </View>
          <TouchableOpacity style={styles.notificationButton}>
            <Bell size={24} color="#333" />
            <View style={styles.notificationBadge} />
          </TouchableOpacity>
        </View>

        {/* Earnings Section */}
        <View style={styles.earningsCard}>
          <Text style={styles.sectionTitle}>Earnings</Text>
          <View style={styles.earningsRow}>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>Today</Text>
              <Text style={styles.earningsValue}>{earningsData.today}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>This Week</Text>
              <Text style={styles.earningsValue}>{earningsData.thisWeek}</Text>
            </View>
            <View style={styles.earningsItem}>
              <Text style={styles.earningsLabel}>This Month</Text>
              <Text style={styles.earningsValue}>{earningsData.thisMonth}</Text>
            </View>
          </View>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F1FF' }]}>
              <Calendar size={20} color="#62C6B9" />
            </View>
            <Text style={styles.statValue}>{stats.totalBookings}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF2E8' }]}>
              <CheckCircle size={20} color="#FF8C42" />
            </View>
            <Text style={styles.statValue}>{stats.completedBookings}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF8E8' }]}>
              <Star size={20} color="#FFB800" />
            </View>
            <Text style={styles.statValue}>{stats.averageRating}</Text>
            <Text style={styles.statLabel}>Avg. Rating</Text>
          </View>
          
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8FFF1' }]}>
              <Users size={20} color="#4CAF50" />
            </View>
            <Text style={styles.statValue}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
        </View>

        {/* Upcoming Bookings Section */}
        <View style={styles.upcomingSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Bookings</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>

          {upcomingBookings.map((booking) => (
            <TouchableOpacity key={booking.id} style={styles.bookingCard}>
              <Image source={{ uri: booking.image }} style={styles.dogImage} />
              <View style={styles.bookingInfo}>
                <Text style={styles.dogName}>{booking.dogName}</Text>
                <Text style={styles.dogBreed}>{booking.dogBreed}</Text>
                <View style={styles.bookingDetails}>
                  <View style={styles.bookingDetailItem}>
                    <Clock size={14} color="#666" />
                    <Text style={styles.bookingDetailText}>{booking.date}</Text>
                  </View>
                  <View style={styles.bookingDetailItem}>
                    <DollarSign size={14} color="#666" />
                    <Text style={styles.bookingDetailText}>{booking.service}</Text>
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions Section */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8F1FF' }]}>
                <Calendar size={24} color="#62C6B9" />
              </View>
              <Text style={styles.quickActionText}>Set Availability</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#FFF2E8' }]}>
                <DollarSign size={24} color="#FF8C42" />
              </View>
              <Text style={styles.quickActionText}>Update Pricing</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.quickActionButton}>
              <View style={[styles.quickActionIcon, { backgroundColor: '#E8FFF1' }]}>
                <MessageSquare size={24} color="#4CAF50" />
              </View>
              <Text style={styles.quickActionText}>Send Update</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

import { Calendar, CircleCheck as CheckCircle, MessageSquare } from 'lucide-react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  name: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
  },
  earningsCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    marginBottom: 15,
  },
  earningsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  earningsItem: {
    alignItems: 'center',
    flex: 1,
  },
  earningsLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontFamily: 'Inter-Regular',
  },
  earningsValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#62C6B9',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    width: '48%',
    marginBottom: 15,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  upcomingSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeAllText: {
    fontSize: 14,
    color: '#62C6B9',
    fontFamily: 'Inter-Medium',
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dogImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  bookingInfo: {
    flex: 1,
  },
  dogName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  dogBreed: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontFamily: 'Inter-Regular',
  },
  bookingDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  bookingDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 5,
  },
  bookingDetailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    fontFamily: 'Inter-Regular',
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    alignItems: 'center',
    width: '30%',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
    fontFamily: 'Inter-Medium',
  },
});