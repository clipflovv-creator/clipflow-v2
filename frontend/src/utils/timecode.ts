// Shared timecode formatting / parsing for every time box in the editor (trim start / end, playhead).
// Values are rounded to whole milliseconds first: 7 stored as 6.99999… must show "00:07", not "00:06".

/** Seconds rounded to the nearest millisecond (avoids float drift like 0.1 + 0.2). */
export function roundMs(seconds: number): number {
  return Math.round(seconds * 1000) / 1000;
}

/**
 * "mm:ss" or "h:mm:ss", plus ".f" / ".ff" / ".fff" when includeDecimals is set (trailing zeros dropped,
 * at least one digit kept so a whole second still reads "00:07.0").
 */
export function formatTime(seconds: number, includeDecimals: boolean = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const totalMs = Math.round(seconds * 1000);
  const h = Math.floor(totalMs / 3_600_000);
  const m = Math.floor((totalMs % 3_600_000) / 60_000);
  const s = Math.floor((totalMs % 60_000) / 1000);
  const ms = totalMs % 1000;
  const main = h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  if (!includeDecimals) return main;
  const frac = String(ms).padStart(3, '0').replace(/0+$/, '') || '0';
  return `${main}.${frac}`;
}

/** True when the value has a fractional part worth showing (ignores float noise below 1 ms). */
export function hasFraction(seconds: number): boolean {
  return Math.round(seconds * 1000) % 1000 !== 0;
}

/**
 * Parses what a user types into a time box. Accepts "7", "07", "7.25", "1:07", "01:07.5", "1:02:07.250",
 * a comma as the decimal mark, and spaces. Minutes / seconds must be < 60 when a larger unit is given.
 * Returns seconds (millisecond precision) or null if the text isn't a valid time.
 */
export function parseTime(text: string): number | null {
  const clean = String(text ?? '').trim().replace(/\s+/g, '').replace(',', '.');
  if (!clean) return null;
  if (!/^\d*(\.\d*)?$|^\d+:\d*(\.\d*)?$|^\d+:\d+:\d*(\.\d*)?$/.test(clean)) return null;
  const parts = clean.split(':');
  const num = (p: string) => (p === '' || p === '.' ? 0 : Number(p));
  const nums = parts.map(num);
  if (nums.some((n) => !Number.isFinite(n) || n < 0)) return null;
  let total: number;
  if (nums.length === 3) {
    const [h, m, s] = nums;
    if (m >= 60 || s >= 60) return null;
    total = h * 3600 + m * 60 + s;
  } else if (nums.length === 2) {
    const [m, s] = nums;
    if (s >= 60) return null;
    total = m * 60 + s;
  } else {
    total = nums[0];
  }
  return roundMs(total);
}

/**
 * Time to seek to so the preview shows the clip's last frame. The export keeps frames before the end time
 * (end is exclusive), so show the frame just before it; 1 ms is below any frame duration.
 */
export function lastFrameTime(start: number, end: number): number {
  return Math.max(start, end - 0.001);
}
