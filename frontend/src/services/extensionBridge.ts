/**
 * Bridge to the ClipFlow browser extension.
 *
 * The extension does all video work on the user's device (resolve, download, mux).
 * This page only sends requests over window.postMessage (relayed by the extension's
 * content script) and logs each download to the backend for history/analytics.
 * Protocol mirrors extension/src/protocol.ts.
 */
import { BACKEND_URL } from './api';

const PAGE_SOURCE = 'clipflow-page';
const EXT_SOURCE = 'clipflow-ext';

export type Platform = 'youtube' | 'instagram' | 'twitter' | 'twitch';

export interface FormatOption {
  id: string;
  label: string;
  height?: number;
  hasVideo: boolean;
  hasAudio: boolean;
  ext: 'mp4' | 'm4a' | 'webm' | 'ts';
  sizeBytes?: number;
}

export interface MediaInfo {
  platform: Platform;
  kind: 'video' | 'clip' | 'vod' | 'live' | 'post' | 'reel';
  id: string;
  url: string;
  title: string;
  author?: string;
  durationSec?: number;
  thumbnail?: string;
  isLive?: boolean;
  formats: FormatOption[];
}

export interface DownloadOptions {
  formatId?: string;
  startSec?: number;
  endSec?: number;
  maxLiveSec?: number;
  filename?: string;
  maxHeight?: number;     // best format at or below this height
  videoFilter?: string;   // ffmpeg -vf chain (crop / aspect ratio)
  output?: 'mp4' | 'mp3' | 'm4a' | 'wav' | 'jpg' | 'png';   // jpg/png = one frame at startSec
}

export interface ExtensionStatus {
  version: string;
  build: 'store' | 'full';
  platforms: Platform[];
  relayUrl: string;
}

export type DownloadStage ='fetching' | 'processing' | 'recording' | 'saving';

export type DownloadEvent =
  | { event: 'started'; jobId: string; info: MediaInfo; formatLabel: string; usesFfmpeg: boolean }
  | { event: 'progress'; jobId: string; stage: DownloadStage; percent?: number; bytes?: number; seconds?: number }
  | { event: 'log'; jobId?: string; message: string }
  | { event: 'done'; jobId: string; filename: string; sizeBytes: number; durationSec?: number }
  | { event: 'error'; jobId?: string; message: string };

let status: ExtensionStatus | null = null;

window.addEventListener('message', (e) => {
  if (e.source === window && e.data?.source === EXT_SOURCE && e.data.event === 'pong') {
    status = { version: e.data.version, build: e.data.build, platforms: e.data.platforms, relayUrl: e.data.relayUrl };
  }
});

/** Sends one request and calls onEvent for every reply until it returns true (finished). */
function send(request: object, onEvent: (data: any) => boolean): () => void {
  const id = crypto.randomUUID();
  const listener = (e: MessageEvent) => {
    if (e.source !== window || e.data?.source !== EXT_SOURCE || e.data.id !== id) return;
    if (onEvent(e.data)) window.removeEventListener('message', listener);
  };
  window.addEventListener('message', listener);
  window.postMessage({ source: PAGE_SOURCE, id, request }, window.location.origin);
  return () => window.removeEventListener('message', listener);
}

function call<T>(request: object, done: (data: any) => T | undefined, timeoutMs = 60_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const off = send(request, (data) => {
      if (data.event === 'error') { clearTimeout(timer); reject(new Error(data.message)); return true; }
      const v = done(data);
      if (v === undefined) return false;
      clearTimeout(timer);
      resolve(v);
      return true;
    });
    const timer = setTimeout(() => { off(); reject(new Error('Extension did not respond')); }, timeoutMs);
  });
}

/** Anonymous per-browser id so downloads by logged-out users can still be grouped. */
function anonId(): string {
  try {
    let id = localStorage.getItem('clipflow_anon_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('clipflow_anon_id', id); }
    return id;
  } catch {
    return 'unknown';
  }
}

export function platformOf(url: string): Platform | null {
  try {
    const h = new URL(url).hostname.replace(/^(www|m)\./, '');
    if (h === 'youtu.be' || h.endsWith('youtube.com')) return 'youtube';
    if (h.endsWith('instagram.com')) return 'instagram';
    if (h === 'x.com' || h.endsWith('twitter.com')) return 'twitter';
    if (h.endsWith('twitch.tv')) return 'twitch';
  } catch {}
  return null;
}

// ── Relay iframe: fetches media bytes from the user's own IP (see extension/src/relay.ts) ──

// Stream URLs the extension resolved. They're locked to the user's IP, so they must never go
// through the server/Cloudflare relay; their bytes are fetched via the relay iframe instead.
const extensionUrls = new Set<string>();

let relayFrame: Promise<HTMLIFrameElement> | null = null;
let relayOrigin = '';
const relayWaiters = new Map<string, (d: any) => void>();

window.addEventListener('message', (e) => {
  if (e.origin !== relayOrigin || e.data?.source !== 'clipflow-relay' || !e.data.id) return;
  relayWaiters.get(e.data.id)?.(e.data);
});

function ensureRelay(): Promise<HTMLIFrameElement> {
  if (!status?.relayUrl) return Promise.reject(new Error('ClipFlow extension not installed'));
  const relayUrl = status.relayUrl;
  relayOrigin = new URL(relayUrl).origin;
  relayFrame ??= new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.src = relayUrl;
    frame.style.display = 'none';
    frame.setAttribute('aria-hidden', 'true');
    const onReady = (e: MessageEvent) => {
      if (e.origin !== relayOrigin || !e.data?.ready) return;
      window.removeEventListener('message', onReady);
      clearTimeout(timer);
      resolve(frame);
    };
    const timer = setTimeout(() => {
      window.removeEventListener('message', onReady);
      relayFrame = null;
      frame.remove();
      reject(new Error('Extension relay did not load'));
    }, 10_000);
    window.addEventListener('message', onReady);
    document.body.appendChild(frame);
  });
  return relayFrame;
}

/** fetch() for a media URL, performed by the extension from the user's IP. Returns a normal Response. */
async function relayFetch(
  url: string,
  init: { range?: string; signal?: AbortSignal; onProgress?: (received: number, total: number) => void } = {}
): Promise<Response> {
  const frame = await ensureRelay();
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    const cleanup = () => { relayWaiters.delete(id); init.signal?.removeEventListener('abort', onAbort); };
    const onAbort = () => {
      frame.contentWindow?.postMessage({ type: 'abort', id }, relayOrigin);
      cleanup();
      reject(new DOMException('Aborted', 'AbortError'));
    };
    init.signal?.addEventListener('abort', onAbort);
    relayWaiters.set(id, (d) => {
      if (d.progress !== undefined) { init.onProgress?.(d.progress, d.total); return; }
      cleanup();
      if (d.error) { reject(new Error(`Extension fetch failed: ${d.error}`)); return; }
      const headers = Object.fromEntries(Object.entries(d.headers as Record<string, string>).filter(([, v]) => v));
      resolve(new Response(d.status === 204 ? null : d.body, { status: d.status, headers }));
    });
    frame.contentWindow!.postMessage({ type: 'fetch', id, url, range: init.range }, relayOrigin);
  });
}

/** Converts the extension's stream list to the yt-dlp-style metadata the editor engine already understands. */
function toEditorMetadata(info: MediaInfo & { rawStreams: any[] }) {
  const formats = info.rawStreams.map((st, i) => {
    const [type, params = ''] = String(st.mime).split(';');
    const codecs = (params.match(/codecs="([^"]+)"/)?.[1] || '').split(',').map((c) => c.trim()).filter(Boolean);
    const sub = type.split('/')[1];
    const hls = type.includes('mpegURL');
    const ext = hls ? 'mp4' : type.startsWith('audio/') && sub === 'mp4' ? 'm4a' : sub;
    return {
      format_id: String(st.itag ?? i),
      url: st.url,
      ext,
      protocol: hls ? 'm3u8_native' : 'https',
      vcodec: st.hasVideo ? codecs[0] || 'avc1' : 'none',
      acodec: st.hasAudio ? (st.hasVideo ? codecs[1] || 'mp4a.40.2' : codecs[0] || 'mp4a.40.2') : 'none',
      width: st.width,
      height: st.height,
      fps: st.fps,
      filesize: st.size,
      tbr: st.bitrate ? st.bitrate / 1000 : undefined,
      abr: st.hasAudio && !st.hasVideo && st.bitrate ? st.bitrate / 1000 : undefined,
      language: st.language,
      language_preference: st.isDefaultAudio ? 10 : 0,
      format_note: st.height ? `${st.height}p` : 'audio',
    };
  });
  return {
    id: info.id,
    title: info.title,
    uploader: info.author,
    duration: info.durationSec || 0,
    thumbnail: info.thumbnail,
    webpage_url: info.url,
    url: info.url,
    extractor: info.platform,
    formats,
    _source: 'extension',
  };
}

// One in-flight / recent getStreams per link: the editor asks for the same link from several places
// (metadata, preview hook re-renders) and duplicate concurrent lookups slow each other down.
const streamsCache = new Map<string, { at: number; p: Promise<MediaInfo & { rawStreams: any[] }> }>();
function getStreamsShared(url: string): Promise<MediaInfo & { rawStreams: any[] }> {
  const hit = streamsCache.get(url);
  if (hit && Date.now() - hit.at < 60_000) return hit.p;
  const p = call<MediaInfo & { rawStreams: any[] }>({ type: 'getStreams', url }, (d) => (d.event === 'streams' ? d.info : undefined));
  streamsCache.set(url, { at: Date.now(), p });
  p.catch(() => streamsCache.delete(url));
  return p;
}

async function logDownload(body: Record<string, unknown>) {
  try {
    await fetch(`${BACKEND_URL}/api/downloads/log`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anonId: anonId(), extVersion: status?.version, build: status?.build, ...body }),
    });
  } catch {
    // Logging must never break a download.
  }
}

export const extensionBridge = {
  /** Resolves to the installed extension, or null if it isn't installed. */
  async detect(timeoutMs = 800): Promise<ExtensionStatus | null> {
    if (status) return status;
    return call<ExtensionStatus>({ type: 'ping' }, (d) =>
      d.event === 'pong' ? (status = { version: d.version, build: d.build, platforms: d.platforms, relayUrl: d.relayUrl }) : undefined, timeoutMs)
      .catch(() => null);
  },

  supports(platform: Platform): boolean {
    return !!status?.platforms.includes(platform);
  },

  /**
   * Stream URLs + metadata resolved from the user's IP, in the editor's metadata shape.
   * Null when the extension isn't installed or doesn't handle this link (caller falls back to the server).
   */
  async getEditorMetadata(url: string): Promise<any | null> {
    const platform = platformOf(url);
    if (!platform) return null;
    if (!(await this.detect()) || !this.supports(platform)) return null;
    const info = await getStreamsShared(url);
    for (const st of info.rawStreams) extensionUrls.add(st.url);
    return toEditorMetadata(info);
  },

  /**
   * Twitch preview: HLS variant playlists (VOD / live) or MP4s (clips), resolved with the user's
   * own Twitch login. Playlists and segments are then fetched through fetchMedia (relay iframe).
   */
  async getTwitchStreams(url: string): Promise<{ info: MediaInfo; variants: Array<{ id: string; label: string; height: number; url: string; hls: boolean }> }> {
    if (!(await this.detect())) throw new Error('Install the ClipFlow browser extension to preview Twitch.');
    const info = await getStreamsShared(url);
    const variants = info.rawStreams.map((st, i) => ({
      id: info.formats[i]?.id ?? String(i),
      label: info.formats[i]?.label ?? (st.height ? `${st.height}p` : 'audio'),
      height: st.height ?? 0,
      url: st.url,
      hls: String(st.mime).includes('mpegURL'),
    }));
    for (const v of variants) extensionUrls.add(v.url);
    console.log('[ClipFlow bridge] twitch streams:', info.kind, variants.map((v) => v.label));
    return { info, variants };
  },

  /** True for stream URLs the extension resolved (fetch them with fetchMedia, never through a server relay). */
  ownsUrl(url: string): boolean {
    return extensionUrls.has(url);
  },

  fetchMedia: relayFetch,

  /** Caption cues for a YouTube link (preferred language, else the first manual track, else auto). */
  getCaptions(url: string, lang?: string): Promise<{ lang: string; tracks: Array<{ lang: string; name: string; auto: boolean }>; cues: Array<{ start: number; end: number; text: string }> }> {
    console.log('[ClipFlow bridge] captions →', url, lang ?? '(default)');
    return call({ type: 'getCaptions', url, lang }, (d) => (d.event === 'captions' ? d : undefined));
  },

  /** Where users get the extension (self-hosted full build, zipped by extension/build.mjs). */
  installUrl: '/extension/clipflow-extension.zip',
  /** Chrome Web Store listing (store build, no YouTube). Set VITE_EXTENSION_STORE_URL once published. */
  storeUrl: (import.meta.env.VITE_EXTENSION_STORE_URL as string | undefined) || '',

  /** Records a download for analytics (logged-in or anonymous). Never throws. */
  log(body: {
    jobId?: string; platform: Platform; kind?: string; url: string; title?: string; quality?: string;
    sizeBytes?: number; durationSec?: number; status: 'started' | 'completed' | 'failed' | 'cancelled'; error?: string;
  }) {
    return logDownload({ ...body, jobId: body.jobId || crypto.randomUUID() });
  },

  getInfo(url: string): Promise<MediaInfo> {
    return call<MediaInfo>({ type: 'getInfo', url }, (d) => (d.event === 'info' ? d.info : undefined));
  },

  /**
   * Starts a download. onEvent gets started/progress/done/error.
   * Each download is logged to the backend as started → completed/failed/cancelled.
   */
  download(url: string, options: DownloadOptions, onEvent: (e: DownloadEvent) => void): void {
    let started: Extract<DownloadEvent, { event: 'started' }> | null = null;
    const base = () => started && {
      jobId: started.jobId, platform: started.info.platform, kind: started.info.kind, url: started.info.url,
      title: started.info.title, quality: started.formatLabel, extVersion: status?.version, build: status?.build,
    };
    console.log('[ClipFlow bridge] download →', url, options);
    send({ type: 'download', url, options }, (d: DownloadEvent) => {
      // Every step the extension / helper takes is printed here, so the website console shows the full flow.
      if (d.event === 'log') { console.log('[ClipFlow ext]', d.message); return false; }
      if (d.event === 'progress') console.debug('[ClipFlow bridge] progress', d.stage, d.percent ?? '', d.seconds ?? '');
      else console.log('[ClipFlow bridge] ←', d.event, d);
      onEvent(d);
      if (d.event === 'started') {
        started = d;
        void logDownload({ ...base(), status: 'started' });
      } else if (d.event === 'done') {
        void logDownload({ ...base(), status: 'completed', sizeBytes: d.sizeBytes, durationSec: d.durationSec });
      } else if (d.event === 'error' && started) {
        void logDownload({ ...base(), status: d.message === 'Cancelled' ? 'cancelled' : 'failed', error: d.message.slice(0, 1000) });
      }
      return d.event === 'done' || d.event === 'error';
    });
  },

  /** Abort a download; nothing is saved. */
  cancel(jobId: string): Promise<void> {
    return call<boolean>({ type: 'cancel', jobId }, (d) => (d.event === 'ack' ? true : undefined)).then(() => {});
  },

  /** Twitch live: stop recording and save what was captured. */
  stop(jobId: string): Promise<void> {
    return call<boolean>({ type: 'stop', jobId }, (d) => (d.event === 'ack' ? true : undefined)).then(() => {});
  },
};
