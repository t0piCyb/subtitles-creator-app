import React, { useCallback, useRef } from 'react';
import { FlatList, View, Text, StyleSheet } from 'react-native';
import { Subtitle } from '../types';
import { SubtitleItem } from './SubtitleItem';
import { colors } from '../constants/theme';

interface Props {
  subtitles: Subtitle[];
  activeIndex: number;
  onUpdate: (index: number, field: keyof Subtitle, value: string | number) => void;
  onDelete: (index: number) => void;
  onMerge: (index: number) => void;
  onSeek: (time: number) => void;
}

export function SubtitleList({ subtitles, activeIndex, onUpdate, onDelete, onMerge, onSeek }: Props) {
  const flatListRef = useRef<FlatList>(null);

  const renderItem = useCallback(
    ({ item, index }: { item: Subtitle; index: number }) => (
      <SubtitleItem
        subtitle={item}
        index={index}
        isActive={index === activeIndex}
        isLast={index === subtitles.length - 1}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMerge={onMerge}
        onPress={onSeek}
      />
    ),
    [activeIndex, subtitles.length, onUpdate, onDelete, onMerge, onSeek]
  );

  const keyExtractor = useCallback((_: Subtitle, index: number) => `sub-${index}`, []);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{subtitles.length} mots</Text>
      <FlatList
        ref={flatListRef}
        data={subtitles}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.list}
        initialNumToRender={20}
        maxToRenderPerBatch={15}
        windowSize={10}
        removeClippedSubviews
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  list: { flex: 1 },
});
