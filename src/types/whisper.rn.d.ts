declare module 'whisper.rn' {
  export interface TranscribeOptions {
    language?: string;
    maxLen?: number;
    tokenTimestamps?: boolean;
    onProgress?: (progress: number) => void;
    onNewSegments?: (result: any) => void;
    beamSize?: number;
    bestOf?: number;
    maxContext?: number;
    offset?: number;
    duration?: number;
    wordThold?: number;
    translate?: boolean;
    noContext?: boolean;
    singleSegment?: boolean;
    noTimestamps?: boolean;
    audioCtx?: number;
    speedUp?: boolean;
    temperature?: number;
    temperatureInc?: number;
    prompt?: string;
  }

  export interface TranscribeSegment {
    text: string;
    t0: number;
    t1: number;
    words?: Array<{
      word: string;
      t0: number;
      t1: number;
    }>;
  }

  export interface TranscribeResult {
    result?: {
      language?: string;
    };
    segments: TranscribeSegment[];
  }

  export class WhisperContext {
    transcribe(
      filePath: string,
      options?: TranscribeOptions
    ): {
      stop: () => Promise<void>;
      promise: Promise<TranscribeResult>;
    };
    release(): Promise<void>;
  }

  export interface ContextOptions {
    filePath: string | number;
    isBundleAsset?: boolean;
    useGpu?: boolean;
    useCoreMLIos?: boolean;
    useFlashAttn?: boolean;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function releaseAllWhisper(): Promise<void>;
}
