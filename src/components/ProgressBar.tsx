import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';

interface Props {
  progress: number;
  label?: string;
}

export function ProgressBar({ progress, label }: Props) {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(100, progress)}%` }]} />
      </View>
      <Text style={styles.percent}>{Math.round(progress)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%', gap: 8 },
  label: { color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
  track: {
    height: 8,
    backgroundColor: colors.surfaceLight,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
  percent: { color: colors.text, fontSize: 16, textAlign: 'center', fontWeight: '600' },
});
