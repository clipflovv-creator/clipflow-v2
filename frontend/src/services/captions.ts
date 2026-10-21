// Caption export: cues come from the ClipFlow extension (YouTube timedtext, fetched from the user's IP)
// and are formatted here — no server involved.

export interface CaptionCue { start: number; end: number; text: string }
export type CaptionFormat = 'srt' | 'vtt' | 'txt';

/** Keeps cues overlapping [from, to] and (optionally) shifts them so the clip starts at 0. */
export function trimCues(cues: CaptionCue[], from = 0, to = Infinity, relative = true): CaptionCue[] {
  return cues
    .filter((c) => c.end > from && c.start < to)
    .map((c) => {
      const start = Math.max(c.start, from);
      const end = Math.min(c.end, to);
      return relative ? { ...c, start: start - from, end: end - from } : { ...c, start, end };
    });
}

function stamp(sec: number, sep: ',' | '.'): string {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}${sep}${pad(ms % 1000, 3)}`;
}

export function formatCaptions(cues: CaptionCue[], format: CaptionFormat): string {
  if (format === 'txt') return cues.map((c) => c.text).join('\n') + '\n';
  if (format === 'vtt') {
    return 'WEBVTT\n\n' + cues.map((c) => `${stamp(c.start, '.')} --> ${stamp(c.end, '.')}\n${c.text}\n`).join('\n');
  }
  return cues.map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n');
}
