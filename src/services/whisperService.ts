import { initWhisper, WhisperContext } from 'whisper.rn';
import { getModelPath } from './modelService';
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
 * Split a whisper segment into individual words.
 * Time distributed proportionally to word length.
 * Words stay within the segment's t0-t1 (no bleed into silences).
 */
function splitSegmentIntoWords(text: string, segStart: number, segEnd: number): Subtitle[] {
  const rawWords = text.split(/\s+/).filter((w) => w.length > 0 && /\w/.test(w));
  if (rawWords.length === 0) return [];
  if (rawWords.length === 1) return [{ text: rawWords[0], start: segStart, end: segEnd }];

  const totalChars = rawWords.reduce((sum, w) => sum + w.length, 0);
  const duration = segEnd - segStart;
  const words: Subtitle[] = [];
  let cursor = segStart;

  for (let i = 0; i < rawWords.length; i++) {
    const proportion = rawWords[i].length / totalChars;
    const wordEnd = i === rawWords.length - 1 ? segEnd : cursor + duration * proportion;
    words.push({ text: rawWords[i], start: cursor, end: wordEnd });
    cursor = wordEnd;
  }
  return words;
}

export async function transcribeAudio(
  audioPath: string,
  onProgress: (progress: number) => void
): Promise<TranscribeResult> {
  const ctx = await getWhisperContext();

  const { promise } = ctx.transcribe(audioPath, {
    language: 'fr',
    tokenTimestamps: true,
    onProgress: (p: number) => onProgress(Math.round(p)),
  });

  const result = await promise;

  const subtitles: Subtitle[] = [];
  if (result.segments) {
    for (const seg of result.segments) {
      const text = seg.text?.trim();
      if (!text || !/\w/.test(text)) continue;
      const segStart = seg.t0 / 100;
      const segEnd = seg.t1 / 100;
      subtitles.push(...splitSegmentIntoWords(text, segStart, segEnd));
    }
  }

  await releaseWhisperContext();

  return {
    subtitles,
    language: result.result?.language || 'fr',
  };
}
