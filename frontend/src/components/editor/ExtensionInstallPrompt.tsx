// Explains why ClipFlow needs its extension and offers the two ways to install it (Chrome Web Store or a
// direct .zip). Opened from the header "Extension" button, or when an action (download, captions, frame,
// preview) needs the extension. While open we poll for it; once installed, the pending action continues.
import { useEffect, useRef, useState } from 'react';
import { extensionBridge } from '../../services/extensionBridge';

interface Props {
  onClose: () => void;
  /** Called once the extension is detected (e.g. continue the download). Omit for an info-only popup. */
  onDetected?: () => void;
  reason?: 'download' | 'preview' | 'info';
}

const WHY = [
  ['No blocks, no waiting', 'YouTube, Instagram, X and Twitch block downloads from servers. The extension fetches the video over your own connection, just like watching it, so it simply works.'],
  ['Free and unlimited, for everyone', "The video never touches our servers, so there's no bandwidth bill, no queue and no daily limit for us to charge you for."],
  ['Faster', 'Only the part you clip is downloaded, and it is cut right on your computer.'],
];

const TRUST = [
  'Works only on ClipFlow and the four video sites. It cannot see other websites you visit.',
  'Videos go straight to your Downloads folder. Nothing is uploaded to us.',
  'No account and no password needed. If you are logged in to YouTube or Instagram, that login is used locally for private posts and never sent to ClipFlow.',
  'We keep only a small record of what you downloaded (link, title, time) to show your download history.',
  'Remove it any time from chrome://extensions. Nothing stays behind.',
];

export default function ExtensionInstallPrompt({ onClose, onDetected, reason = 'info' }: Props) {
  const [copied, setCopied] = useState(false);
  const [installed, setInstalled] = useState(false);
  // The editor re-renders constantly (playback time); keep the poll timer stable via refs.
  const handlers = useRef({ onClose, onDetected });
  handlers.current = { onClose, onDetected };

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const st = await extensionBridge.detect(600);
      if (!st || stopped) return;
      console.log('[ClipFlow] extension detected:', st);
      setInstalled(true);
      if (handlers.current.onDetected) {
        stopped = true;
        clearInterval(timer);
        handlers.current.onClose();
        handlers.current.onDetected();
      }
    };
    const timer = setInterval(check, 2000);
    void check();
    return () => { stopped = true; clearInterval(timer); };
  }, []);

  const copyExtensionsUrl = async () => {
    try {
      await navigator.clipboard.writeText('chrome://extensions');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const title = reason === 'download' ? 'One last step to download'
    : reason === 'preview' ? 'This preview needs the ClipFlow extension'
    : 'The ClipFlow extension';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="ext-title" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0f17] p-6 text-sm text-slate-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="ext-title" className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-xl leading-none text-slate-500 hover:text-white">×</button>
        </div>
        <p className="mb-5 text-slate-400">
          {installed
            ? 'The extension is installed and ready. You are all set.'
            : 'Editing is free without it. To download, install our free extension once. It does the downloading in your own browser.'}
        </p>

        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          {WHY.map(([h, t]) => (
            <div key={h} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-3">
              <div className="mb-1 font-semibold text-white">{h}</div>
              <div className="text-xs leading-relaxed text-slate-400">{t}</div>
            </div>
          ))}
        </div>

        {!installed && (
          <div className="mb-5 grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col rounded-xl border border-blue-500/30 bg-blue-500/[0.06] p-4">
              <div className="mb-1 font-semibold text-white">Chrome Web Store</div>
              <p className="mb-3 flex-1 text-xs text-slate-400">
                One click to install. Updates itself. Reviewed by Google. Supports Instagram, X and Twitch (Google's store rules don't allow YouTube downloads).
              </p>
              {extensionBridge.storeUrl ? (
                <a href={extensionBridge.storeUrl} target="_blank" rel="noopener noreferrer"
                  className="rounded-lg bg-blue-600 px-3 py-2 text-center font-semibold text-white hover:bg-blue-500">Add to Chrome</a>
              ) : (
                <span className="rounded-lg bg-white/5 px-3 py-2 text-center text-slate-500">Coming soon</span>
              )}
            </div>

            <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-1 font-semibold text-white">Direct download (all sites incl. YouTube)</div>
              <ol className="mb-3 flex-1 list-decimal space-y-1 pl-4 text-xs text-slate-400">
                <li>Download the .zip and unzip it.</li>
                <li>
                  Open{' '}
                  <button onClick={copyExtensionsUrl} className="rounded bg-white/10 px-1 font-mono text-white hover:bg-white/15">
                    {copied ? 'copied!' : 'chrome://extensions'}
                  </button>{' '}
                  and turn on <b className="text-white">Developer mode</b>.
                </li>
                <li>Click <b className="text-white">Load unpacked</b> and pick the unzipped folder.</li>
              </ol>
              <a href={extensionBridge.installUrl} download
                className="rounded-lg bg-white/10 px-3 py-2 text-center font-semibold text-white hover:bg-white/15">Download .zip</a>
            </div>
          </div>
        )}

        <div className="mb-5 rounded-xl border border-white/[0.06] p-4">
          <div className="mb-2 font-semibold text-white">Why you can trust it</div>
          <ul className="space-y-1.5 text-xs text-slate-400">
            {TRUST.map((t) => (
              <li key={t} className="flex gap-2"><span className="text-emerald-400">✓</span><span>{t}</span></li>
            ))}
          </ul>
        </div>

        {!installed && onDetected && (
          <p className="mb-4 flex items-center gap-2 text-xs text-slate-400">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            Waiting for the extension. Your {reason === 'preview' ? 'preview loads' : 'download continues'} automatically.
          </p>
        )}
        <button onClick={onClose} className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15">
          {installed ? 'Done' : 'Not now, keep editing'}
        </button>
      </div>
    </div>
  );
}
