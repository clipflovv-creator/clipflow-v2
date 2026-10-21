import { useState, useEffect, useCallback, useRef } from 'react';
import { extensionBridge } from '../../services/extensionBridge';

export interface TwitchQualityOption {
  id: string;
  label: string;
  height: number;
  width?: number;
  bandwidth: number;
  fps?: number;
  url: string;
  proxiedUrl?: string;
}

export interface TwitchStreamInfo {
  twitchHlsUrl: string;
  sourceType: 'dvr' | 'live' | 'vod' | 'clip' | '';
  vodId?: string;
  channel?: string;
  masterPlaylistUrl?: string;
  qualities: TwitchQualityOption[];
  isLoadingStream: boolean;
  streamError: string;
  refreshStream: () => void;
  forceRefreshStream: () => void;
  // Kept for backwards-compatibility with existing editor callers
  isTwitchLiveChannel: boolean;
  twitchLiveSegmentUrl: string;
  refreshLiveSegment: () => void;
}

export function useTwitchPreview(
  isTwitch: boolean,
  activeUrl: string,
  metadata: any,
  _isPro: boolean = false,
  quality?: string
): TwitchStreamInfo {
  const [twitchHlsUrl, setTwitchHlsUrl] = useState<string>('');
  const [sourceType, setSourceType] = useState<'dvr' | 'live' | 'vod' | 'clip' | ''>('');
  const [vodId, setVodId] = useState<string | undefined>(undefined);
  const [channel, setChannel] = useState<string | undefined>(undefined);
  const [masterPlaylistUrl, setMasterPlaylistUrl] = useState<string | undefined>(undefined);
  const [qualities, setQualities] = useState<TwitchQualityOption[]>([]);
  const [isLoadingStream, setIsLoadingStream] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string>('');

  const abortControllerRef = useRef<AbortController | null>(null);

  // Check if exact match for live channel (e.g. twitch.tv/channel_name)
  const isTwitchLiveChannel = Boolean(
    isTwitch &&
    /twitch\.tv\/([a-zA-Z0-9_]+)\/?$/i.test(activeUrl) &&
    !activeUrl.includes('/videos') &&
    !activeUrl.includes('/clip')
  );

  const fetchTwitchStream = useCallback(async (_forceRefresh = false) => {
    if (!isTwitch || !activeUrl) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const targetUrl = metadata?.webpage_url || activeUrl;
    setIsLoadingStream(true);
    setStreamError('');

    try {
      // Resolved by the ClipFlow extension with the user's own Twitch login and IP.
      console.log('[Twitch preview] resolving', targetUrl, 'quality', quality);
      const { info, variants } = await extensionBridge.getTwitchStreams(targetUrl);
      // Results are shared per link (bridge cache), so a newer request for the same link gets the same answer;
      // only drop this one if the user switched to a different link meanwhile.
      if (abortController.signal.aborted && targetUrl !== (metadata?.webpage_url || activeUrl)) return;
      if (!variants.length) throw new Error('No playable Twitch streams found');

      const wantedHeight = parseInt(String(quality || ''), 10);
      const chosen = (wantedHeight && variants.find((v) => v.height === wantedHeight)) || variants[0];
      console.log('[Twitch preview] streams from extension:', info.kind, variants.map((v) => v.label), '→', chosen.label);

      setTwitchHlsUrl(chosen.url);
      setSourceType(info.kind === 'live' ? 'live' : info.kind === 'vod' ? 'vod' : 'clip');
      setVodId(info.kind === 'vod' ? info.id : undefined);
      setChannel(info.kind === 'live' ? info.id : info.author);
      setMasterPlaylistUrl(undefined);
      setQualities(variants.filter((v) => v.height > 0).map((v) => ({
        id: v.id, label: v.label, height: v.height, bandwidth: 0, url: v.url,
      })));
      setIsLoadingStream(false);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('%c[Twitch HLS Preview ❌ ERROR FETCHING STREAM INFO]', 'color: #ef4444; font-weight: bold;', err);
      setStreamError(err.message || 'Failed to resolve Twitch stream');
      setIsLoadingStream(false);
    }
  }, [isTwitch, activeUrl, metadata?.webpage_url, isTwitchLiveChannel, quality]);

  useEffect(() => {
    if (!isTwitch) {
      setTwitchHlsUrl('');
      setSourceType('');
      setVodId(undefined);
      setChannel(undefined);
      setMasterPlaylistUrl(undefined);
      setQualities([]);
      setIsLoadingStream(false);
      setStreamError('');
      return;
    }

    fetchTwitchStream();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [isTwitch, activeUrl, fetchTwitchStream]);

  return {
    twitchHlsUrl,
    sourceType,
    vodId,
    channel,
    masterPlaylistUrl,
    qualities,
    isLoadingStream,
    streamError,
    refreshStream: () => fetchTwitchStream(false),
    forceRefreshStream: () => fetchTwitchStream(true),
    isTwitchLiveChannel,
    twitchLiveSegmentUrl: twitchHlsUrl,
    refreshLiveSegment: () => fetchTwitchStream(false),
  };
}
