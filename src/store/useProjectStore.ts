import { create } from 'zustand';
import { Subtitle } from '../types';
import { SUBTITLE_DEFAULTS } from '../constants/subtitleDefaults';

interface ProjectState {
  videoPath: string | null;
  subtitles: Subtitle[];
  originalSubtitles: Subtitle[];
  fontSize: number;
  detectedLanguage: string | null;

  setVideoPath: (path: string | null) => void;
  setSubtitles: (subs: Subtitle[]) => void;
  setOriginalSubtitles: (subs: Subtitle[]) => void;
  updateSubtitle: (index: number, field: keyof Subtitle, value: string | number) => void;
  deleteSubtitle: (index: number) => void;
  addSubtitle: (atTime: number) => void;
  resetSubtitles: () => void;
  setFontSize: (size: number) => void;
  setDetectedLanguage: (lang: string | null) => void;
  reset: () => void;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  videoPath: null,
  subtitles: [],
  originalSubtitles: [],
  fontSize: SUBTITLE_DEFAULTS.fontSize,
  detectedLanguage: null,

  setVideoPath: (path) => set({ videoPath: path }),

  setSubtitles: (subs) => set({ subtitles: subs }),

  setOriginalSubtitles: (subs) => set({ originalSubtitles: subs }),

  updateSubtitle: (index, field, value) =>
    set((state) => {
      const updated = [...state.subtitles];
      if (updated[index]) {
        updated[index] = { ...updated[index], [field]: value };
      }
      return { subtitles: updated };
    }),

  deleteSubtitle: (index) =>
    set((state) => ({
      subtitles: state.subtitles.filter((_, i) => i !== index),
    })),

  addSubtitle: (atTime) =>
    set((state) => {
      const newSub: Subtitle = { text: '...', start: atTime, end: atTime + 0.5 };
      const insertIndex = state.subtitles.findIndex((s) => s.start > atTime);
      const updated = [...state.subtitles];
      if (insertIndex === -1) {
        updated.push(newSub);
      } else {
        updated.splice(insertIndex, 0, newSub);
      }
      return { subtitles: updated };
    }),

  resetSubtitles: () =>
    set((state) => ({
      subtitles: state.originalSubtitles.map((s) => ({ ...s })),
    })),

  setFontSize: (size) => set({ fontSize: size }),

  setDetectedLanguage: (lang) => set({ detectedLanguage: lang }),

  reset: () =>
    set({
      videoPath: null,
      subtitles: [],
      originalSubtitles: [],
      fontSize: SUBTITLE_DEFAULTS.fontSize,
      detectedLanguage: null,
    }),
}));
