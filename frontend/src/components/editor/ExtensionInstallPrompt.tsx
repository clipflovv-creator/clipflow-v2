// Shown when an action needs the extension (download, captions, frame, preview) or from the header button.
// The user only has to click one button. While open we poll for the extension; once it is installed the
// pending action continues on its own.
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { extensionBridge } from '../../services/extensionBridge';

interface Props {
  onClose: () => void;
  /** Called once the extension is detected (e.g. continue the download). Omit for an info-only popup. */
  onDetected?: () => void;
  reason?: 'download' | 'preview' | 'info';
}

export default function ExtensionInstallPrompt({ onClose, onDetected, reason = 'info' }: Props) {
  const [installed, setInstalled] = useState(false);
  // The editor re-renders constantly (playback time); keep the poll timer stable via refs.
  const handlers = useRef({ onClose, onDetected });
  handlers.current = { onClose, onDetected };

  useEffect(() => {
    let stopped = false;
    const check = async () => {
      const st = await extensionBridge.detect(600);
      if (!st || stopped) return;
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

  const title = reason === 'download' ? 'Install ClipFlow to download'
    : reason === 'preview' ? 'Install ClipFlow to preview this video'
    : 'ClipFlow extension';

  // Portal to <body>: the header uses backdrop-blur, which traps fixed children inside it (the popup then
  // rendered under the nav). Rendering at the root keeps it above everything.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ext-title" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0b0f17] p-7 text-center text-sm text-slate-300 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 id="ext-title" className="mb-2 text-lg font-bold text-white">{title}</h2>
        <p className="mb-5 text-slate-400">
          {installed
            ? 'The extension is installed and ready.'
            : 'One free install. Downloads run on your own connection, so they are fast and never blocked.'}
        </p>

        {!installed && (
          <div className="mb-4 space-y-3 text-left">
            {extensionBridge.storeUrl && (
              <a href={extensionBridge.storeUrl} target="_blank" rel="noopener noreferrer"
                className="block w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-500">Add to Chrome</a>
            )}
            <a
              href={extensionBridge.installUrl}
              download="clipflow-extension.zip"
              className="flex items-center justify-center gap-2 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center font-semibold text-white hover:bg-blue-500 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
            >
              <span>Download Extension (.zip)</span>
            </a>

            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-slate-300">
              <div className="text-[11px] font-bold uppercase tracking-wider text-blue-400">1-Click Automated Setup:</div>
              <ol className="list-decimal space-y-1.5 pl-4 leading-relaxed">
                <li>Unzip <b className="text-white">clipflow-extension.zip</b> on your computer.</li>
                <li>
                  Double-click <b className="text-white">install.bat</b> inside the unzipped folder.
                </li>
                <li>
                  Done! Chrome launches automatically with the ClipFlow extension active.
                </li>
              </ol>
              <div className="pt-2 text-[11px] text-slate-400 border-t border-white/5">
                <span className="text-slate-500">Mac/Linux:</span> In <span className="font-mono text-slate-300">chrome://extensions</span>, turn on Developer mode and select the unzipped folder via <b className="text-slate-300">Load unpacked</b>.
              </div>
            </div>
          </div>
        )}

        {!installed && onDetected && (
          <p className="mb-3 flex items-center justify-center gap-2 text-xs text-slate-500">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            {reason === 'preview' ? 'Preview loads' : 'Download starts'} automatically after install.
          </p>
        )}
        <button onClick={onClose} className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15">
          {installed ? 'Done' : 'Not now'}
        </button>
      </div>
    </div>,
    document.body,
  );
}
