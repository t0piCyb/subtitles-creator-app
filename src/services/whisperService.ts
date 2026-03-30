import { initWhisper, WhisperContext } from 'whisper.rn';
import { getModelPath } from './modelService';
import { Subtitle } from '../types';
import { mergeCompoundWords } from '../utils/compoundWords';

let whisperContext: WhisperContext | null = null;

export async function getWhisperContext(): Promise<WhisperContext> {
  if (whisperContext) return whisperContext;

  const modelPath = getModelPath();
  whisperContext = await initWhisper({ filePath: modelPath });
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
 * Split a segment into individual words with interpolated timestamps.
 */
function splitSegmentIntoWords(
  text: string,
  start: number,
  end: number
): Subtitle[] {
  const rawWords = text.split(/\s+/).filter((w) => w.length > 0);
  if (rawWords.length === 0) return [];
  if (rawWords.length === 1) {
    return [{ text: rawWords[0], start, end }];
  }

  const duration = end - start;
  const wordDuration = duration / rawWords.length;

  return rawWords.map((word, i) => ({
    text: word,
    start: start + i * wordDuration,
    end: start + (i + 1) * wordDuration,
  }));
}

/**
 * Transcribe a WAV audio file using whisper.rn.
 * The audio must be 16kHz mono WAV (extract from video with FFmpeg first).
 */
export async function transcribeAudio(
  audioPath: string,
  onProgress: (progress: number) => void
): Promise<TranscribeResult> {
  const ctx = await getWhisperContext();

  const { promise } = ctx.transcribe(audioPath, {
    language: 'auto',
    tokenTimestamps: true,
    // maxLen limits segment length in chars — keeps segments short (~1-2 words)
    // so interpolated timestamps are accurate even without word-level data
    maxLen: 15,
    onProgress: (progress: number) => {
      onProgress(Math.round(progress));
    },
  });

  const result = await promise;

  const words: Subtitle[] = [];
  if (result.segments) {
    for (const segment of result.segments) {
      const segStart = segment.t0 / 100;
      const segEnd = segment.t1 / 100;

      // Try word-level timestamps first
      if (segment.words && segment.words.length > 0) {
        for (const word of segment.words) {
          const text = word.word?.trim();
          if (text) {
            words.push({
              text,
              start: word.t0 / 100,
              end: word.t1 / 100,
            });
          }
        }
      } else {
        // Fallback: split segment text into words with interpolated timing
        const segText = segment.text?.trim();
        if (segText) {
          const splitWords = splitSegmentIntoWords(segText, segStart, segEnd);
          words.push(...splitWords);
        }
      }
    }
  }

  // Merge French compound words (l'homme, qu'est-ce, etc.)
  const merged = mergeCompoundWords(words);

  // Release context to free memory before FFmpeg
  await releaseWhisperContext();

  return {
    subtitles: merged,
    language: result.result?.language || 'unknown',
  };
}
