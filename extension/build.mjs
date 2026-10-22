// Builds the extension into dist/<full|store>.
//   full  = all platforms (self-hosted .zip/.crx)
//   store = Chrome Web Store build, YouTube adapter replaced by a stub
import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const build = process.argv[2] === 'store' ? 'store' : 'full';
const outdir = path.resolve('dist', build);
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Website origins allowed to talk to the extension (content script bridge)
const SITE_MATCHES = [
  'https://clipflow-lake.vercel.app/*',
  'http://localhost:5173/*',
  'http://localhost:3000/*',
  'http://127.0.0.1:5173/*',
  'https://clipflow.cliy.me/*',
  'https://clipflow-v2.vercel.app/*',
];

const PLATFORM_HOSTS = {
  youtube: ['https://*.youtube.com/*', 'https://*.googlevideo.com/*', 'https://*.ytimg.com/*'],
  instagram: ['https://*.instagram.com/*', 'https://*.cdninstagram.com/*', 'https://*.fbcdn.net/*'],
  twitter: ['https://*.twitter.com/*', 'https://*.x.com/*', 'https://*.twimg.com/*', 'https://api.fxtwitter.com/*'],
  twitch: ['https://*.twitch.tv/*', 'https://*.ttvnw.net/*', 'https://*.jtvnw.net/*', 'https://*.cloudfront.net/*'],
};

// The store build only talks to production sites (reviewers flag localhost host permissions).
const SITE_MATCHES_BUILD = build === 'store' ? SITE_MATCHES.filter((m) => !m.includes('localhost') && !m.includes('127.0.0.1')) : SITE_MATCHES;

const SITE_ORIGINS = SITE_MATCHES_BUILD.map((m) => m.replace(/\/\*$/, ''));
const DEFINE = {
  __BUILD__: JSON.stringify(build),
  __VERSION__: JSON.stringify(pkg.version),
  __SITE_ORIGINS__: JSON.stringify(SITE_ORIGINS),
};

const hosts = Object.entries(PLATFORM_HOSTS)
  .filter(([p]) => build === 'full' || p !== 'youtube')
  .flatMap(([, h]) => h);

const manifest = {
  manifest_version: 3,
  name: build === 'full' ? 'ClipFlow Downloader' : 'ClipFlow',
  version: pkg.version,
  description: 'Downloads and processes video on your device for the ClipFlow website.',
  icons: { 16: 'icon16.png', 48: 'icon48.png', 128: 'icon128.png' },
  action: { default_icon: { 16: 'icon16.png', 48: 'icon48.png', 128: 'icon128.png' } },
  background: { service_worker: 'background.js', type: 'module' },
  permissions: ['offscreen', 'downloads', 'declarativeNetRequest', 'cookies', 'storage', 'scripting',
    ...(build === 'full' ? ['declarativeNetRequestFeedback'] : [])],
  // Site origins too: Chrome only lets header rules touch requests whose initiator the extension can access
  // (needed so preview <video> requests from the ClipFlow site get the right Referer).
  host_permissions: [...hosts, ...SITE_MATCHES_BUILD],
  content_scripts: [{ matches: SITE_MATCHES_BUILD, js: ['content.js'], run_at: 'document_start' }],
  sandbox: { pages: ['sandbox.html'] },
  // The website embeds relay.html (hidden iframe) to fetch media bytes from the user's IP.
  web_accessible_resources: [{ resources: ['relay.html', 'relay.js'], matches: SITE_MATCHES_BUILD }],
  // ffmpeg.wasm needs WebAssembly compilation in extension pages.
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'",
  },
};

// In the store build, swap the YouTube adapter for a stub so none of its code ships.
const stubYoutube = {
  name: 'stub-youtube',
  setup(b) {
    if (build !== 'store') return;
    b.onResolve({ filter: /^\.\/(adapters\/)?youtube$/ }, () => ({ path: path.resolve('src/adapters/youtube.stub.ts') }));
  },
};

fs.rmSync(outdir, { recursive: true, force: true });
fs.mkdirSync(outdir, { recursive: true });

await esbuild.build({
  entryPoints: {
    background: 'src/background.ts',
    content: 'src/content.ts',
    offscreen: 'src/offscreen.ts',
    sandbox: 'src/sandbox.ts',
    relay: 'src/relay.ts',
  },
  bundle: true,
  format: 'esm',
  target: 'chrome116',
  outdir,
  minify: build === 'store',
  sourcemap: build === 'full' ? 'inline' : false,
  define: DEFINE,
  plugins: [stubYoutube],
  logLevel: 'warning',
});

// content.js must be a classic script
await esbuild.build({
  entryPoints: ['src/content.ts'], bundle: true, format: 'iife', target: 'chrome116',
  outfile: path.join(outdir, 'content.js'), define: DEFINE,
  logLevel: 'warning',
});

for (const f of fs.readdirSync('static')) fs.copyFileSync(path.join('static', f), path.join(outdir, f));

// ffmpeg.wasm: worker + core ship inside the extension (no CDN, no install).
const ffDir = path.join(outdir, 'ffmpeg');
fs.mkdirSync(ffDir, { recursive: true });
for (const f of ['worker.js', 'const.js', 'errors.js']) {
  fs.copyFileSync(path.join('node_modules/@ffmpeg/ffmpeg/dist/esm', f), path.join(ffDir, f));
}
for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  fs.copyFileSync(path.join('node_modules/@ffmpeg/core/dist/esm', f), path.join(ffDir, f));
}

fs.writeFileSync(path.join(outdir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`built ${build} → ${path.relative(process.cwd(), outdir)}`);

// Self-hosted full build → zip into the website so the "Install the extension" popup can link to it.
if (build === 'full') {
  const zipDir = path.resolve('..', 'frontend', 'public', 'extension');
  const zipPath = path.join(zipDir, 'clipflow-extension.zip');
  fs.mkdirSync(zipDir, { recursive: true });
  fs.rmSync(zipPath, { force: true });
  try {
    if (process.platform === 'win32') {
      const psOut = outdir.replace(/'/g, "''");
      const psZip = zipPath.replace(/'/g, "''");
      const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('${psOut}', '${psZip}')"`;
      execSync(cmd, { stdio: 'ignore' });
    } else {
      const cmd = `cd "${outdir}" && zip -qr "${zipPath}" *`;
      execSync(cmd, { stdio: 'ignore' });
    }
    console.log(`zipped → ${path.relative(process.cwd(), zipPath)}`);
  } catch (err) {
    console.warn('could not zip the extension:', err.message);
  }
}
