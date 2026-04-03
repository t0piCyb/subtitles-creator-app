import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/theme';
import { WHISPER_MODEL_SIZE_MB } from '../constants/subtitleDefaults';
import { downloadModel, DownloadStatus } from '../services/modelService';
import { ProgressBar } from './ProgressBar';

interface Props {
  onDownloaded: () => void;
}

type State = 'idle' | 'downloading' | 'error';

export function ModelDownloader({ onDownloaded }: Props) {
  const [state, setState] = useState<State>('idle');
  const [status, setStatus] = useState<DownloadStatus>({
    progress: 0,
    downloadedMB: 0,
    totalMB: WHISPER_MODEL_SIZE_MB,
    speed: '',
    resumed: false,
  });
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    setState('downloading');
    setErrorMsg('');
    try {
      await downloadModel(setStatus);
      onDownloaded();
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur inconnue');
      setState('error');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modèle Whisper requis</Text>
      <Text style={styles.description}>
        Le modèle de transcription ({WHISPER_MODEL_SIZE_MB} Mo) doit être téléchargé une seule fois.
      </Text>

      {state === 'downloading' && (
        <View style={styles.progressSection}>
          {status.resumed && (
            <Text style={styles.resumedText}>Reprise du téléchargement...</Text>
          )}
          <ProgressBar progress={status.progress} label={status.label} />
          <Text style={styles.stats}>
            {status.downloadedMB} / {status.totalMB} Mo
            {status.speed ? `  •  ${status.speed}` : ''}
          </Text>
        </View>
      )}

      {state === 'error' && (
        <View style={styles.errorSection}>
          <Text style={styles.errorText}>{errorMsg}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleDownload}>
            <Text style={styles.buttonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      )}

      {state === 'idle' && (
        <TouchableOpacity style={styles.button} onPress={handleDownload}>
          <Text style={styles.buttonText}>Télécharger le modèle</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    backgroundColor: colors.surface,
    borderRadius: 16,
    gap: 16,
    margin: 20,
  },
  title: { color: colors.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  description: { color: colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  progressSection: { gap: 8 },
  resumedText: { color: colors.success, fontSize: 13, textAlign: 'center' as const },
  stats: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  errorSection: { gap: 12, alignItems: 'center' },
  errorText: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.text, fontSize: 16, fontWeight: '600' },
});
