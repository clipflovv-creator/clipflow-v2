// "Why extension?" explainer, opened from the home header. Plain-language: the problem and the trust.
// Deliberately high level: no internals about how downloads are resolved.
import { createPortal } from 'react-dom';

interface Props { onClose: () => void }

const PROBLEMS = [
  ['Video sites block servers', 'YouTube, Instagram, X and Twitch limit or block downloads that come from data-center servers. A server-based tool breaks often.'],
  ['Servers cost money', 'Every download moves gigabytes through our servers. The more people use it, the bigger the bill, so tools like this end up paid or limited.'],
  ['Long videos are slow', 'Most tools download the whole video before cutting. A 20-hour stream just to get 10 seconds wastes time and space.'],
];

const SOLUTION = [
  'The extension runs in your own browser, so the video comes from your own connection, the same way it loads when you watch it.',
  'Cutting, cropping and converting happen on your computer, so only the part you choose is downloaded.',
  'Our server only handles sign-in and keeps a small history of what you downloaded.',
];

const TRUST = [
  'It only works on ClipFlow and the video sites it supports. It cannot see your other tabs or websites.',
  'Files go straight to your Downloads folder. Nothing you make is uploaded to us.',
  'No password is needed for the extension. Private posts you can already see in your browser load with your own login, which never leaves your browser.',
  'The only record we keep is the link, title and time of each download, so you can see your history.',
  'Remove it any time from chrome://extensions and nothing stays behind.',
];

export default function WhyExtensionModal({ onClose }: Props) {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="why-ext-title" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0b0f17] p-6 text-sm text-slate-300 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 id="why-ext-title" className="text-xl font-bold text-white">Why do we need an extension?</h2>
          <button onClick={onClose} aria-label="Close" className="text-2xl leading-none text-slate-500 hover:text-white">×</button>
        </div>
        <p className="mb-6 text-slate-400">
          Short answer: so downloading works reliably and stays free for everyone, without us paying for every video.
        </p>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">The problem</h3>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {PROBLEMS.map(([h, t]) => (
            <div key={h} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
              <div className="mb-1 font-semibold text-white">{h}</div>
              <div className="text-xs leading-relaxed text-slate-400">{t}</div>
            </div>
          ))}
        </div>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">The solution</h3>
        <ul className="mb-6 space-y-2">
          {SOLUTION.map((t) => (
            <li key={t} className="flex gap-2"><span className="text-emerald-400">✓</span><span>{t}</span></li>
          ))}
        </ul>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-blue-400">What this means for you</h3>
        <div className="mb-6 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-lg bg-white/[0.04] p-3"><b className="text-white">Free and unlimited</b><br />No daily limits and no paid plan just to download.</div>
          <div className="rounded-lg bg-white/[0.04] p-3"><b className="text-white">Faster</b><br />Only your selected clip is downloaded, not the whole video.</div>
          <div className="rounded-lg bg-white/[0.04] p-3"><b className="text-white">More reliable</b><br />Works from your connection, so it isn't blocked the way server tools are.</div>
          <div className="rounded-lg bg-white/[0.04] p-3"><b className="text-white">Private</b><br />Your videos stay on your computer.</div>
        </div>

        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Why you can trust it</h3>
        <ul className="mb-6 space-y-1.5 text-xs text-slate-400">
          {TRUST.map((t) => (
            <li key={t} className="flex gap-2"><span className="text-emerald-400">✓</span><span>{t}</span></li>
          ))}
        </ul>

        <p className="mb-5 text-xs text-slate-500">
          The Chrome Web Store version does not include YouTube downloads, because Google's policy doesn't allow them. The downloadable .zip includes YouTube.
        </p>
        <button onClick={onClose} className="w-full rounded-xl bg-white/10 px-4 py-2.5 font-semibold text-white hover:bg-white/15">Got it</button>
      </div>
    </div>,
    document.body,
  );
}
