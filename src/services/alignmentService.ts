import { InferenceSession, Tensor } from 'onnxruntime-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { Subtitle } from '../types';

const SAMPLE_RATE = 16000;
// Wav2Vec2 outputs 1 frame per 20ms of audio
const FRAMES_PER_SEC = 50;

let session: InferenceSession | null = null;
let vocab: Record<string, number> = {};

/**
 * Load the ONNX wav2vec2 model and vocabulary.
 */
export async function initAligner(modelPath: string, vocabPath: string): Promise<void> {
  if (session) return;

  session = await InferenceSession.create(modelPath);

  const vocabJson = await FileSystem.readAsStringAsync(vocabPath);
  vocab = JSON.parse(vocabJson);
}

export async function releaseAligner(): Promise<void> {
  if (session) {
    await session.release();
    session = null;
  }
}

/**
 * Read a 16kHz mono WAV file and return raw float32 samples.
 */
async function readWavSamples(wavPath: string): Promise<Float32Array> {
  const base64 = await FileSystem.readAsStringAsync(wavPath, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // WAV header is 44 bytes, PCM 16-bit samples after that
  const dataView = new DataView(bytes.buffer);
  const numSamples = (bytes.length - 44) / 2;
  const samples = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    samples[i] = dataView.getInt16(44 + i * 2, true) / 32768.0;
  }
  return samples;
}

/**
 * Run wav2vec2 inference → get log-probabilities per frame.
 * Output shape: [1, num_frames, vocab_size]
 */
async function getEmissions(samples: Float32Array): Promise<Float32Array> {
  if (!session) throw new Error('Aligner not initialized');

  const inputTensor = new Tensor('float32', samples, [1, samples.length]);
  const results = await session.run({ input_values: inputTensor });

  // The output key is usually 'logits'
  const outputKey = Object.keys(results)[0];
  return results[outputKey].data as Float32Array;
}

/**
 * Convert text to CTC token indices using the vocab.
 */
function textToTokens(text: string): number[] {
  const lower = text.toLowerCase().replace(/\s+/g, '|');
  const tokens: number[] = [];
  for (const char of lower) {
    if (vocab[char] !== undefined) {
      tokens.push(vocab[char]);
    }
    // Skip unknown characters
  }
  return tokens;
}

interface AlignPoint {
  tokenIdx: number;
  frameIdx: number;
  score: number;
}

/**
 * CTC Forced Alignment — torchaudio algorithm ported to TypeScript.
 *
 * 1. Build trellis (DP forward pass)
 * 2. Backtrack to find optimal alignment path
 * 3. Merge into word segments
 */
function buildTrellis(
  emission: Float32Array,
  numFrames: number,
  vocabSize: number,
  tokens: number[],
  blankId: number
): Float64Array {
  const numTokens = tokens.length;
  // Trellis: numFrames x numTokens
  const trellis = new Float64Array(numFrames * numTokens).fill(-Infinity);

  // Init: trellis[0,0] = emission[0, blank]
  trellis[0] = emission[blankId];

  // First column: accumulate blank
  for (let t = 1; t < numFrames; t++) {
    trellis[t * numTokens] = trellis[(t - 1) * numTokens] + emission[t * vocabSize + blankId];
  }

  // Fill trellis
  for (let t = 1; t < numFrames; t++) {
    for (let j = 1; j < numTokens; j++) {
      const stayScore = trellis[(t - 1) * numTokens + j] + emission[t * vocabSize + blankId];
      const changeScore = trellis[(t - 1) * numTokens + (j - 1)] + emission[t * vocabSize + tokens[j]];
      trellis[t * numTokens + j] = Math.max(stayScore, changeScore);
    }
  }

  return trellis;
}

function backtrack(
  trellis: Float64Array,
  emission: Float32Array,
  numFrames: number,
  vocabSize: number,
  tokens: number[],
  blankId: number
): AlignPoint[] {
  const numTokens = tokens.length;
  let t = numFrames - 1;
  let j = numTokens - 1;

  const path: AlignPoint[] = [{
    tokenIdx: j,
    frameIdx: t,
    score: Math.exp(emission[t * vocabSize + blankId]),
  }];

  while (j > 0) {
    if (t <= 0) break;

    const pStay = emission[(t - 1) * vocabSize + blankId];
    const pChange = emission[(t - 1) * vocabSize + tokens[j]];

    const stayed = trellis[(t - 1) * numTokens + j] + pStay;
    const changed = trellis[(t - 1) * numTokens + (j - 1)] + pChange;

    t -= 1;
    if (changed > stayed) {
      j -= 1;
    }

    path.push({
      tokenIdx: j,
      frameIdx: t,
      score: Math.exp(changed > stayed ? pChange : pStay),
    });
  }

  // Fill remaining frames with blank
  while (t > 0) {
    t -= 1;
    path.push({
      tokenIdx: 0,
      frameIdx: t,
      score: Math.exp(emission[t * vocabSize + blankId]),
    });
  }

  return path.reverse();
}

interface CharSegment {
  char: string;
  startFrame: number;
  endFrame: number;
  score: number;
}

function mergeRepeats(path: AlignPoint[], transcript: string[]): CharSegment[] {
  const segments: CharSegment[] = [];
  let i = 0;
  while (i < path.length) {
    let j = i;
    while (j < path.length && path[j].tokenIdx === path[i].tokenIdx) {
      j++;
    }
    let totalScore = 0;
    for (let k = i; k < j; k++) totalScore += path[k].score;

    segments.push({
      char: transcript[path[i].tokenIdx] || '',
      startFrame: path[i].frameIdx,
      endFrame: path[j - 1].frameIdx + 1,
      score: totalScore / (j - i),
    });
    i = j;
  }
  return segments;
}

function mergeCharsIntoWords(chars: CharSegment[]): Array<{ text: string; startFrame: number; endFrame: number }> {
  const words: Array<{ text: string; startFrame: number; endFrame: number }> = [];
  let currentWord = '';
  let wordStart = 0;
  let wordEnd = 0;

  for (const seg of chars) {
    if (seg.char === '|' || seg.char === ' ') {
      // Word separator
      if (currentWord.length > 0) {
        words.push({ text: currentWord, startFrame: wordStart, endFrame: wordEnd });
        currentWord = '';
      }
    } else if (seg.char === '') {
      // Blank token — skip
      continue;
    } else {
      if (currentWord.length === 0) {
        wordStart = seg.startFrame;
      }
      currentWord += seg.char;
      wordEnd = seg.endFrame;
    }
  }

  if (currentWord.length > 0) {
    words.push({ text: currentWord, startFrame: wordStart, endFrame: wordEnd });
  }

  return words;
}

/**
 * Perform forced alignment: given audio and text from whisper,
 * return word-level timestamps precisely aligned to the audio.
 */
export async function alignWords(
  wavPath: string,
  whisperSubtitles: Subtitle[]
): Promise<Subtitle[]> {
  if (!session) throw new Error('Aligner not initialized');

  // Read audio
  const samples = await readWavSamples(wavPath);
  const numSamples = samples.length;

  // Run wav2vec2
  const emissionData = await getEmissions(samples);
  const numFrames = Math.floor(numSamples / 320); // wav2vec2: 1 frame per 320 samples (20ms)
  const vocabSize = emissionData.length / numFrames;

  // Build full transcript from whisper segments
  const fullText = whisperSubtitles.map((s) => s.text).join(' ');

  // Convert to tokens
  const blankId = vocab['<pad>'] ?? vocab['[PAD]'] ?? 0;
  const transcript = fullText.toLowerCase().replace(/\s+/g, '|').split('');
  const tokens = textToTokens(fullText);

  if (tokens.length === 0 || numFrames === 0) {
    return whisperSubtitles;
  }

  // CTC forced alignment
  const trellis = buildTrellis(emissionData, numFrames, vocabSize, tokens, blankId);
  const path = backtrack(trellis, emissionData, numFrames, vocabSize, tokens, blankId);
  const charSegments = mergeRepeats(path, transcript);
  const wordSegments = mergeCharsIntoWords(charSegments);

  // Convert frames to seconds
  const frameDuration = numSamples / (SAMPLE_RATE * numFrames);
  const result: Subtitle[] = wordSegments.map((w) => ({
    text: w.text,
    start: w.startFrame * frameDuration,
    end: w.endFrame * frameDuration,
  }));

  return result;
}
