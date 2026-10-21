/**
 * Computes a preference score for an audio format.
 * Prioritizes original/default language audio, penalizes dubs,
 * prefers standard AAC/M4A, and uses bitrate strictly as a tiebreaker.
 */
export function getAudioTrackScore(f: any, defaultLang?: string): number {
  if (!f) return -9999;
  let score = 0;
  const note = (f.format_note || '').toLowerCase();
  const lang = (f.language || '').toLowerCase();
  const pref = typeof f.language_preference === 'number' ? f.language_preference : 0;

  // 1. Original / Default flags from yt-dlp
  if (note.includes('original')) score += 1000;
  if (note.includes('default') || f.is_default) score += 500;
  if (pref >= 10) score += 800;

  // 2. Penalty for dubbed tracks
  if (note.includes('dubbed') || note.includes('dub')) score -= 1500;
  if (pref < 0) score -= 500;

  // 3. Language match if defaultLang is available
  if (defaultLang && lang) {
    const cleanDef = defaultLang.toLowerCase();
    if (lang === cleanDef || lang.split('-')[0] === cleanDef.split('-')[0]) {
      score += 400;
    }
  }

  // 4. Prefer standard AAC/M4A for zero-glitch browser & player compatibility
  const isAacM4a = f.ext === 'm4a' || (f.acodec && (f.acodec.startsWith('mp4a') || f.acodec.includes('aac')));
  if (isAacM4a) score += 100;

  // 5. Bitrate tiebreaker (scaled so minor kbps differences never override original audio)
  score += Math.min(50, (f.abr || f.tbr || 0) / 10);

  return score;
}
