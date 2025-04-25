import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function MainScreenAuth() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/images/mainScreenAuth.png')}
        style={styles.image}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={styles.createAccountButton}
        onPress={() => router.push('/auth/register')}
      >
        <Text style={styles.createAccountText}>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signInButton}
        onPress={() => router.push('/auth/login')}
      >
        <Text style={styles.signInText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FCFCF2',
    paddingHorizontal: 24,
  },
  image: {
    width: '100%',
    height: 480,
    marginBottom: 30,
    marginTop: 0,
  },
  createAccountButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    backgroundColor: '#62C6B9',
    alignItems: 'center',
    marginBottom: 20,
  },
  createAccountText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 22,
  },
  signInButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#62C6B9',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  signInText: {
    color: '#62C6B9',
    fontWeight: 'bold',
    fontSize: 22,
  },
});
