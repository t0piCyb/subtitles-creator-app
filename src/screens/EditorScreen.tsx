import React, { useCallback, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/theme';
import { useProjectStore } from '../store/useProjectStore';
import { VideoPreview, VideoPreviewRef } from '../components/VideoPreview';
import { SubtitleList } from '../components/SubtitleList';
import { FontSizeSlider } from '../components/FontSizeSlider';
import { Subtitle } from '../types';

export function EditorScreen({ navigation }: any) {
  const videoPath = useProjectStore((s) => s.videoPath);
  const subtitles = useProjectStore((s) => s.subtitles);
  const fontSize = useProjectStore((s) => s.fontSize);
  const updateSubtitle = useProjectStore((s) => s.updateSubtitle);
  const deleteSubtitle = useProjectStore((s) => s.deleteSubtitle);
  const mergeWithNext = useProjectStore((s) => s.mergeWithNext);
  const addSubtitle = useProjectStore((s) => s.addSubtitle);
  const resetSubtitles = useProjectStore((s) => s.resetSubtitles);
  const setFontSize = useProjectStore((s) => s.setFontSize);

  const videoRef = useRef<VideoPreviewRef>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [highQuality, setHighQuality] = useState(false);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);
      const idx = subtitles.findIndex((s) => time >= s.start && time <= s.end);
      setActiveIndex(idx);
    },
    [subtitles]
  );

  const handleSeek = useCallback((time: number) => {
    videoRef.current?.seek(time);
  }, []);

  const handleUpdate = useCallback(
    (index: number, field: keyof Subtitle, value: string | number) => {
      updateSubtitle(index, field, value);
    },
    [updateSubtitle]
  );

  const handleDelete = useCallback(
    (index: number) => {
      deleteSubtitle(index);
    },
    [deleteSubtitle]
  );

  const handleMerge = useCallback(
    (index: number) => {
      mergeWithNext(index);
    },
    [mergeWithNext]
  );

  if (!videoPath) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Video Preview */}
      <VideoPreview
        ref={videoRef}
        videoPath={videoPath}
        subtitles={subtitles}
        fontSize={fontSize}
        onTimeUpdate={handleTimeUpdate}
      />

      {/* Font Size + Quality */}
      <FontSizeSlider value={fontSize} onChange={setFontSize} />
      <View style={styles.qualityRow}>
        <Text style={styles.qualityLabel}>Haute qualité (plus lent)</Text>
        <Switch
          value={highQuality}
          onValueChange={setHighQuality}
          trackColor={{ false: colors.surfaceLight, true: colors.accent }}
          thumbColor={highQuality ? colors.accentLight : colors.textSecondary}
        />
      </View>

      {/* Subtitle List */}
      <SubtitleList
        subtitles={subtitles}
        activeIndex={activeIndex}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onMerge={handleMerge}
        onSeek={handleSeek}
      />

      {/* Bottom Toolbar */}
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolBtn} onPress={() => addSubtitle(currentTime)}>
          <Text style={styles.toolBtnText}>+ Ajouter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toolBtn} onPress={resetSubtitles}>
          <Text style={styles.toolBtnText}>Reset</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toolBtn, styles.generateBtn]}
          onPress={() => navigation.navigate('Export', { highQuality })}
        >
          <Text style={styles.generateBtnText}>Générer</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    flexDirection: 'row',
    padding: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  toolBtnText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  generateBtn: { backgroundColor: colors.accent, flex: 2 },
  generateBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  qualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  qualityLabel: { color: colors.textSecondary, fontSize: 13 },
});
