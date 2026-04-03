import * as FileSystem from 'expo-file-system/legacy';

const WINDOW_MS = 20;
const SAMPLE_RATE = 16000;
const SAMPLES_PER_WINDOW = (SAMPLE_RATE * WINDOW_MS) / 1000; // 320

/**
 * Read a 16kHz mono 16-bit PCM WAV file and return Float32 samples.
 */
export async function readWavSamples(wavPath: string): Promise<Float32Array> {
  const base64 = await FileSystem.readAsStringAsync(wavPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  // WAV header = 44 bytes, PCM 16-bit samples after
  const dataView = new DataView(bytes.buffer);
  const numSamples = (bytes.length - 44) / 2;
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = dataView.getInt16(44 + i * 2, true) / 32768.0;
  }
  return samples;
}

/**
 * Compute RMS energy per 20ms window for a range of samples.
 * Returns an array of energy values (0.0 to 1.0).
 */
export function computeEnergy(
  samples: Float32Array,
  startSec: number,
  endSec: number
): number[] {
  const startSample = Math.floor(startSec * SAMPLE_RATE);
  const endSample = Math.min(Math.floor(endSec * SAMPLE_RATE), samples.length);
  const numWindows = Math.floor((endSample - startSample) / SAMPLES_PER_WINDOW);

  if (numWindows <= 0) return [];

  const energy: number[] = [];
  for (let w = 0; w < numWindows; w++) {
    const windowStart = startSample + w * SAMPLES_PER_WINDOW;
    let sumSquares = 0;
    for (let i = 0; i < SAMPLES_PER_WINDOW; i++) {
      const idx = windowStart + i;
      if (idx < samples.length) {
        sumSquares += samples[idx] * samples[idx];
      }
    }
    energy.push(Math.sqrt(sumSquares / SAMPLES_PER_WINDOW));
  }
  return energy;
}

export interface SpeechRegion {
  startSec: number;
  endSec: number;
}

/**
 * Find speech regions within a time range based on energy.
 * Returns regions where energy exceeds the threshold.
 */
export function findSpeechRegions(
  energy: number[],
  segStartSec: number,
  threshold?: number
): SpeechRegion[] {
  if (energy.length === 0) return [];

  // Auto threshold: 30% of max energy in segment
  const maxEnergy = Math.max(...energy);
  const thr = threshold ?? maxEnergy * 0.15;

  const windowDuration = WINDOW_MS / 1000;
  const regions: SpeechRegion[] = [];
  let regionStart: number | null = null;

  for (let i = 0; i < energy.length; i++) {
    const timeSec = segStartSec + i * windowDuration;
    if (energy[i] >= thr) {
      if (regionStart === null) {
        regionStart = timeSec;
      }
    } else {
      if (regionStart !== null) {
        regions.push({ startSec: regionStart, endSec: timeSec });
        regionStart = null;
      }
    }
  }
  // Close final region
  if (regionStart !== null) {
    regions.push({
      startSec: regionStart,
      endSec: segStartSec + energy.length * windowDuration,
    });
  }

  // Merge regions that are very close (< 100ms gap)
  const merged: SpeechRegion[] = [];
  for (const r of regions) {
    if (merged.length > 0 && r.startSec - merged[merged.length - 1].endSec < 0.1) {
      merged[merged.length - 1].endSec = r.endSec;
    } else {
      merged.push({ ...r });
    }
  }

  // If no speech detected, return the whole segment as one region
  if (merged.length === 0) {
    return [{ startSec: segStartSec, endSec: segStartSec + energy.length * windowDuration }];
  }

  return merged;
}
