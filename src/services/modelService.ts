import * as FileSystem from 'expo-file-system/legacy';
import {
  WHISPER_MODEL_URL,
  WHISPER_MODEL_FILENAME,
  WHISPER_MODEL_SIZE_MB,
} from '../constants/subtitleDefaults';

const MODELS_DIR = `${FileSystem.documentDirectory}models/`;
const MODEL_PATH = `${MODELS_DIR}${WHISPER_MODEL_FILENAME}`;
const PARTIAL_PATH = `${MODEL_PATH}.partial`;
const MAX_RETRIES = 5;

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
  label?: string;
}

export async function downloadModel(
  onStatus: (status: DownloadStatus) => void
): Promise<string> {
  const dirInfo = await FileSystem.getInfoAsync(MODELS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(MODELS_DIR, { intermediates: true });
  }

  const existing = await FileSystem.getInfoAsync(MODEL_PATH);
  if (existing.exists) {
    onStatus({ progress: 100, downloadedMB: WHISPER_MODEL_SIZE_MB, totalMB: WHISPER_MODEL_SIZE_MB, speed: '', resumed: false });
    return MODEL_PATH;
  }

  // Retry loop with resume support
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const startTime = Date.now();
      const resumed = attempt > 1;

      if (resumed) {
        onStatus({ progress: 0, downloadedMB: 0, totalMB: WHISPER_MODEL_SIZE_MB, speed: '', resumed: true, label: `Reprise (tentative ${attempt}/${MAX_RETRIES})` });
      }

      const dl = FileSystem.createDownloadResumable(
        WHISPER_MODEL_URL,
        PARTIAL_PATH,
        {},
        (p) => {
          const loaded = p.totalBytesWritten;
          const total = p.totalBytesExpectedToWrite || WHISPER_MODEL_SIZE_MB * 1024 * 1024;
          const progress = Math.min(99, Math.round((loaded / total) * 100));
          const downloadedMB = Math.round((loaded / (1024 * 1024)) * 10) / 10;
          const totalMB = Math.round((total / (1024 * 1024)) * 10) / 10;
          const elapsed = (Date.now() - startTime) / 1000;
          const speedMBs = elapsed > 0 ? downloadedMB / elapsed : 0;
          const speed = speedMBs >= 1 ? `${speedMBs.toFixed(1)} Mo/s` : `${(speedMBs * 1024).toFixed(0)} Ko/s`;
          onStatus({ progress, downloadedMB, totalMB, speed, resumed, label: 'Modèle Whisper' });
        }
      );

      const result = await dl.downloadAsync();
      if (!result?.uri) throw new Error('Download returned no URI');

      // Rename partial to final
      await FileSystem.moveAsync({ from: PARTIAL_PATH, to: MODEL_PATH });

      onStatus({ progress: 100, downloadedMB: WHISPER_MODEL_SIZE_MB, totalMB: WHISPER_MODEL_SIZE_MB, speed: '', resumed: false });
      return MODEL_PATH;
    } catch (err: any) {
      console.warn(`[Download] Attempt ${attempt}/${MAX_RETRIES} failed:`, err.message);

      // Clean up partial file before retry
      try { await FileSystem.deleteAsync(PARTIAL_PATH, { idempotent: true }); } catch {}

      if (attempt === MAX_RETRIES) {
        throw new Error(`Téléchargement échoué après ${MAX_RETRIES} tentatives. Vérifiez votre connexion.`);
      }

      // Wait before retry (exponential backoff: 2s, 4s, 8s, 16s)
      const delay = Math.pow(2, attempt) * 1000;
      onStatus({ progress: 0, downloadedMB: 0, totalMB: WHISPER_MODEL_SIZE_MB, speed: '', resumed: true, label: `Reconnexion dans ${delay / 1000}s...` });
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw new Error('Téléchargement échoué');
}
