import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Single log file in backend/logs/app.log
const LOGS_DIR = path.resolve(__dirname, '../../logs');
const LOG_FILE_PATH = path.join(LOGS_DIR, 'app.log');

// Store original native console methods
const nativeConsoleLog = console.log.bind(console);
const nativeConsoleWarn = console.warn.bind(console);
const nativeConsoleError = console.error.bind(console);

// Ensure logs directory exists and clear previous logs on server startup
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
  // Clear the log file on server startup (fresh start every restart)
  fs.writeFileSync(
    LOG_FILE_PATH,
    `=== ClipFlow Backend Logs Started at ${new Date().toISOString()} ===\n\n`,
    'utf-8'
  );
} catch (initErr) {
  nativeConsoleWarn('[Logger] Unable to initialize log file at:', LOG_FILE_PATH, initErr);
}

/**
 * Appends raw, detailed text directly to backend/logs/app.log
 */
function appendToLogFile(level: string, context: string, message: string, meta?: any) {
  try {
    const timestamp = new Date().toISOString();
    let entry = `[${timestamp}] [${level.toUpperCase()}] [${context}] ${message}\n`;
    if (meta !== undefined) {
      if (meta instanceof Error) {
        entry += `  Stack: ${meta.stack || meta.message}\n`;
      } else if (typeof meta === 'object') {
        try {
          entry += `  Meta: ${JSON.stringify(meta, null, 2)}\n`;
        } catch {
          entry += `  Meta: ${String(meta)}\n`;
        }
      } else {
        entry += `  Details: ${String(meta)}\n`;
      }
    }
    fs.appendFileSync(LOG_FILE_PATH, entry, 'utf-8');
  } catch {
    // Non-blocking file append error
  }
}

/** Short form of a request URL for the console: path only, long query strings trimmed. */
export function summarizeRequestUrl(url: string): string {
  const [path, query] = url.split('?');
  if (!query) return path;
  return query.length > 60 ? `${path}?${query.slice(0, 60)}…` : `${path}?${query}`;
}

/**
 * Sanitizes any text, CLI output, or error message so the console only sees short human words.
 */
export function sanitizeForConsole(input: any): any {
  if (input === null || input === undefined) return input;
  if (typeof input !== 'string') {
    if (input instanceof Error) {
      return sanitizeForConsole(input.message);
    }
    return input;
  }

  let text = input;

  // 1. If it's a giant FFmpeg/yt-dlp command failure dump:
  if (text.includes('Command failed:') && (text.includes('ffmpeg') || text.includes('yt-dlp'))) {
    if (text.includes('403 Forbidden') || text.includes('access denied')) {
      return 'Command failed: Upstream server returned 403 Forbidden (access denied)';
    }
    if (text.includes('UND_ERR_SOCKET') || text.includes('ECONNRESET')) {
      return 'Command failed: Network socket connection was closed/reset';
    }
    if (text.includes('ETIMEDOUT') || text.includes('timed out')) {
      return 'Command failed: Network connection timed out';
    }
    // Extract first meaningful line
    const firstLine = text.split('\n')[0];
    return firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;
  }

  // 2. Strip FFmpeg build banners
  if (text.includes('ffmpeg version') && text.includes('libavutil')) {
    text = text.replace(/ffmpeg version[\s\S]*?libswresample\s+\d+[\s\S]*?\n/g, '').trim();
  }

  // 3. Replace giant GoogleVideo / Signed CDN URLs with a short tag
  text = text.replace(/https?:\/\/[^\s"'`]+(?:\?|\&)(?:expire|itag|sig|lsig|clen|sparams)=[^\s"'`]+/g, '[Direct Stream URL]');
  text = text.replace(/https?:\/\/[^\s"'`]{120,}/g, '[Long Stream URL]');

  // 4. If line is still massively long (e.g. raw serialized CLI args or base64), shorten it
  if (text.length > 250 && !text.includes('\n')) {
    text = text.slice(0, 247) + '...';
  }

  return text;
}

// Global console override to ensure third-party tools and direct console calls never dump massive URLs to terminal
console.log = (...args: any[]) => {
  try {
    const rawJoined = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    appendToLogFile('LOG', 'Console', rawJoined);
  } catch {}
  nativeConsoleLog(...args.map(sanitizeForConsole));
};

console.warn = (...args: any[]) => {
  try {
    const rawJoined = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    appendToLogFile('WARN', 'Console', rawJoined);
  } catch {}
  nativeConsoleWarn(...args.map(sanitizeForConsole));
};

console.error = (...args: any[]) => {
  try {
    const rawJoined = args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ');
    appendToLogFile('ERROR', 'Console', rawJoined);
  } catch {}
  nativeConsoleError(...args.map(sanitizeForConsole));
};

export interface ErrorLogDetails {
  context: string;
  summary: string;
  code?: string | number;
  reason?: string;
  targetUrl?: string;
  fallbackAction?: string;
  error?: unknown;
}

export const logger = {
  /**
   * Log an incoming HTTP request.
   * Summarizes big streaming URLs in console while writing full raw URLs to app.log.
   */
  http(method: string, rawUrl: string, status?: number, ms?: number, userId?: string) {
    const tail = `${status ? ` [${status}]` : ''}${ms !== undefined ? ` ${ms}ms` : ''}${userId ? ` user=${userId}` : ''}`;
    appendToLogFile('HTTP', 'Server', `${method} ${rawUrl}${tail}`);
    nativeConsoleLog(`[HTTP] ${method} ${summarizeRequestUrl(rawUrl)}${tail}`);
  },

  /**
   * Standard informative logs
   */
  info(context: string, message: string, meta?: any) {
    // Write full details to file
    appendToLogFile('INFO', context, message, meta);

    // Print readable summary to console
    const cleanMsg = sanitizeForConsole(message);
    nativeConsoleLog(`[${context}] ${cleanMsg}`);
  },

  /**
   * Warning logs
   */
  warn(context: string, message: string, meta?: any) {
    appendToLogFile('WARN', context, message, meta);
    const cleanMsg = sanitizeForConsole(message);
    nativeConsoleWarn(`[${context}] ⚠️ ${cleanMsg}`);
  },

  /**
   * Structured error logging.
   * Prints clean, human-readable words in console and saves full stack trace + details in app.log.
   */
  error(details: ErrorLogDetails | string, rawError?: any) {
    if (typeof details === 'string') {
      const summary = details;
      appendToLogFile('ERROR', 'App', summary, rawError);
      nativeConsoleError(`[Error ❌] ${sanitizeForConsole(summary)}`);
      return;
    }

    const { context, summary, code, reason, targetUrl, fallbackAction, error } = details;

    // 1. Write full error details, context, and complete stack trace to app.log
    appendToLogFile('ERROR', context, summary, {
      code,
      reason,
      targetUrl,
      fallbackAction,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : error,
    });

    // 2. Format a concise, human-readable sentence for the terminal console
    let cleanMsg = summary;
    if (reason) cleanMsg += ` - Reason: ${reason}`;
    if (code) cleanMsg += ` (Code: ${code})`;
    if (fallbackAction) cleanMsg += ` → ${fallbackAction}`;

    nativeConsoleError(`[${context} ❌] ${sanitizeForConsole(cleanMsg)}`);
  },

  /**
   * Clears the log file
   */
  clearLogs() {
    try {
      fs.writeFileSync(
        LOG_FILE_PATH,
        `=== ClipFlow Backend Logs Cleared at ${new Date().toISOString()} ===\n\n`,
        'utf-8'
      );
    } catch {}
  },

  /**
   * Returns path to current log file
   */
  getLogFilePath() {
    return LOG_FILE_PATH;
  },
};

