// ProfileAvatar.tsx
import React, { useState } from 'react';
import { View, Image, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

interface ProfileAvatarProps {
  avatarUrl?: string;
  isUploading: boolean;
  onPress: () => void;
  name: string;
  role: string;
}

const ProfileAvatar = ({
  avatarUrl,
  isUploading,
  onPress,
  name,
  role
}: ProfileAvatarProps) => {
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <View style={styles.header}>
      <View style={styles.avatarContainer}>
        {isImageLoading && (
          <View style={[styles.avatar, styles.avatarLoading]}>
            <ActivityIndicator size="large" color="#007AFF" />
          </View>
        )}
        
        {imageError ? (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <FontAwesome5 name="user-alt" size={50} color="#718096" />
          </View>
        ) : avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            onLoadStart={() => {
              console.log("Loading avatar...");
              setIsImageLoading(true);
              setImageError(false);
            }}
            onLoad={() => {
              console.log("Avatar loaded successfully");
              setIsImageLoading(false);
            }}
            onError={() => {
              console.log("Failed to load avatar");
              setImageError(true);
              setIsImageLoading(false);
            }}
          />
        ) : (
          <View style={[styles.avatar, styles.avatarFallback]}>
            <FontAwesome5 name="user-alt" size={50} color="#718096" />
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.editAvatarButton}
          onPress={onPress}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <MaterialCommunityIcons name="pencil" size={16} color="white" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  editAvatarButton: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#007AFF',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarLoading: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    position: 'absolute',
    zIndex: 1,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    position: 'absolute',
    zIndex: 1,
  },
});

export default ProfileAvatar;