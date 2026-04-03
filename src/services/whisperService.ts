import { initWhisper, WhisperContext } from 'whisper.rn';
import { getModelPath } from './modelService';
import { readWavSamples, computeEnergy, findSpeechRegions, SpeechRegion } from './audioAnalysis';
import { Subtitle } from '../types';

let whisperContext: WhisperContext | null = null;

async function getWhisperContext(): Promise<WhisperContext> {
  if (whisperContext) return whisperContext;
  whisperContext = await initWhisper({ filePath: getModelPath() });
  return whisperContext;
}

export async function releaseWhisperContext(): Promise<void> {
  if (whisperContext) {
    await whisperContext.release();
    whisperContext = null;
  }
}

export interface TranscribeResult {
  subtitles: Subtitle[];
  language: string;
}

/**
 * Distribute words across speech regions based on audio energy.
 *
 * Instead of splitting proportionally by character count across
 * the entire segment, we:
 * 1. Analyze audio energy to find where speech actually happens
 * 2. Skip micro-silences within the segment
 * 3. Distribute words proportionally only across speech regions
 */
function distributeWordsInSpeechRegions(
  words: string[],
  regions: SpeechRegion[]
): Subtitle[] {
  if (words.length === 0 || regions.length === 0) return [];

  const totalSpeechTime = regions.reduce((s, r) => s + (r.endSec - r.startSec), 0);
  if (totalSpeechTime <= 0) return [];

  const totalChars = words.reduce((s, w) => s + w.length, 0);
  const results: Subtitle[] = [];
  let wordIdx = 0;

  for (const region of regions) {
    const regionDuration = region.endSec - region.startSec;
    // How many characters fit in this region proportionally
    const regionChars = Math.round(totalChars * (regionDuration / totalSpeechTime));

    // Assign words to this region until we fill the character budget
    let charsUsed = 0;
    let cursor = region.startSec;
    const regionWords: string[] = [];

    while (wordIdx < words.length) {
      // Last region gets all remaining words
      if (regions.indexOf(region) === regions.length - 1) {
        regionWords.push(words[wordIdx]);
        wordIdx++;
      } else if (charsUsed + words[wordIdx].length <= regionChars || regionWords.length === 0) {
        charsUsed += words[wordIdx].length;
        regionWords.push(words[wordIdx]);
        wordIdx++;
      } else {
        break;
      }
    }

    // Distribute words within this region proportionally
    if (regionWords.length > 0) {
      const regionTotalChars = regionWords.reduce((s, w) => s + w.length, 0);
      for (let i = 0; i < regionWords.length; i++) {
        const proportion = regionWords[i].length / regionTotalChars;
        const wordDur = regionDuration * proportion;
        const wordEnd = i === regionWords.length - 1 ? region.endSec : cursor + wordDur;
        results.push({ text: regionWords[i], start: cursor, end: wordEnd });
        cursor = wordEnd;
      }
    }
  }

  return results;
}

export async function transcribeAudio(
  audioPath: string,
  onProgress: (progress: number) => void
): Promise<TranscribeResult> {
  // Step 1: Read audio samples for energy analysis
  onProgress(2);
  let samples: Float32Array | null = null;
  try {
    samples = await readWavSamples(audioPath);
  } catch {
    // If WAV reading fails, fall back to simple split
  }
  onProgress(5);

  // Step 2: Whisper transcription
  const ctx = await getWhisperContext();
  const { promise } = ctx.transcribe(audioPath, {
    language: 'fr',
    tokenTimestamps: true,
    onProgress: (p: number) => onProgress(5 + Math.round(p * 0.9)),
  });

  const result = await promise;
  onProgress(95);

  // Step 3: Split segments into words using audio energy
  const subtitles: Subtitle[] = [];
  if (result.segments) {
    for (const seg of result.segments) {
      const text = seg.text?.trim();
      if (!text || !/\w/.test(text)) continue;

      const segStart = seg.t0 / 100;
      const segEnd = seg.t1 / 100;
      const words = text.split(/\s+/).filter((w) => w.length > 0 && /\w/.test(w));

      if (words.length <= 1) {
        subtitles.push({ text: words[0] || text, start: segStart, end: segEnd });
        continue;
      }

      if (samples) {
        // Energy-based distribution
        const energy = computeEnergy(samples, segStart, segEnd);
        const regions = findSpeechRegions(energy, segStart);
        const distributed = distributeWordsInSpeechRegions(words, regions);
        subtitles.push(...distributed);
      } else {
        // Fallback: proportional by char count
        const totalChars = words.reduce((s, w) => s + w.length, 0);
        const duration = segEnd - segStart;
        let cursor = segStart;
        for (let i = 0; i < words.length; i++) {
          const proportion = words[i].length / totalChars;
          const wordEnd = i === words.length - 1 ? segEnd : cursor + duration * proportion;
          subtitles.push({ text: words[i], start: cursor, end: wordEnd });
          cursor = wordEnd;
        }
      }
    }
  }

  // Ensure minimum display time per word (0.15s)
  const MIN_DUR = 0.15;
  for (let i = 0; i < subtitles.length; i++) {
    if (subtitles[i].end - subtitles[i].start < MIN_DUR) {
      subtitles[i].end = subtitles[i].start + MIN_DUR;
    }
    // Push next word if we overlap
    if (i < subtitles.length - 1 && subtitles[i].end > subtitles[i + 1].start) {
      subtitles[i + 1].start = subtitles[i].end;
      if (subtitles[i + 1].end < subtitles[i + 1].start + MIN_DUR) {
        subtitles[i + 1].end = subtitles[i + 1].start + MIN_DUR;
      }
    }
  }

  await releaseWhisperContext();
  onProgress(100);

  return {
    subtitles,
    language: result.result?.language || 'fr',
  };
}
