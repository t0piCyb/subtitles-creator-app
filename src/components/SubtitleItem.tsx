import React, { memo, useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { Subtitle } from '../types';
import { formatDisplayTime, parseDisplayTime } from '../utils/timeFormat';

interface Props {
  subtitle: Subtitle;
  index: number;
  isActive: boolean;
  isLast: boolean;
  onUpdate: (index: number, field: keyof Subtitle, value: string | number) => void;
  onDelete: (index: number) => void;
  onMerge: (index: number) => void;
  onPress: (time: number) => void;
}

export const SubtitleItem = memo(function SubtitleItem({
  subtitle,
  index,
  isActive,
  isLast,
  onUpdate,
  onDelete,
  onMerge,
  onPress,
}: Props) {
  const [startText, setStartText] = useState(formatDisplayTime(subtitle.start));
  const [endText, setEndText] = useState(formatDisplayTime(subtitle.end));

  const handleStartBlur = () => {
    const parsed = parseDisplayTime(startText);
    if (parsed !== null) {
      onUpdate(index, 'start', parsed);
    } else {
      setStartText(formatDisplayTime(subtitle.start));
    }
  };

  const handleEndBlur = () => {
    const parsed = parseDisplayTime(endText);
    if (parsed !== null) {
      onUpdate(index, 'end', parsed);
    } else {
      setEndText(formatDisplayTime(subtitle.end));
    }
  };

  return (
    <TouchableOpacity
      style={[styles.container, isActive && styles.active]}
      onPress={() => onPress(subtitle.start)}
      activeOpacity={0.7}
    >
      <TextInput
        style={styles.timeInput}
        value={startText}
        onChangeText={setStartText}
        onBlur={handleStartBlur}
        keyboardType="numbers-and-punctuation"
        selectTextOnFocus
      />
      <TextInput
        style={styles.textInput}
        value={subtitle.text}
        onChangeText={(text) => onUpdate(index, 'text', text)}
        autoCapitalize="none"
        autoCorrect={false}
        selectTextOnFocus
      />
      <TextInput
        style={styles.timeInput}
        value={endText}
        onChangeText={setEndText}
        onBlur={handleEndBlur}
        keyboardType="numbers-and-punctuation"
        selectTextOnFocus
      />
      {!isLast && (
        <TouchableOpacity style={styles.mergeBtn} onPress={() => onMerge(index)}>
          <Text style={styles.mergeBtnText}>+</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.deleteBtn} onPress={() => onDelete(index)}>
        <Text style={styles.deleteText}>X</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  active: {
    backgroundColor: colors.surfaceLight,
  },
  timeInput: {
    color: colors.accent,
    fontSize: 11,
    fontFamily: 'monospace',
    width: 62,
    paddingVertical: 4,
    paddingHorizontal: 4,
    backgroundColor: colors.background,
    borderRadius: 4,
    textAlign: 'center',
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  mergeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mergeBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  deleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
