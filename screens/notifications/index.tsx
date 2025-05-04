import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight, Bell, MessageSquare, Calendar, Star, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/useAuthStore';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Notification = {
  id: string;
  recipient_id: string;
  type: 'message' | 'booking_request' | 'booking_status' | 'review';
  title: string;
  body: string;
  data: any;
  is_read: boolean;
  created_at: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Access auth state directly from store for more reliable access
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Format date to relative time (e.g., '5 minutes ago', 'yesterday')
  const formatNotificationTime = (timestamp: string): string => {
    if (!timestamp) return '';
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  useEffect(() => {
    // If not authenticated, stop loading and return early
    if (!isAuthenticated) {
      console.log('Not authenticated, stopping loading');
      setLoading(false);
      return;
    }
    
    // If authenticated but no user data yet, wait for it
    if (!user) {
      console.log('Authenticated but no user data yet, continuing to wait');
      return; // Keep loading state true
    }

    console.log('Fetching notifications for user:', user.id);
    fetchNotifications();

    // Subscribe to real-time updates for notifications
    const subscription = supabase
      .channel('notifications_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`
        }, 
        (payload: RealtimePostgresChangesPayload<any>) => {
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user, isAuthenticated]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Handle case when data is null
      if (!data || data.length === 0) {
        console.log('No notifications found');
        setNotifications([]);
        setFilteredNotifications([]);
        setLoading(false);
        return;
      }

      setNotifications(data);
      setFilteredNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<any>) => {
    console.log('Received notification update:', payload);
    
    if (payload.eventType === 'INSERT') {
      const newNotification = payload.new as Notification;
      setNotifications(prevNotifications => [newNotification, ...prevNotifications]);
      setFilteredNotifications(prevFiltered => {
        if (searchQuery) {
          // Apply current search filter to new data
          if (newNotification.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
              newNotification.body.toLowerCase().includes(searchQuery.toLowerCase())) {
            return [newNotification, ...prevFiltered];
          }
          return prevFiltered;
        }
        return [newNotification, ...prevFiltered];
      });
    } else if (payload.eventType === 'UPDATE') {
      const updatedNotification = payload.new as Notification;
      setNotifications(prevNotifications => 
        prevNotifications.map(notification => 
          notification.id === updatedNotification.id ? updatedNotification : notification
        )
      );
      setFilteredNotifications(prevFiltered => 
        prevFiltered.map(notification => 
          notification.id === updatedNotification.id ? updatedNotification : notification
        )
      );
    } else if (payload.eventType === 'DELETE') {
      const deletedNotification = payload.old as Notification;
      setNotifications(prevNotifications => 
        prevNotifications.filter(notification => notification.id !== deletedNotification.id)
      );
      setFilteredNotifications(prevFiltered => 
        prevFiltered.filter(notification => notification.id !== deletedNotification.id)
      );
    }
  };

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredNotifications(notifications);
      return;
    }
    
    const filtered = notifications.filter(notification => 
      notification.title.toLowerCase().includes(text.toLowerCase()) || 
      notification.body.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notification: Notification) => {
    if (notification.is_read) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification.id);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
      setFilteredNotifications(filteredNotifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    markAsRead(notification);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'message':
        if (notification.data?.threadId) {
          router.push(`/conversation/${notification.data.threadId}`);
        }
        break;
      case 'booking_request':
      case 'booking_status':
        if (notification.data?.bookingId) {
          // Navigate to the main bookings tab and let the UI handle showing the specific booking
          // You can pass params to specify which booking to show
          router.push({
            pathname: "/(tabs)/bookings",
            params: { 
              id: notification.data.bookingId,
              type: notification.data.type
            }
          });
        }
        break;
      case 'review':
        if (notification.data?.reviewId) {
          // Navigate to reviews screen if you have one, or to profile
          router.push('/profile');
        }
        break;
      default:
        console.log('Unknown notification type:', notification.type);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare size={24} color="#62C6B9" />;
      case 'booking_request':
      case 'booking_status':
        return <Calendar size={24} color="#FF9500" />;
      case 'review':
        return <Star size={24} color="#FFD700" />;
      default:
        return <Bell size={24} color="#62C6B9" />;
    }
  };

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    return (
      <TouchableOpacity 
        style={[styles.notificationItem, item.is_read ? {} : styles.unreadItem]} 
        onPress={() => handleNotificationPress(item)}
      >
        <View style={styles.iconContainer}>
          {getNotificationIcon(item.type)}
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.title, !item.is_read && styles.unreadText]}>
              {item.title}
            </Text>
            <Text style={styles.timeText}>
              {formatNotificationTime(item.created_at)}
            </Text>
          </View>
          
          <Text 
            style={[styles.body, !item.is_read && styles.unreadText]}
            numberOfLines={2}
          >
            {item.body}
          </Text>
        </View>
        
        <ChevronRight size={20} color="#8E8E93" />
      </TouchableOpacity>
    );
  };

  const handleRefresh = async () => {
    await fetchNotifications();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        {notifications.length > 0 && (
          <TouchableOpacity 
            style={styles.markAllReadButton}
            onPress={async () => {
              try {
                const unreadNotifications = notifications.filter(n => !n.is_read);
                if (unreadNotifications.length === 0) return;

                const { error } = await supabase
                  .from('notifications')
                  .update({ is_read: true })
                  .eq('recipient_id', user?.id)
                  .eq('is_read', false);

                if (error) throw error;
                
                // Update local state
                setNotifications(notifications.map(n => ({ ...n, is_read: true })));
                setFilteredNotifications(filteredNotifications.map(n => ({ ...n, is_read: true })));
              } catch (error) {
                console.error('Error marking all as read:', error);
              }
            }}
          >
            <Text style={styles.markAllReadText}>Mark all as read</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search notifications"
          value={searchQuery}
          onChangeText={handleSearch}
          clearButtonMode="while-editing"
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62C6B9" />
        </View>
      ) : !isAuthenticated ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Please sign in to view your notifications
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredNotifications}
          renderItem={renderNotificationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notificationsList}
          showsVerticalScrollIndicator={false}
          onRefresh={handleRefresh}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? 'No notifications found' 
                  : 'No notifications yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

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
    paddingBottom: 15,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
    padding: 5,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
  },
  markAllReadButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  markAllReadText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#62C6B9',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginHorizontal: 20,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 45,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontFamily: 'Inter-Regular',
    fontSize: 15,
  },
  notificationsList: {
    paddingHorizontal: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  unreadItem: {
    backgroundColor: '#F0F9F8',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
    flex: 1,
    marginRight: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
  },
  body: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  unreadText: {
    fontFamily: 'Inter-Medium',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
  },
});
