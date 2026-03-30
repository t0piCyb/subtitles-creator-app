import * as FileSystem from 'expo-file-system/legacy';

const WORK_DIR = `${FileSystem.cacheDirectory}subtitles-work/`;

export async function ensureWorkDir(): Promise<string> {
  const info = await FileSystem.getInfoAsync(WORK_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(WORK_DIR, { intermediates: true });
  }
  return WORK_DIR;
}

/**
 * Copy a video from a content:// or file:// URI to our work directory.
 * Returns the new file path that FFmpeg can read.
 */
export async function copyVideoToWorkDir(uri: string): Promise<string> {
  await ensureWorkDir();
  const ext = uri.split('.').pop()?.toLowerCase() || 'mp4';
  const filename = `input_${Date.now()}.${ext}`;
  const destPath = `${WORK_DIR}${filename}`;

  await FileSystem.copyAsync({ from: uri, to: destPath });
  return destPath;
}

export function getAudioPath(): string {
  return `${WORK_DIR}audio_${Date.now()}.wav`;
}

export function getAssPath(): string {
  return `${WORK_DIR}subtitles_${Date.now()}.ass`;
}

export function getOutputPath(): string {
  return `${WORK_DIR}output_subtitled_${Date.now()}.mp4`;
}

export async function getFontsDir(): Promise<string> {
  const fontsDir = `${FileSystem.documentDirectory}fonts/`;
  const info = await FileSystem.getInfoAsync(fontsDir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(fontsDir, { intermediates: true });
  }
  return fontsDir;
}

export async function cleanup(): Promise<void> {
  const info = await FileSystem.getInfoAsync(WORK_DIR);
  if (info.exists) {
    await FileSystem.deleteAsync(WORK_DIR, { idempotent: true });
  }
}
