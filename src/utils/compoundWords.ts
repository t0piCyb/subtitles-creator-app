import { Subtitle } from '../types';

/**
 * Merge words connected by apostrophes or hyphens.
 * Whisper often splits "qu'est-ce" into ["qu'", "est", "-", "ce"]
 * or "l'homme" into ["l'", "homme"].
 * Ported from subtitles-creator/app/main.py:216-257
 */
export function mergeCompoundWords(words: Subtitle[]): Subtitle[] {
  if (words.length === 0) return words;

  const merged: Subtitle[] = [{ ...words[0] }];

  for (let i = 1; i < words.length; i++) {
    const prev = merged[merged.length - 1];
    const text = words[i].text;

    const shouldMerge =
      prev.text.endsWith("'") ||
      prev.text.endsWith('-') ||
      text === '-' ||
      text.startsWith('-') ||
      text.startsWith("'");

    if (shouldMerge) {
      prev.text = prev.text + text;
      prev.end = words[i].end;
    } else {
      merged.push({ ...words[i] });
    }
  }

  // Second pass: clean up standalone hyphens
  for (const m of merged) {
    m.text = m.text.replace(/\s*-\s*/g, '-');
    const stripped = m.text.replace(/^-+|-+$/g, '').trim();
    m.text = stripped || m.text;
  }

  return merged.filter((m) => m.text.trim().length > 0);
}
