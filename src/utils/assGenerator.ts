import { Subtitle } from '../types';
import { formatAssTime } from './timeFormat';

/**
 * Generate ASS subtitle file content adapted to video orientation.
 * Ported from subtitles-creator/app/main.py:499-554
 */
export function generateAss(
  subtitles: Subtitle[],
  width: number = 1920,
  height: number = 1080,
  customFontSize?: number
): string {
  const isVertical = height > width;

  let playResX: number, playResY: number, fontSize: number, marginV: number, shadow: number;

  if (isVertical) {
    playResX = 1080;
    playResY = 1920;
    fontSize = customFontSize || 68;
    marginV = 450;
    shadow = 3;
  } else {
    playResX = 1920;
    playResY = 1080;
    fontSize = customFontSize || 90;
    marginV = 80;
    shadow = 4;
  }

  // ASS color format: &HAABBGGRR — Yellow = &H0000FFFF
  const header = `[Script Info]
Title: Subtitles
ScriptType: v4.00+
WrapStyle: 0
PlayResX: ${playResX}
PlayResY: ${playResY}
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,${fontSize},&H0000FFFF,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,0,${shadow},2,10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const lines = subtitles.map((sub) => {
    const start = formatAssTime(sub.start);
    const end = formatAssTime(sub.end);
    const text = sub.text.toUpperCase();
    return `Dialogue: 0,${start},${end},Default,,0,0,0,,${text}`;
  });

  return header + lines.join('\n') + '\n';
}
