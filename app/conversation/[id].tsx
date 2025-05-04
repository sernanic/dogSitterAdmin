import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Image, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { formatRelative } from 'date-fns';
import { useAuth } from '@/context/auth';
import { useAuthStore } from '@/store/useAuthStore';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

type Message = {
  id: string;
  thread_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
};

type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  role: string;
};

type MessageThread = {
  id: string;
  booking_id: string;
  owner_id: string;
  sitter_id: string;
  last_message: string;
  last_message_time: string;
};

export default function ConversationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<MessageThread | null>(null);
  const [owner, setOwner] = useState<Profile | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Access auth state directly from store for more reliable access
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const flatListRef = useRef<FlatList>(null);
  // Add this to detect keyboard status
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Format date in relative format (today, yesterday, date)
  const formatMessageDate = (timestamp: string) => {
    if (!timestamp) return '';
    return formatRelative(new Date(timestamp), new Date());
  };

  useEffect(() => {
    // If not authenticated, don't try to fetch data
    if (!id || !isAuthenticated) {
      if (!isAuthenticated) {
        console.log('Conversation: Not authenticated');
        setLoading(false);
      }
      return;
    }
    
    // If authenticated but no user data yet, keep waiting
    if (!user) {
      console.log('Conversation: Authenticated but waiting for user data');
      return; // Keep loading state true
    }

    // Fetch thread details
    const fetchThreadDetails = async () => {
      try {
        // Get thread info
        const { data: threadData, error: threadError } = await supabase
          .from('message_threads')
          .select('*')
          .eq('id', id)
          .single();

        if (threadError) throw threadError;
        if (!threadData) throw new Error('Thread not found');
        setThread(threadData);

        // Get owner profile
        const { data: ownerData, error: ownerError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', threadData.owner_id)
          .single();

        if (ownerError) throw ownerError;
        if (!ownerData) throw new Error('Owner profile not found');
        setOwner(ownerData);

        // Get messages
        const { data: messagesData, error: messagesError } = await supabase
          .from('messages')
          .select('*')
          .eq('thread_id', id)
          .order('created_at', { ascending: true });

        if (messagesError) throw messagesError;
        if (!messagesData) {
          setMessages([]);
        } else {
          setMessages(messagesData);

          // Mark unread messages as read
          const unreadMessages = messagesData
            .filter(msg => !msg.is_read && msg.sender_id !== user.id)
            .map(msg => msg.id);

          if (unreadMessages.length > 0) {
            await supabase
              .from('messages')
              .update({ is_read: true })
              .in('id', unreadMessages);
          }
        }
      } catch (error) {
        console.log('Error loading conversation:', error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchThreadDetails();

    // Subscribe to real-time updates for messages
    const subscription = supabase
      .channel(`thread_${id}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `thread_id=eq.${id}`
        }, 
        (payload: RealtimePostgresChangesPayload<Message>) => {
          const payloadMessage = payload.new as Message;
          if (payloadMessage) {
            // Don't add our own messages
            if (payloadMessage.sender_id !== user.id) {
              setMessages(prev => [...prev, payloadMessage]);
              
              // Mark as read
              void supabase
                .from('messages')
                .update({ is_read: true })
                .eq('id', payloadMessage.id)
                .then(() => {
                  console.log('Message marked as read');
                }, (err: Error) => {
                  console.log('Error marking message as read:', 
                    err instanceof Error ? err.message : 'Unknown error');
                });
            }
          }
        }
      )
      .subscribe();

    // Add keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        // Scroll to bottom when keyboard appears
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    // Clean up listeners
    return () => {
      subscription.unsubscribe();
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [id, user, isAuthenticated]);

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !thread || !user) return;
    setSending(true);

    try {
      // Insert new message
      const { data: messageData, error: messageError } = await supabase
        .from('messages')
        .insert({
          thread_id: thread.id,
          sender_id: user.id,
          content: newMessage.trim(),
          is_read: false,
        })
        .select()
        .single();

      if (messageError) throw messageError;

      // Update thread with last message info
      const { error: threadError } = await supabase
        .from('message_threads')
        .update({
          last_message: newMessage.trim(),
          last_message_time: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', thread.id);

      if (threadError) throw threadError;

      // Add the new message to the list
      if (messageData) {
        setMessages(prev => [...prev, messageData]);
        setNewMessage('');
        // Scroll to the bottom on new message
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }

      // Trigger the send-notifications function after successful message insertion
      if (messageData && thread) {
        // The backend function expects a payload similar to a DB webhook
        const payload = {
          type: 'INSERT',
          table: 'messages',
          schema: 'public',
          record: messageData,
          old_record: null // No old record for an INSERT event
        };

        // Asynchronously invoke the function, don't wait for the response
        supabase.functions.invoke('send-notification', { body: payload })
          .then(({ data, error }) => {
            if (error) {
              console.error('Error invoking send-notification function:', error);
              // Optionally inform the user, but usually notification errors are silent
            }
          })
          .catch(invokeError => {
            console.error('Exception invoking send-notification function:', invokeError);
          });
      }
    } catch (error) {
      console.log('Error sending message:', error);
      setError('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isFromSitter = item.sender_id === user?.id;
    
    return (
      <View style={[
        styles.messageContainer, 
        isFromSitter ? styles.sitterMessageContainer : styles.ownerMessageContainer
      ]}>
        <View style={[
          styles.messageBubble, 
          isFromSitter ? styles.sitterMessageBubble : styles.ownerMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isFromSitter ? styles.sitterMessageText : styles.ownerMessageText
          ]}>
            {item.content}
          </Text>
        </View>
        <Text style={styles.messageTime}>
          {formatMessageDate(item.created_at)}
        </Text>
      </View>
    );
  };

  // Group messages by date for better UI rendering
  const renderDateSeparator = (date: string) => (
    <View style={styles.dateSeparator}>
      <Text style={styles.dateSeparatorText}>{date}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#62C6B9" />
      </SafeAreaView>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversation</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Please sign in to view this conversation
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (!thread || !owner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conversation</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            Conversation not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color="#333" />
          </TouchableOpacity>
          
          <View style={styles.ownerInfo}>
            {owner?.avatar_url ? (
              <Image 
                source={{ uri: owner.avatar_url }} 
                style={styles.ownerAvatar} 
              />
            ) : (
              <View style={styles.placeholderAvatar}>
                <Text style={styles.avatarInitial}>
                  {owner?.name?.charAt(0) || '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.ownerName}>{owner?.name || 'Unknown'}</Text>
              <Text style={styles.ownerRole}>Owner</Text>
            </View>
          </View>
        </View>
        
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={[
            styles.messagesList, 
            keyboardVisible && styles.messagesListWithKeyboard
          ]}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          onLayout={() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No messages yet. Start the conversation!
              </Text>
            </View>
          }
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !newMessage.trim() && styles.disabledSendButton]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Send size={22} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  backButton: {
    padding: 5,
  },
  ownerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 15,
  },
  ownerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  placeholderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#62C6B9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarInitial: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerRole: {
    fontSize: 14,
    color: '#8E8E93',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  messagesList: {
    flexGrow: 1,
    padding: 15,
    paddingBottom: 10,
  },
  messagesListWithKeyboard: {
    paddingBottom: 20, // Extra padding when keyboard is visible
  },
  messageContainer: {
    marginBottom: 15,
    maxWidth: '80%',
  },
  ownerMessageContainer: {
    alignSelf: 'flex-start',
  },
  sitterMessageContainer: {
    alignSelf: 'flex-end',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
  },
  ownerMessageBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  sitterMessageBubble: {
    backgroundColor: '#62C6B9',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  ownerMessageText: {
    color: '#333',
  },
  sitterMessageText: {
    color: '#FFF',
  },
  messageTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 5,
    alignSelf: 'flex-end',
  },
  dateSeparator: {
    alignItems: 'center',
    marginVertical: 15,
  },
  dateSeparatorText: {
    fontSize: 14,
    color: '#8E8E93',
    backgroundColor: 'rgba(248, 249, 250, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  input: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 50,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#62C6B9',
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  disabledSendButton: {
    backgroundColor: '#A8D4CF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
