import { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, ChevronRight } from 'lucide-react-native';

// Mock data for conversations
const conversationsData = [
  {
    id: '1',
    ownerName: 'Sarah Johnson',
    dogName: 'Max',
    lastMessage: 'Thanks for taking care of Max today!',
    time: '10:30 AM',
    unread: true,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '2',
    ownerName: 'Michael Chen',
    dogName: 'Bella',
    lastMessage: 'Can you do an extra 30 minutes tomorrow?',
    time: 'Yesterday',
    unread: true,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '3',
    ownerName: 'Emily Wilson',
    dogName: 'Charlie',
    lastMessage: 'Charlie loved the walk! See you next week.',
    time: 'Yesterday',
    unread: false,
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '4',
    ownerName: 'David Brown',
    dogName: 'Luna',
    lastMessage: 'Luna is excited for her stay this weekend!',
    time: 'Monday',
    unread: false,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop',
  },
  {
    id: '5',
    ownerName: 'Jennifer Lee',
    dogName: 'Cooper',
    lastMessage: 'Cooper has been doing well with his training.',
    time: 'Last week',
    unread: false,
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=200&auto=format&fit=crop',
  },
];

export default function MessagesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredConversations, setFilteredConversations] = useState(conversationsData);

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (text) {
      const filtered = conversationsData.filter(
        conversation => 
          conversation.ownerName.toLowerCase().includes(text.toLowerCase()) ||
          conversation.dogName.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredConversations(filtered);
    } else {
      setFilteredConversations(conversationsData);
    }
  };

  const renderConversationItem = ({ item }) => (
    <TouchableOpacity style={styles.conversationItem}>
      <View style={styles.avatarContainer}>
        <Image source={{ uri: item.image }} style={styles.avatar} />
        {item.unread && <View style={styles.unreadBadge} />}
      </View>
      
      <View style={styles.conversationInfo}>
        <View style={styles.conversationHeader}>
          <Text style={styles.ownerName}>{item.ownerName}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        
        <Text style={styles.dogName}>Owner of {item.dogName}</Text>
        <Text 
          style={[styles.lastMessage, item.unread && styles.unreadMessage]}
          numberOfLines={1}
        >
          {item.lastMessage}
        </Text>
      </View>
      
      <ChevronRight size={20} color="#8E8E93" />
    </TouchableOpacity>
  );

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
      
      <FlatList
        data={filteredConversations}
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