/** Format seconds to display time m:ss.cc */
export function formatDisplayTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Parse display time m:ss.cc back to seconds */
export function parseDisplayTime(time: string): number | null {
  // Support formats: m:ss.cc, mm:ss.cc, h:mm:ss.cc
  const parts = time.split(':');
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10);
    const [sStr, csStr] = parts[1].split('.');
    const s = parseInt(sStr, 10);
    const cs = csStr ? parseInt(csStr.padEnd(2, '0').slice(0, 2), 10) : 0;
    if (isNaN(m) || isNaN(s) || isNaN(cs)) return null;
    return m * 60 + s + cs / 100;
  }
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const [sStr, csStr] = parts[2].split('.');
    const s = parseInt(sStr, 10);
    const cs = csStr ? parseInt(csStr.padEnd(2, '0').slice(0, 2), 10) : 0;
    if (isNaN(h) || isNaN(m) || isNaN(s) || isNaN(cs)) return null;
    return h * 3600 + m * 60 + s + cs / 100;
  }
  return null;
}

/** Format seconds to ASS time format h:mm:ss.cc */
export function formatAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}
