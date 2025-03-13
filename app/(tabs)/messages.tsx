import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type MessageThread = {
  id: string;
  booking_id: string;
  owner_id: string;
  sitter_id: string;
  last_message: string;
  last_message_time: string;
  created_at: string;
  updated_at: string;
  walking_bookings?: {
    selected_pets: string;
  };
};

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
};

type OwnerProfiles = {
  [key: string]: Profile;
};

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageThreads, setMessageThreads] = useState<MessageThread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<MessageThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerProfiles, setOwnerProfiles] = useState<OwnerProfiles>({});
  
  // Access auth state directly from store for more reliable access
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  // Format date to relative time (e.g., '5 minutes ago', 'yesterday')
  const formatMessageTime = (timestamp: string): string => {
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

    console.log('Fetching message threads for user:', user.id);

    // Fetch message threads for the current sitter
    const fetchMessageThreads = async () => {
      try {
        const { data, error } = await supabase
          .from('message_threads')
          .select('*, walking_bookings(selected_pets)')
          .eq('sitter_id', user.id)
          .order('last_message_time', { ascending: false });

        if (error) throw error;

        // Handle case when data is null
        if (!data || data.length === 0) {
          console.log('No message threads found');
          setMessageThreads([]);
          setFilteredThreads([]);
          setLoading(false);
          return;
        }

        // Fetch owner information
        const ownerIds = [...new Set(data.map(thread => thread.owner_id))];
        
        if (ownerIds.length === 0) {
          console.log('No owner IDs found in threads');
          setMessageThreads(data);
          setFilteredThreads(data);
          setLoading(false);
          return;
        }

        const { data: owners, error: ownersError } = await supabase
          .from('profiles')
          .select('id, name, avatar_url')
          .in('id', ownerIds);

        if (ownersError) throw ownersError;

        // Create a map of owner IDs to owner data
        const ownersMap: OwnerProfiles = {};
        if (owners) {
          owners.forEach(owner => {
            ownersMap[owner.id] = owner;
          });
        }

        setOwnerProfiles(ownersMap);
        setMessageThreads(data);
        setFilteredThreads(data);
      } catch (error) {
        console.error('Error fetching message threads:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchMessageThreads();

    // Subscribe to real-time updates for message threads
    const subscription = supabase
      .channel('message_threads_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'message_threads',
          filter: `sitter_id=eq.${user.id}`
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

  const handleRealtimeUpdate = (payload: RealtimePostgresChangesPayload<MessageThread>) => {
    // Handle different types of changes
    try {
      if (payload.eventType === 'INSERT') {
        // New thread created
        setMessageThreads(prev => [payload.new, ...prev]);
        setFilteredThreads(prev => [payload.new, ...prev]);
      } else if (payload.eventType === 'UPDATE') {
        // Thread updated (e.g. new message)
        setMessageThreads(prev => {
          const updated = [...prev];
          const index = updated.findIndex(thread => thread.id === payload.new.id);
          if (index !== -1) {
            updated[index] = payload.new;
            // Sort by last message time
            updated.sort((a, b) => {
              return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
            });
          }
          return updated;
        });
        setFilteredThreads(prev => {
          const updated = [...prev];
          const index = updated.findIndex(thread => thread.id === payload.new.id);
          if (index !== -1) {
            updated[index] = payload.new;
            // Sort by last message time
            updated.sort((a, b) => {
              return new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime();
            });
          }
          return updated;
        });
      }
    } catch (error) {
      console.error('Error handling realtime update:', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = messageThreads.filter(thread => {
        const ownerName = ownerProfiles[thread.owner_id]?.name || '';
        return ownerName.toLowerCase().includes(text.toLowerCase()) ||
               thread.last_message?.toLowerCase().includes(text.toLowerCase());
      });
      setFilteredThreads(filtered);
    } else {
      setFilteredThreads(messageThreads);
    }
  };

  const navigateToConversation = (thread: MessageThread) => {
    router.push({
      pathname: '/conversation/[id]',
      params: { id: thread.id }
    });
  };

  const renderConversationItem = ({ item }: { item: MessageThread }) => {
    const owner = ownerProfiles[item.owner_id] || {} as Profile;
    const avatarUrl = owner.avatar_url || 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    
    // Check if there are unread messages (this would need to be implemented)
    const hasUnreadMessages = false; // Placeholder - would need to be calculated based on message read status

    return (
      <TouchableOpacity 
        style={styles.conversationItem}
        onPress={() => navigateToConversation(item)}
      >
        <View style={styles.avatarContainer}>
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          {hasUnreadMessages && <View style={styles.unreadBadge} />}
        </View>
        
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.ownerName}>{owner.name || 'Unknown'}</Text>
            <Text style={styles.timeText}>{formatMessageTime(item.last_message_time)}</Text>
          </View>
          
          <Text style={styles.dogName}>Booking ID: {item.booking_id?.substring(0, 8) || 'N/A'}</Text>
          <Text 
            style={[styles.lastMessage, hasUnreadMessages && styles.unreadMessage]}
            numberOfLines={1}
          >
            {item.last_message || 'No messages yet'}
          </Text>
        </View>
        
        <ChevronRight size={20} color="#8E8E93" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Search size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search conversations"
          value={searchQuery}
          onChangeText={handleSearch}
        />
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#62C6B9" />
        </View>
      ) : !isAuthenticated ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Please sign in to view your messages
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredThreads}
          renderItem={renderConversationItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? 'No conversations found' 
                  : 'No messages yet'}
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
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#333',
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
  conversationsList: {
    paddingHorizontal: 20,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  unreadBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#62C6B9',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  ownerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#333',
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
    fontFamily: 'Inter-Regular',
  },
  dogName: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'Inter-Regular',
  },
  unreadMessage: {
    fontFamily: 'Inter-Medium',
    color: '#333',
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