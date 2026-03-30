import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../constants/theme';
import { isModelReady } from '../services/modelService';
import { copyVideoToWorkDir } from '../services/fileService';
import { ModelDownloader } from '../components/ModelDownloader';
import { useProjectStore } from '../store/useProjectStore';

export function HomeScreen({ navigation }: any) {
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const reset = useProjectStore((s) => s.reset);
  const setVideoPath = useProjectStore((s) => s.setVideoPath);

  useEffect(() => {
    checkModel();
  }, []);

  const checkModel = async () => {
    try {
      const ready = await isModelReady();
      setModelReady(ready);
    } catch {
      setModelReady(false);
    }
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission requise', "L'accès à la galerie est nécessaire.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      quality: 1,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setLoading(true);
    try {
      reset();
      const videoUri = result.assets[0].uri;
      const localPath = await copyVideoToWorkDir(videoUri);
      setVideoPath(localPath);
      navigation.navigate('Transcribing');
    } catch (err: any) {
      Alert.alert('Erreur', `Impossible de charger la vidéo: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Sous-titres Creator</Text>
        <Text style={styles.subtitle}>Transcription & sous-titrage local</Text>

        {modelReady === null ? (
          <ActivityIndicator color={colors.accent} size="large" style={{ marginTop: 40 }} />
        ) : !modelReady ? (
          <ModelDownloader onDownloaded={() => setModelReady(true)} />
        ) : (
          <View style={styles.pickerSection}>
            {loading ? (
              <ActivityIndicator color={colors.accent} size="large" />
            ) : (
              <TouchableOpacity style={styles.pickButton} onPress={pickVideo}>
                <Text style={styles.pickIcon}>🎬</Text>
                <Text style={styles.pickText}>Choisir une vidéo</Text>
                <Text style={styles.pickHint}>MP4, MOV, AVI, WebM</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, alignItems: 'center', paddingTop: 60 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700' },
  subtitle: { color: colors.textSecondary, fontSize: 15, marginTop: 8 },
  pickerSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  pickButton: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 40,
    paddingHorizontal: 50,
    alignItems: 'center',
    gap: 12,
  },
  pickIcon: { fontSize: 48 },
  pickText: { color: colors.text, fontSize: 18, fontWeight: '600' },
  pickHint: { color: colors.textSecondary, fontSize: 13 },
});
