import * as FileSystem from 'expo-file-system/legacy';
import {
  WHISPER_MODEL_URL,
  WHISPER_MODEL_FILENAME,
  WHISPER_MODEL_SIZE_MB,
} from '../constants/subtitleDefaults';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODELS_DIR}${WHISPER_MODEL_FILENAME}`;

export function getModelPath(): string {
  return MODEL_PATH;
}

export async function isModelReady(): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(MODEL_PATH);
    return info.exists;
  } catch {
    return false;
  }
}

export interface DownloadStatus {
  progress: number;
  downloadedMB: number;
  totalMB: number;
  speed: string;
  resumed: boolean;
}

export async function downloadModel(
  onStatus: (status: DownloadStatus) => void
): Promise<string> {
  // Ensure directory exists
  const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }

  const startTime = Date.now();

  const downloadResumable = FileSystem.createDownloadResumable(
    WHISPER_MODEL_URL,
    MODEL_PATH,
    {},
    (downloadProgress) => {
      const loaded = downloadProgress.totalBytesWritten;
      const total = downloadProgress.totalBytesExpectedToWrite || WHISPER_MODEL_SIZE_MB * 1024 * 1024;
      const progress = Math.min(99, Math.round((loaded / total) * 100));
      const downloadedMB = Math.round((loaded / (1024 * 1024)) * 10) / 10;
      const totalMB = Math.round((total / (1024 * 1024)) * 10) / 10;

      const elapsed = (Date.now() - startTime) / 1000;
      const speedMBs = elapsed > 0 ? downloadedMB / elapsed : 0;
      const speed = speedMBs >= 1
        ? `${speedMBs.toFixed(1)} Mo/s`
        : `${(speedMBs * 1024).toFixed(0)} Ko/s`;

      onStatus({ progress, downloadedMB, totalMB, speed, resumed: false });
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result?.uri) {
    throw new Error('Le téléchargement du modèle a échoué');
  }

  onStatus({
    progress: 100,
    downloadedMB: WHISPER_MODEL_SIZE_MB,
    totalMB: WHISPER_MODEL_SIZE_MB,
    speed: '',
    resumed: false,
  });

  return result.uri;
}
