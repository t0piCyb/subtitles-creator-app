import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as MediaLibrary from 'expo-media-library';
import { colors } from '../constants/theme';
import { ProgressBar } from '../components/ProgressBar';
import { useProjectStore } from '../store/useProjectStore';
import { burnSubtitles } from '../services/ffmpegService';

export function ExportScreen({ navigation, route }: any) {
  const highQuality: boolean = route?.params?.highQuality ?? false;
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Génération en cours...');
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const videoPath = useProjectStore((s) => s.videoPath);
  const subtitles = useProjectStore((s) => s.subtitles);
  const fontSize = useProjectStore((s) => s.fontSize);

  useEffect(() => {
    if (!videoPath || subtitles.length === 0) {
      navigation.goBack();
      return;
    }

    let cancelled = false;

    const run = async () => {
      try {
        await activateKeepAwakeAsync();
        setStatus('Incrustation des sous-titres...');

        const output = await burnSubtitles(videoPath, subtitles, fontSize, highQuality, (p) => {
          if (!cancelled) setProgress(p);
        });

        if (cancelled) return;

        setOutputPath(output);
        setStatus('Terminé !');
        setProgress(100);
      } catch (err: any) {
        if (!cancelled) {
          Alert.alert('Erreur', err.message, [
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
  }, []);

  const saveToGallery = async () => {
    if (!outputPath) return;

    const permission = await MediaLibrary.requestPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "L'accès à la galerie est nécessaire pour sauvegarder.");
      return;
    }

    try {
      await MediaLibrary.saveToLibraryAsync(outputPath);
      setSaved(true);
      Alert.alert('Sauvegardé', 'La vidéo sous-titrée a été enregistrée dans votre galerie.');
    } catch (err: any) {
      Alert.alert('Erreur', `Sauvegarde impossible: ${err.message}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Export</Text>

        <View style={styles.progressContainer}>
          <ProgressBar progress={progress} label={status} />
        </View>

        {outputPath && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, saved && styles.buttonDisabled]}
              onPress={saveToGallery}
              disabled={saved}
            >
              <Text style={styles.buttonText}>
                {saved ? 'Sauvegardé !' : 'Enregistrer dans la galerie'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Retour à l'éditeur</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={() => navigation.popToTop()}
            >
              <Text style={styles.secondaryButtonText}>Nouvelle vidéo</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: 'center', padding: 32 },
  title: { color: colors.text, fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 40 },
  progressContainer: { width: '100%' },
  actions: { marginTop: 40, gap: 12 },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: colors.success },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: colors.surface },
  secondaryButtonText: { color: colors.text, fontSize: 15 },
});
