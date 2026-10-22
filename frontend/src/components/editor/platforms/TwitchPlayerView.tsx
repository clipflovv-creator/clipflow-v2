import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import type { TwitchPlayerProps } from './types';
import { extensionBridge } from '../../../services/extensionBridge';
import { loopPreference } from '../../../utils/loopPreference';
import { lastFrameTime } from '../../../utils/timecode';

/**
 * Live playlists (when a channel has no DVR recording) carry Twitch's stitched ads: content segments are
 * titled "live", ads are not. Drop the ad segments so the preview shows the stream. If a playlist is all
 * ads (pre-roll), keep it unchanged — hls.js would stall on an empty playlist.
 */
function stripTwitchAds(m3u8: string): string {
  if (!m3u8.includes('#EXTINF') || !m3u8.includes(',live')) return m3u8;
  const out: string[] = [];
  const lines = m3u8.split(/\r?\n/);
  let removed = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('#EXTINF') && !/,live/.test(line)) { i++; removed++; continue; }   // skip ad + its URI line
    if (line.startsWith('#EXT-X-DATERANGE') && line.includes('stitched-ad')) continue;
    out.push(line);
  }
  if (removed) console.log(`[Twitch preview] removed ${removed} ad segments`);
  return out.join(String.fromCharCode(10));
}

export function TwitchPlayerView({
  videoElementRef,
  twitchHlsUrl,
  isPlaying,
  volume,
  isMuted,
  currentTime,
  effectiveDuration,
  trimRange,
  isLiveStream,
  setIsPlaying,
  setCurrentTime,
  setIsVideoBuffering,
  handleMediaDurationUpdate,
  setVideoDimensions,
  seekToPosition,
  setTrimRange,
  isSeekingRef,
  pendingSeekTimeRef,
}: TwitchPlayerProps) {
  const hlsRef = useRef<Hls | null>(null);
  const isPlayingRef = useRef<boolean>(isPlaying);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const video = videoElementRef.current;
    if (!video || !twitchHlsUrl) return;

    if (Hls.isSupported()) {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }

      // Every playlist / segment request goes through the ClipFlow extension (user's own IP, no CORS,
      // no server proxy). Results are handed back to hls.js in its loader-callback format.
      const DefaultLoader = Hls.DefaultConfig.loader;
      class ExtensionHlsLoader extends DefaultLoader {
        private ctrl: AbortController | null = null;

        override load(context: any, _config: any, callbacks: any) {
          const stats = (this as any).stats;
          const ctrl = new AbortController();
          this.ctrl = ctrl;
          stats.loading.start = performance.now();
          const range = typeof context.rangeEnd === 'number' && context.rangeEnd > 0
            ? `bytes=${context.rangeStart ?? 0}-${context.rangeEnd - 1}` : undefined;

          extensionBridge.fetchMedia(context.url, { range, signal: ctrl.signal })
            .then(async (res) => {
              if (ctrl.signal.aborted) return;
              if (!res.ok) {
                console.warn('[Twitch preview] HLS request failed', res.status, context.url.split('?')[0]);
                callbacks.onError({ code: res.status, text: `HTTP ${res.status}` }, context, null, stats);
                return;
              }
              let data: string | ArrayBuffer = context.responseType === 'arraybuffer' ? await res.arrayBuffer() : await res.text();
              if (typeof data === 'string') data = stripTwitchAds(data);
              const size = typeof data === 'string' ? data.length : data.byteLength;
              stats.loading.first = stats.loading.end = performance.now();
              stats.loaded = stats.total = size;
              callbacks.onSuccess({ url: context.url, data, code: res.status }, stats, context, null);
            })
            .catch((err: any) => {
              if (ctrl.signal.aborted) return;
              console.warn('[Twitch preview] HLS request error', err?.message, context.url.split('?')[0]);
              callbacks.onError({ code: 0, text: err?.message || 'Extension fetch failed' }, context, null, stats);
            });
        }

        override abort() {
          this.ctrl?.abort();
          (this as any).stats.aborted = true;
        }

        override destroy() {
          this.ctrl?.abort();
        }
      }

      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: Infinity,
        maxBufferLength: 120,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        startPosition: 0,
        liveSyncDurationCount: 0,
        liveMaxLatencyDurationCount: Infinity,
        liveDurationInfinity: false,
        loader: ExtensionHlsLoader as any,
      });

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsVideoBuffering(false);
        if (!currentTime || currentTime === 0) {
          video.currentTime = 0;
          setCurrentTime(0);
        } else if (currentTime > 0) {
          video.currentTime = currentTime;
        }
        if (isPlayingRef.current) {
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (_event, data) => {
        if (data.details.totalduration && data.details.totalduration > 0) {
          handleMediaDurationUpdate(data.details.totalduration);
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hls.loadSource(twitchHlsUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = twitchHlsUrl;
    }
  }, [twitchHlsUrl]);

  return (
    <>
      <video
        ref={videoElementRef}
        src={Hls.isSupported() ? undefined : twitchHlsUrl}
        preload="auto"
        playsInline
        muted={isMuted}
        onLoadStart={() => setIsVideoBuffering(true)}
        onWaiting={() => setIsVideoBuffering(true)}
        onSeeking={() => {
          (isSeekingRef as any).current = true;
          setIsVideoBuffering(true);
        }}
        onSeeked={(e) => {
          const v = e.currentTarget;
          setIsVideoBuffering(false);
          setCurrentTime(v.currentTime);
          (pendingSeekTimeRef as any).current = null;
          (isSeekingRef as any).current = false;
        }}
        onCanPlay={() => setIsVideoBuffering(false)}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.volume = volume;
          v.muted = isMuted;
          if (v.videoWidth > 0 && v.videoHeight > 0) {
            setVideoDimensions({ width: v.videoWidth, height: v.videoHeight });
          }
          setIsVideoBuffering(false);
          if (v.duration && v.duration > 0 && Number.isFinite(v.duration)) {
            handleMediaDurationUpdate(v.duration);
          }
        }}
        onDurationChange={(e) => {
          const v = e.currentTarget;
          if (v.duration && v.duration > 0 && Number.isFinite(v.duration)) {
            handleMediaDurationUpdate(v.duration);
          }
        }}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (v.duration && v.duration > 0 && Number.isFinite(v.duration) && v.duration > effectiveDuration) {
            handleMediaDurationUpdate(v.duration);
          }
          if (v.currentTime > effectiveDuration) {
            handleMediaDurationUpdate(v.currentTime);
          }
          if (isSeekingRef.current) return;
          setCurrentTime(v.currentTime);
          const clipStart = trimRange[0];
          const clipEnd = trimRange[1] > clipStart ? trimRange[1] : (effectiveDuration || clipStart + 60);
          if (v.currentTime >= clipEnd) {
            if (!loopPreference.get()) {   // loop off: stop on the clip's last frame; the next play starts from the clip start
              if (!v.paused) v.pause();
              v.currentTime = lastFrameTime(clipStart, clipEnd);
              setCurrentTime(v.currentTime);
            } else {
              v.currentTime = clipStart;
              setCurrentTime(clipStart);
            }
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setIsVideoBuffering(false);
        }}
        onPause={() => {
          setIsPlaying(false);
          setIsVideoBuffering(false);
        }}
        className="w-full h-full object-contain pointer-events-none"
      />

      {isLiveStream && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            const targetTime = effectiveDuration > 10 ? effectiveDuration - 5 : Math.max(0, effectiveDuration);
            seekToPosition(targetTime);
            setTrimRange(prev => [prev[0], Math.max(prev[1], effectiveDuration)]);
            if (videoElementRef.current) {
              videoElementRef.current.currentTime = targetTime;
              if (videoElementRef.current.paused) {
                videoElementRef.current.play().catch(() => {});
                setIsPlaying(true);
              }
            }
          }}
          className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-600/90 hover:bg-red-500 active:scale-95 transition-all text-white text-[11px] font-extrabold uppercase tracking-wider shadow-lg shadow-red-600/30 border border-red-500/50 select-none cursor-pointer"
          title="Click to jump preview to the latest live broadcast"
        >
          <span className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>LIVE BROADCAST</span>
        </button>
      )}
    </>
  );
}
