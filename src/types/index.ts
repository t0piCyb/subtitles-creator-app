export interface Subtitle {
  text: string;
  start: number;
  end: number;
}

export type AppScreen = 'Home' | 'Transcribing' | 'Editor' | 'Export';

export interface TranscriptionProgress {
  progress: number;
  status: string;
}

export interface ExportProgress {
  progress: number;
  status: string;
}
