import React, { useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Video, { OnProgressData } from 'react-native-video';
import { Subtitle } from '../types';
import { colors, fonts } from '../constants/theme';

interface Props {
  videoPath: string;
  subtitles: Subtitle[];
  fontSize: number;
  onTimeUpdate: (currentTime: number) => void;
}

export interface VideoPreviewRef {
  seek: (time: number) => void;
}

export const VideoPreview = forwardRef<VideoPreviewRef, Props>(function VideoPreview(
  { videoPath, subtitles, fontSize, onTimeUpdate },
  ref
) {
  const videoRef = useRef<any>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    seek: (time: number) => {
      videoRef.current?.seek(time);
    },
  }));

  const handleProgress = useCallback(
    (data: OnProgressData) => {
      const time = data.currentTime;
      onTimeUpdate(time);

      // Find active subtitle
      const active = subtitles.find((s) => time >= s.start && time <= s.end);
      setCurrentSubtitle(active ? active.text.toUpperCase() : null);
    },
    [subtitles, onTimeUpdate]
  );

  // Scale font size for preview (ASS uses playRes coordinates, we use screen pixels)
  const previewFontSize = Math.max(12, Math.round(fontSize * 0.3));

  return (
    <View style={styles.container}>
      <Video
        ref={videoRef}
        source={{ uri: videoPath }}
        style={styles.video}
        resizeMode="contain"
        controls
        paused
        onProgress={handleProgress}
        progressUpdateInterval={100}
      />
      {currentSubtitle && (
        <View style={styles.subtitleOverlay} pointerEvents="none">
          <Text
            style={[
              styles.subtitleText,
              {
                fontSize: previewFontSize,
                fontFamily: fonts.montserratBold,
              },
            ]}
          >
            {currentSubtitle}
          </Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    alignItems: 'center',
  },
  subtitleText: {
    color: colors.subtitle,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
});
