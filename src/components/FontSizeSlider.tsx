import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Slider from '@react-native-community/slider';
import { colors } from '../constants/theme';
import { SUBTITLE_DEFAULTS } from '../constants/subtitleDefaults';

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function FontSizeSlider({ value, onChange }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Taille: {Math.round(value)}px</Text>
      <Slider
        style={styles.slider}
        minimumValue={SUBTITLE_DEFAULTS.minFontSize}
        maximumValue={SUBTITLE_DEFAULTS.maxFontSize}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={colors.accent}
        maximumTrackTintColor={colors.surfaceLight}
        thumbTintColor={colors.accentLight}
        step={1}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  label: { color: colors.textSecondary, fontSize: 13, width: 90 },
  slider: { flex: 1, height: 36 },
});
