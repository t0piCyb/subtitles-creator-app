import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { colors } from '../constants/theme';
import { ProgressBar } from '../components/ProgressBar';
import { useProjectStore } from '../store/useProjectStore';
import { extractAudio } from '../services/ffmpegService';
import { transcribeAudio } from '../services/whisperService';
import { getAudioPath } from '../services/fileService';

export function TranscribingScreen({ navigation }: any) {
  const [status, setStatus] = useState('Extraction audio...');
  const [progress, setProgress] = useState(0);

  const videoPath = useProjectStore((s) => s.videoPath);
  const setSubtitles = useProjectStore((s) => s.setSubtitles);
  const setOriginalSubtitles = useProjectStore((s) => s.setOriginalSubtitles);
  const setDetectedLanguage = useProjectStore((s) => s.setDetectedLanguage);

  useEffect(() => {
    if (!videoPath) {
      navigation.goBack();
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await activateKeepAwakeAsync();

        // Step 1: Extract audio
        setStatus('Extraction audio...');
        setProgress(0);
        const audioPath = getAudioPath();
        await extractAudio(videoPath, audioPath);

        if (cancelled) return;

        // Step 2: Transcribe
        setStatus('Transcription en cours...');
        setProgress(0);
        const result = await transcribeAudio(audioPath, (p) => {
          if (!cancelled) setProgress(p);
        });

        if (cancelled) return;

        setSubtitles(result.subtitles);
        setOriginalSubtitles(result.subtitles);
        setDetectedLanguage(result.language);

        navigation.replace('Editor');
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Erreur de transcription', err.message, [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      } finally {
        deactivateKeepAwake();
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [videoPath]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Transcription</Text>
        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} label={status} />
        </View>
        <Text style={styles.hint}>
          La transcription peut prendre quelques minutes selon la durée de la vidéo.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', marginBottom: 40 },
  progressContainer: { width: '100%' },
  hint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 32,
    lineHeight: 20,
  },
});
