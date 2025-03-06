import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface VersionInfoProps {
  version?: string;
}

const VersionInfo = ({ version = '1.0.0' }: VersionInfoProps) => {
  return (
    <View style={styles.version}>
      <Text style={styles.versionText}>Version {version}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  version: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#666',
  },
});

export default VersionInfo; 