// Header button showing whether the ClipFlow extension is installed; opens the install / info popup.
import { useEffect, useState } from 'react';
import { extensionBridge } from '../services/extensionBridge';
import ExtensionInstallPrompt from './editor/ExtensionInstallPrompt';

export function ExtensionButton() {
  const [installed, setInstalled] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const check = () => extensionBridge.detect(800).then((st) => setInstalled(!!st)).catch(() => setInstalled(false));
    check();
    // Re-check when the user comes back from chrome://extensions.
    window.addEventListener('focus', check);
    return () => window.removeEventListener('focus', check);
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={installed ? 'ClipFlow extension is active' : 'Install the free ClipFlow extension to download'}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-gray-300 transition-colors hover:bg-white/5 hover:text-white cursor-pointer"
      >
        <span className={`h-2 w-2 rounded-full ${installed ? 'bg-emerald-400' : installed === false ? 'bg-amber-400' : 'bg-gray-500'}`} />
        Extension
      </button>
      {open && <ExtensionInstallPrompt onClose={() => setOpen(false)} />}
    </>
  );
}
