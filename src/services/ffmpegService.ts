import { FFmpegKit, FFmpegKitConfig, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Subtitle } from '../types';
import { generateAss } from '../utils/assGenerator';
import { getAssPath, getOutputPath, getFontsDir } from './fileService';

/**
 * Extract audio from video as 16kHz mono WAV for Whisper.
 */
export async function extractAudio(
  videoPath: string,
  audioPath: string
): Promise<void> {
  const vPath = videoPath.replace(/^file:\/\//, '');
  const aPath = audioPath.replace(/^file:\/\//, '');
  const cmd = `-i ${vPath} -ar 16000 -ac 1 -c:a pcm_s16le -y ${aPath}`;
  const session = await FFmpegKit.execute(cmd);
  const returnCode = await session.getReturnCode();
  if (!ReturnCode.isSuccess(returnCode)) {
    const logs = await session.getLogsAsString();
    throw new Error(`Audio extraction failed: ${logs?.slice(-200)}`);
  }
}

/**
 * Get video dimensions using FFprobe.
 */
export async function getVideoDimensions(
  videoPath: string
): Promise<{ width: number; height: number; durationMs: number }> {
  const session = await FFprobeKit.getMediaInformation(videoPath);
  const info = session.getMediaInformation();

  if (info) {
    const streams = info.getStreams();
    const videoStream = streams?.find(
      (s: any) => s.getType() === 'video'
    );
    if (videoStream) {
      const width = Number(videoStream.getWidth()) || 1920;
      const height = Number(videoStream.getHeight()) || 1080;
      const durationStr = String(info.getDuration() ?? '');
      const durationMs = durationStr ? parseFloat(durationStr) * 1000 : 60000;
      return { width, height, durationMs };
    }
  }

  return { width: 1920, height: 1080, durationMs: 60000 };
}

/**
 * Copy bundled Montserrat font to accessible directory for FFmpeg libass.
 */
async function ensureFont(): Promise<string> {
  const fontsDir = await getFontsDir();
  const fontDest = `${fontsDir}Montserrat-Bold.ttf`;
  const info = await FileSystem.getInfoAsync(fontDest);

  if (!info.exists) {
    try {
      const { Asset } = require('expo-asset');
      const asset = Asset.fromModule(require('../../assets/fonts/Montserrat-Bold.ttf'));
      await asset.downloadAsync();
      if (asset.localUri) {
        await FileSystem.copyAsync({ from: asset.localUri, to: fontDest });
      }
    } catch {
      console.warn('Could not copy font from assets');
    }
  }

  return fontsDir;
}

/**
 * Burn subtitles into video using FFmpeg with ASS filter.
 */
export async function burnSubtitles(
  videoPath: string,
  subtitles: Subtitle[],
  fontSize: number,
  highQuality: boolean,
  onProgress: (progress: number) => void
): Promise<string> {
  // Get video dimensions
  const { width, height, durationMs } = await getVideoDimensions(videoPath);

  // Generate ASS file
  const assContent = generateAss(subtitles, width, height, fontSize);
  const assPath = getAssPath();
  await FileSystem.writeAsStringAsync(assPath, assContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Ensure font is available
  const fontsDir = await ensureFont();

  // Set font directory for libass
  try {
    await FFmpegKitConfig.setFontDirectoryList([fontsDir]);
  } catch {
    // Some versions don't support this
  }

  const outputPath = getOutputPath();

  // Strip file:// prefix — FFmpeg needs raw filesystem paths
  const toPath = (uri: string) => uri.replace(/^file:\/\//, '');

  // Escape special chars for FFmpeg ass filter (colons have special meaning)
  const escapeFilter = (p: string) => toPath(p).replace(/:/g, '\\:');

  const inputPath = toPath(videoPath);
  const outPath = toPath(outputPath);
  const filterAssPath = escapeFilter(assPath);
  const filterFontsDir = escapeFilter(fontsDir);

  // Enable statistics callback for progress
  const statisticsCallback = (statistics: any) => {
    const time = statistics.getTime();
    if (time > 0 && durationMs > 0) {
      const progress = Math.min(99, Math.round((time / durationMs) * 100));
      onProgress(progress);
    }
  };

  FFmpegKitConfig.enableStatisticsCallback(statisticsCallback);

  // Try encoders in order: H.264 hardware → H.264 software → mpeg4
  const bitrate = highQuality ? '10M' : '4M';
  const mpeg4Quality = highQuality ? '2' : '5';
  const encoders = [
    { codec: 'h264_mediacodec', opts: `-b:v ${bitrate} -pix_fmt yuv420p` },
    { codec: 'libx264', opts: `-preset fast -crf ${highQuality ? '18' : '23'} -pix_fmt yuv420p` },
    { codec: 'mpeg4', opts: `-q:v ${mpeg4Quality} -pix_fmt yuv420p` },
  ];

  let lastSession: any = null;
  let success = false;

  for (const enc of encoders) {
    const cmd = `-i ${inputPath} -vf ass=${filterAssPath}:fontsdir=${filterFontsDir} -c:v ${enc.codec} ${enc.opts} -c:a aac -b:a 128k -movflags +faststart -y ${outPath}`;
    lastSession = await FFmpegKit.execute(cmd);
    const rc = await lastSession.getReturnCode();
    if (ReturnCode.isSuccess(rc)) {
      success = true;
      break;
    }
  }

  // Clean up ASS file
  await FileSystem.deleteAsync(assPath, { idempotent: true });

  if (!success) {
    const logs = await lastSession?.getLogsAsString();
    throw new Error(`Subtitle burn failed: ${logs?.slice(-300)}`);
  }

  onProgress(100);
  return outputPath;
}
