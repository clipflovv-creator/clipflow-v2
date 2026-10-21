import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Scissors, X } from 'lucide-react';
import { AuthModal } from '../components/AuthModal';
import { UserProfileMenu } from '../components/UserProfileMenu';
import { ExtensionButton } from '../components/ExtensionButton';
import WhyExtensionModal from '../components/WhyExtensionModal';
import { setStoredProcessingMode } from '../utils/editorSession';

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={className}>
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={className}>
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}




export default function ClipFlowHome() {
  const [urlInput, setUrlInput] = useState('');
  const [showWhyExtension, setShowWhyExtension] = useState(false);
  const [quickInstaUrl, setQuickInstaUrl] = useState('');
  const [quickTwitchUrl, setQuickTwitchUrl] = useState('');
  const [quickTwitterUrl, setQuickTwitterUrl] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Close modals on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewImage(null);
      }
    };
    if (previewImage) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage]);

  const handleClipClick = (videoUrl: string) => {
    if (!videoUrl.trim()) return;

    // Direct to Pro Studio editor
    setStoredProcessingMode('pro');
    window.open(
      `/editor/studio?url=${encodeURIComponent(videoUrl.trim())}&mode=pro&engine=server`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (urlInput.trim()) handleClipClick(urlInput.trim());
  };

  return (
    <div className="min-h-screen bg-black text-[#f8fafc] flex flex-col selection:bg-blue-500/30">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-black/95 backdrop-blur-xl px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/logo.ico" alt="ClipFlow" style={{ width: 28, height: 28, objectFit: 'contain' }} />
            <span className="text-sm font-bold tracking-tight text-white">ClipFlow</span>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => {
                const el = document.getElementById('how-to-use');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              How to use
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('why-engine');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              Get the extension
            </button>
            <button
              onClick={() => setShowWhyExtension(true)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              Why extension?
            </button>
            <Link
              to="/terms"
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
            >
              Terms & Conditions
            </Link>
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            <ExtensionButton />
            <UserProfileMenu onOpenAuth={() => setShowAuthModal(true)} />
          </div>
        </div>
      </header>

      {showWhyExtension && <WhyExtensionModal onClose={() => setShowWhyExtension(false)} />}

      <main className="flex-1 bg-black">

        {/* ── Section 1: Hero ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-20 pb-16 px-6 bg-black">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-radial from-blue-600/15 via-sky-600/8 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto text-center space-y-8 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-4"
            >
              {/* Badge with NO leading logo */}
              <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-white bg-white text-black text-xs font-bold mb-2 shadow-md">
                <span>Free video clipper for YouTube, Instagram, X and Twitch</span>
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Clip any video,{' '}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-sky-400 via-blue-400 to-cyan-400">
                  download only what you need
                </span>
              </h1>
              <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Paste a YouTube, Instagram, X or Twitch link. Trim, crop and pick your aspect ratio, then download just your clip. Free, with no limits.
              </p>
            </motion.div>

            {/* URL Inputs with Brand Colored Clip Buttons & OR Spacers */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="space-y-2.5 max-w-2xl mx-auto"
            >
              {/* 1. YouTube Input (Red Brand Button) */}
              <form onSubmit={handleUrlSubmit}>
                <div className="flex items-center bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden focus-within:border-red-500/60 transition-colors shadow-lg shadow-black/40">
                  <div className="pl-4 pr-2.5 shrink-0">
                    <YoutubeIcon className="text-[#ff0000]" />
                  </div>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="Paste YouTube, Shorts, or Video URL..."
                    className="flex-1 bg-transparent py-3 px-1 text-white placeholder-gray-500 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!urlInput.trim()}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-[#ff0000] hover:bg-[#e60000] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-red-600/25 active:scale-95"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Clip</span>
                  </button>
                </div>
              </form>

              {/* OR Divider 1 */}
              <div className="flex items-center justify-center my-1 py-0.5">
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 select-none">OR</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
              </div>

              {/* 2. Instagram Input (Pink/Orange Gradient Brand Button) */}
              <form onSubmit={(e) => { e.preventDefault(); if (quickInstaUrl.trim()) handleClipClick(quickInstaUrl.trim()); }}>
                <div className="flex items-center bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden focus-within:border-pink-500/60 transition-colors shadow-lg shadow-black/40">
                  <div className="pl-4 pr-2.5 shrink-0">
                    <InstagramIcon className="text-[#e1306c]" />
                  </div>
                  <input
                    type="url"
                    value={quickInstaUrl}
                    onChange={(e) => setQuickInstaUrl(e.target.value)}
                    placeholder="Paste Instagram Reel, Video, or Post URL..."
                    className="flex-1 bg-transparent py-3 px-1 text-white placeholder-gray-500 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!quickInstaUrl.trim()}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-pink-600/25 active:scale-95"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Clip</span>
                  </button>
                </div>
              </form>

              {/* OR Divider 2 */}
              <div className="flex items-center justify-center my-1 py-0.5">
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 select-none">OR</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
              </div>

              {/* 3. Twitch Input (Purple Brand Button) */}
              <form onSubmit={(e) => { e.preventDefault(); if (quickTwitchUrl.trim()) handleClipClick(quickTwitchUrl.trim()); }}>
                <div className="flex items-center bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden focus-within:border-purple-500/60 transition-colors shadow-lg shadow-black/40">
                  <div className="pl-4 pr-2.5 shrink-0">
                    <TwitchIcon className="text-[#9146ff]" />
                  </div>
                  <input
                    type="url"
                    value={quickTwitchUrl}
                    onChange={(e) => setQuickTwitchUrl(e.target.value)}
                    placeholder="Paste Twitch Clip, VOD, or Stream URL..."
                    className="flex-1 bg-transparent py-3 px-1 text-white placeholder-gray-500 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!quickTwitchUrl.trim()}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-[#9146ff] hover:bg-[#772ce8] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-purple-600/25 active:scale-95"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Clip</span>
                  </button>
                </div>
              </form>

              {/* OR Divider 3 */}
              <div className="flex items-center justify-center my-1 py-0.5">
                <div className="flex items-center gap-3 w-full max-w-xs">
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-500 select-none">OR</span>
                  <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                </div>
              </div>

              {/* 4. Twitter / X Input (Twitter Blue Brand Button) */}
              <form onSubmit={(e) => { e.preventDefault(); if (quickTwitterUrl.trim()) handleClipClick(quickTwitterUrl.trim()); }}>
                <div className="flex items-center bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden focus-within:border-sky-500/60 transition-colors shadow-lg shadow-black/40">
                  <div className="pl-4 pr-2.5 shrink-0">
                    <TwitterIcon className="text-[#1d9bf0]" />
                  </div>
                  <input
                    type="url"
                    value={quickTwitterUrl}
                    onChange={(e) => setQuickTwitterUrl(e.target.value)}
                    placeholder="Paste Twitter / X Video or Post URL..."
                    className="flex-1 bg-transparent py-3 px-1 text-white placeholder-gray-500 focus:outline-none text-xs sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!quickTwitterUrl.trim()}
                    className="flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-semibold text-white bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0 shadow-md shadow-sky-600/25 active:scale-95"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Clip</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        </section>

        {/* ── Section 2: How to Use (4 Steps: Top to Bottom with Edge-Blurred Images Blending into Black) ── */}
        <section id="how-to-use" className="pt-6 pb-12 px-4 sm:px-6 bg-black relative overflow-hidden scroll-mt-16">
          <div className="max-w-5xl mx-auto space-y-6 relative z-10">

            {/* Header */}
            <div className="text-center space-y-2">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                How to Use ClipFlow
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                4 streamlined steps from online video URL to finished export.
              </p>
            </div>

            {/* 4 Steps Stack with Divider Lines */}
            <div className="divide-y divide-zinc-800/80 border-y border-zinc-800/80">

              {/* ── STEP 1 ── */}
              <div className="py-4 sm:py-5 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                {/* Left: Uniform Image with Feathered Edge Blur Blending into Black */}
                <div
                  onClick={() => setPreviewImage('/steps/step1.png')}
                  className="w-full md:w-[440px] lg:w-[460px] h-[200px] sm:h-[220px] shrink-0 relative flex items-center justify-center cursor-pointer group select-none bg-black overflow-hidden rounded-xl"
                  title="Click to view full image"
                >
                  <img
                    src="/steps/step1.png"
                    alt="Step 1: Paste Link and Clip"
                    style={{
                      maskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                {/* Right: Matter */}
                <div className="flex-1 space-y-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider">01</span>
                    <div className="h-[1px] w-8 bg-zinc-700" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Step One</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Paste Video Link &amp; Click Clip
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Paste any video URL from YouTube, Instagram Reels, Twitch, or Twitter / X directly into the input bar and click <strong className="text-white font-semibold">Clip</strong>. ClipFlow automatically ingests and prepares the video stream.
                  </p>
                </div>
              </div>

              {/* ── STEP 2 ── */}
              <div className="py-4 sm:py-5 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                {/* Left: Uniform Image with Feathered Edge Blur Blending into Black */}
                <div
                  onClick={() => setPreviewImage('/steps/step2.png')}
                  className="w-full md:w-[440px] lg:w-[460px] h-[200px] sm:h-[220px] shrink-0 relative flex items-center justify-center cursor-pointer group select-none bg-black overflow-hidden rounded-xl"
                  title="Click to view full image"
                >
                  <img
                    src="/steps/step2.png"
                    alt="Step 2: Precision Trimming"
                    style={{
                      maskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                {/* Right: Matter */}
                <div className="flex-1 space-y-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider">02</span>
                    <div className="h-[1px] w-8 bg-zinc-700" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Step Two</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Set Start &amp; End Cut Points
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Scrub through the timeline with sub-second accuracy. Drag the interactive start and end trim handles on the video filmstrip to pinpoint the exact portion you want to clip.
                  </p>
                </div>
              </div>

              {/* ── STEP 3 ── */}
              <div className="py-4 sm:py-5 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                {/* Left: Uniform Image with Feathered Edge Blur Blending into Black */}
                <div
                  onClick={() => setPreviewImage('/steps/step3.png')}
                  className="w-full md:w-[440px] lg:w-[460px] h-[200px] sm:h-[220px] shrink-0 relative flex items-center justify-center cursor-pointer group select-none bg-black overflow-hidden rounded-xl"
                  title="Click to view full image"
                >
                  <img
                    src="/steps/step3.png"
                    alt="Step 3: Crop & Framing, Format & Quality"
                    style={{
                      maskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                      WebkitMaskImage: 'radial-gradient(ellipse 92% 86% at 50% 50%, black 50%, transparent 100%)',
                    }}
                    className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                </div>

                {/* Right: Matter */}
                <div className="flex-1 space-y-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider">03</span>
                    <div className="h-[1px] w-8 bg-zinc-700" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Step Three</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Choose Framing, Format &amp; Resolution
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Select your aspect ratio (16:9 Landscape, 9:16 Shorts/Reels, 1:1 Square, 4:5 Portrait, or Custom), pick your export format (MP4 Video, MP3 Audio, Subtitles), and choose resolutions up to 4K / 1080p.
                  </p>
                </div>
              </div>

              {/* ── STEP 4 (Two Images Stacked Vertically on Left, Same Total Size) ── */}
              <div className="py-4 sm:py-5 flex flex-col md:flex-row items-center gap-6 lg:gap-10">
                {/* Left: Two Images Stacked on Top of Each Other (Same Exact Container Footprint) */}
                <div className="w-full md:w-[440px] lg:w-[460px] h-[200px] sm:h-[220px] shrink-0 relative flex flex-col justify-between gap-2.5 bg-black">

                  {/* Top Image: Local Save File Dialog */}
                  <div
                    onClick={() => setPreviewImage('/steps/step4_save.png')}
                    className="relative flex-1 rounded-lg overflow-hidden bg-black cursor-pointer group select-none flex items-center justify-center"
                    title="Click to view full image"
                  >
                    <img
                      src="/steps/step4_save.png"
                      alt="Step 4: Save As Dialog"
                      style={{
                        maskImage: 'radial-gradient(ellipse 94% 84% at 50% 50%, black 50%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 94% 84% at 50% 50%, black 50%, transparent 100%)',
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>

                  {/* Bottom Image: Cloud Storage Vault */}
                  <div
                    onClick={() => setPreviewImage('/steps/step4_storage.png')}
                    className="relative flex-1 rounded-lg overflow-hidden bg-black cursor-pointer group select-none flex items-center justify-center"
                    title="Click to view full image"
                  >
                    <img
                      src="/steps/step4_storage.png"
                      alt="Step 4: My Downloads"
                      style={{
                        maskImage: 'radial-gradient(ellipse 94% 84% at 50% 50%, black 50%, transparent 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse 94% 84% at 50% 50%, black 50%, transparent 100%)',
                      }}
                      className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                </div>

                {/* Right: Matter */}
                <div className="flex-1 space-y-2.5 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-zinc-400 tracking-wider">04</span>
                    <div className="h-[1px] w-8 bg-zinc-700" />
                    <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Step Four</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    Instant Download &amp; My Downloads
                  </h3>
                  <p className="text-zinc-400 text-xs sm:text-sm leading-relaxed">
                    Download your trimmed clip directly to your computer with zero compression loss, and find every clip you have downloaded under My Downloads.
                  </p>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Section 3: Large Video Frame Showcase (COMMENTED OUT FOR NOW) ──
        <section className="pt-2 pb-16 sm:pb-24 px-4 sm:px-6 relative overflow-hidden bg-black">
          <div className="max-w-5xl mx-auto relative z-10">
            <div
              onClick={() => setIsVideoModalOpen(true)}
              className="relative rounded-2xl sm:rounded-3xl bg-[#08080c] border border-white/10 shadow-2xl shadow-purple-950/20 cursor-pointer group hover:border-white/20 transition-all duration-300 select-none overflow-hidden"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-[#0b0b10]/90">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444] border border-[#dc2626]" />
                  <span className="w-3 h-3 rounded-full bg-[#eab308] border border-[#ca8a04]" />
                  <span className="w-3 h-3 rounded-full bg-[#22c55e] border border-[#16a34a]" />
                  <span className="text-[11px] font-mono text-zinc-500 ml-2">Overview · ClipFlow Studio</span>
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span className="px-2 py-0.5 rounded bg-white/5 border border-white/5">Auto-Reframing</span>
                </div>
              </div>

              <div className="relative w-full aspect-[16/9.5] sm:aspect-[16/9] bg-[#050508] p-4 sm:p-8 flex flex-col justify-between">
                <div className="grid grid-cols-3 gap-4 opacity-40">
                  <div className="space-y-2">
                    <div className="h-4 w-28 bg-zinc-800/80 rounded" />
                    <div className="h-24 bg-zinc-900/60 rounded-xl border border-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-zinc-800/80 rounded" />
                    <div className="h-24 bg-zinc-900/60 rounded-xl border border-white/5" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-20 bg-zinc-800/80 rounded" />
                    <div className="h-24 bg-zinc-900/60 rounded-xl border border-white/5" />
                  </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-black/80 border border-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-2xl shadow-purple-600/30 transform group-hover:scale-110 group-hover:border-white/60 transition-all duration-300">
                    <span className="text-white font-bold">Play</span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black via-black/80 to-transparent z-10" />
              </div>
            </div>
          </div>
        </section>
        ── */}



        {/* ── Section 4: Supported platforms ── */}
        <section className="py-16 px-6 bg-black">
          <div className="max-w-5xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Works with the video links you already use</h2>
            <p className="text-zinc-400 text-sm max-w-2xl mx-auto leading-relaxed">
              Paste a link from any of these platforms. Clips, reels, streams and full videos are all supported.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { name: 'YouTube', color: '#ff0000' },
                { name: 'Instagram', color: '#e1306c' },
                { name: 'Twitter / X', color: '#1d9bf0' },
                { name: 'Twitch', color: '#9147ff' },
              ].map((p) => (
                <span key={p.name} className="px-4 py-2 rounded-full border border-white/10 bg-white/[0.03] text-sm font-semibold" style={{ color: p.color }}>
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 5: With vs without the extension ── */}
        <section id="why-engine" className="py-20 px-6 bg-black scroll-mt-16">
          <div className="max-w-5xl mx-auto space-y-12">
            <div className="text-center space-y-3">
              <span className="text-[11px] font-mono font-bold tracking-[0.2em] uppercase text-zinc-400">
                The ClipFlow extension
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                What you can do with and without it
              </h2>
              <p className="text-zinc-400 text-xs sm:text-sm max-w-2xl mx-auto leading-relaxed">
                Editing is free for everyone with no install. Downloading needs the free ClipFlow extension, because it runs on your own connection.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              <div className="rounded-2xl border border-white/10 bg-[#0a0a0f] p-6 sm:p-8 flex flex-col gap-5">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">Without the extension</span>
                  <h3 className="text-lg font-bold text-white mt-1">Edit and preview</h3>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-300">
                  <li>✓ Paste any supported link</li>
                  <li>✓ Trim, crop and pick the aspect ratio</li>
                  <li>✓ Preview YouTube videos</li>
                  <li className="text-zinc-500">✗ Download files (needs the extension)</li>
                  <li className="text-zinc-500">✗ Preview Instagram, X and Twitch (needs the extension)</li>
                </ul>
                <button
                  onClick={() => {
                    const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                    if (input) input.focus();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-auto w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 cursor-pointer"
                >
                  Start editing
                </button>
              </div>

              <div className="rounded-2xl border border-blue-500/30 bg-blue-500/[0.04] p-6 sm:p-8 flex flex-col gap-5">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-blue-400">With the extension</span>
                  <h3 className="text-lg font-bold text-white mt-1">Everything, free</h3>
                </div>
                <ul className="space-y-2.5 text-sm text-zinc-300">
                  <li>✓ Download only the part you clip, not the whole video</li>
                  <li>✓ Preview Instagram, X and Twitch</li>
                  <li>✓ Download MP4, MP3, WAV, JPG or PNG</li>
                  <li>✓ Captions and subtitles exported with your clip</li>
                  <li>✓ No limits, no queue, no subscription</li>
                </ul>
                <div className="mt-auto flex flex-col gap-2">
                  <a
                    href="/extension/install.bat"
                    download="install-clipflow.bat"
                    className="block w-full rounded-xl bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-center text-sm font-semibold text-white cursor-pointer shadow-lg shadow-blue-600/20 transition-all"
                  >
                    ⚡ 1-Click Windows Setup (.bat)
                  </a>
                  <a
                    href="/extension/clipflow-extension.zip"
                    download="clipflow-extension.zip"
                    className="block w-full rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 px-4 py-2 text-center text-xs font-medium text-zinc-300 hover:text-white cursor-pointer transition-all"
                  >
                    Download extension (.zip)
                  </a>
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-zinc-500 max-w-2xl mx-auto">
              Why an extension? Video sites block downloads that come from servers, and servers cost money for every file. Running in your own browser makes downloads reliable and free for everyone.
            </p>
          </div>
        </section>

        {/* ── Section 6: CTA ─────────────────────────────────────── */}
        <section className="py-20 px-6 bg-black">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">Clip your first video in under a minute</h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed">
              Paste a link, choose your part, download. Free to use, nothing to pay for.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="url"]') as HTMLInputElement;
                  if (input) input.focus();
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="rounded-xl bg-white px-6 py-3 text-sm font-bold text-black hover:bg-zinc-200 cursor-pointer"
              >
                Start clipping
              </button>
              <a href="mailto:clipflovv@gmail.com" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-semibold text-white hover:bg-white/5">
                Contact us
              </a>
            </div>
          </div>
        </section>


        {/* ── Section 7: Expanded Footer ─────────────────────────────────────── */}
        <footer className="border-t border-white/[0.08] pt-12 pb-8 px-6 bg-black text-zinc-400">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-10">
              {/* Col 1: Brand & About */}
              <div className="col-span-2 md:col-span-1 space-y-3">
                <div className="flex items-center gap-2">
                  <img src="/logo.ico" alt="ClipFlow" className="w-6 h-6 object-contain" />
                  <span className="text-sm font-bold text-white tracking-tight">ClipFlow</span>
                  <a
                    href="https://cliy.me"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                  >
                    by Cliy
                  </a>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  ClipFlow is a product by <a href="https://cliy.me" target="_blank" rel="noopener noreferrer" className="text-zinc-300 hover:text-white underline underline-offset-2 transition-colors">Cliy</a>, built to make video editing and content creation simpler for creators around the world.
                </p>
              </div>

              {/* Col 2: Social / Supported Platforms */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Platforms</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a
                      href="https://youtube.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <YoutubeIcon className="w-3.5 h-3.5 text-red-500" />
                      <span>YouTube</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://instagram.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <InstagramIcon className="w-3.5 h-3.5 text-pink-500" />
                      <span>Instagram</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://twitch.tv"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <TwitchIcon className="w-3.5 h-3.5 text-purple-400" />
                      <span>Twitch</span>
                    </a>
                  </li>
                  <li>
                    <a
                      href="https://x.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 hover:text-white transition-colors"
                    >
                      <TwitterIcon className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Twitter / X</span>
                    </a>
                  </li>
                </ul>
              </div>

              {/* Col 3: Editor */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Editor</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link to="/editor" className="hover:text-white transition-colors">
                      Studio
                    </Link>
                  </li>
                  <li>
                    <Link to="/editor/settings" className="hover:text-white transition-colors">
                      Settings
                    </Link>
                  </li>
                  <li>
                    <span className="flex items-center gap-1.5 text-zinc-500 cursor-default">
                      <span>AI Tools</span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-zinc-400 font-bold uppercase tracking-wider">
                        Soon
                      </span>
                    </span>
                  </li>
                </ul>
              </div>

              {/* Col 4: Legal */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Legal</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link to="/terms?tab=terms" className="hover:text-white transition-colors">
                      Terms &amp; Conditions
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms?tab=terms" className="hover:text-white transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy" className="hover:text-white transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/api-terms" className="hover:text-white transition-colors">
                      API Terms of Use
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Col 5: How to Use (1 word each) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-300">How to Use</h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <a
                      href="#how-to-use"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Paste
                    </a>
                  </li>
                  <li>
                    <a
                      href="#how-to-use"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Trim
                    </a>
                  </li>
                  <li>
                    <a
                      href="#how-to-use"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Crop
                    </a>
                  </li>
                  <li>
                    <a
                      href="#how-to-use"
                      onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('how-to-use')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-white transition-colors"
                    >
                      Export
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
              <p>
                © 2026 <a href="https://cliy.me" target="_blank" rel="noopener noreferrer" className="text-zinc-400 hover:text-white transition-colors">Cliy</a> · ClipFlow
              </p>
              <div className="flex items-center gap-4 text-xs">
                <a
                  href="https://cliy.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-zinc-400 hover:text-white transition-colors font-mono"
                >
                  cliy.me
                </a>
                <span className="text-zinc-700">•</span>
                <p className="text-[11px] text-zinc-600">
                  Built for creators and media teams worldwide
                </p>
              </div>
            </div>
          </div>
        </footer>

      </main>

      {/* ── Auth Modal ─────────────────────────────────────────────────── */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />


      {/* ── Fullscreen Image Preview Modal (Exact Image Size with Attached Close Button) ── */}
      <AnimatePresence>
        {previewImage && (
          <div
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-150 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="relative inline-block max-w-[95vw] max-h-[92vh] select-none cursor-default"
            >
              {/* Close X Button attached directly to top-right of image */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/80 hover:bg-black text-white/90 hover:text-white border border-white/25 shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer backdrop-blur-md"
                title="Close (Esc)"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>

              {/* Exact image display */}
              <img
                src={previewImage}
                alt="Full Preview"
                className="w-auto h-auto max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.9)] border border-white/10 block"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
