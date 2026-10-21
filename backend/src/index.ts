import express, { type Request, type Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';
import authRoutes from './routes/auth.routes.js';
import googleRoutes from './routes/google.routes.js';
import appRequestRoutes from './routes/app-request.routes.js';
import downloadsRoutes from './routes/downloads.routes.js';
import path from 'path';
import fs from 'fs';
import { logger } from './utils/logger.util.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Connect to MongoDB with auto-retry
const MONGODB_URI = process.env.MONGODB_URI;

const connectWithRetry = async () => {
  if (!MONGODB_URI) {
    console.warn('[DB] WARNING: MONGODB_URI is not set in environment variables!');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log('[DB] Successfully connected to MongoDB Atlas database.');
  } catch (err: any) {
    console.error('[DB] MongoDB connection error:', err?.message || err);
    console.log('[DB] Retrying connection in 5 seconds...');
    setTimeout(connectWithRetry, 5000);
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[DB] MongoDB connection lost. Attempting reconnect...');
});

mongoose.connection.on('reconnected', () => {
  console.log('[DB] MongoDB reconnected successfully.');
});

connectWithRetry();

// All video work (resolving, downloading, ffmpeg) happens in the user's browser extension.
// This server only handles accounts, Google login, the waitlist and the download log/history.
const httpServer = createServer(app);

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Enable trust proxy for Render / Vercel reverse proxy
app.set('trust proxy', 1);

// CORS configuration supporting credentials (cookies)
const allowedOrigins = [
  FRONTEND_URL,
  'https://clipflow-lake.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev/local
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger middleware (summarizes in console, writes full raw data to app.log)
// One line per request, printed when the response finishes: METHOD url [status] ms user
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const userId = (req as any).userId;
    logger.http(req.method, req.originalUrl || req.url, res.statusCode, Date.now() - start, userId);
  });
  next();
});

// Health check endpoint for uptime monitors / Render / container health probes
app.get(['/health', '/api/health'], (_req: Request, res: Response) => {
  const stateMap: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const dbStatus = stateMap[mongoose.connection.readyState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    service: 'clipflow-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
    },
    memory: {
      rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    },
  });
});

// Primary API Routes
app.use('/api/auth', authRoutes);
app.use('/api/google', googleRoutes);
app.use('/api/auth/google', googleRoutes);
app.use('/api/downloads', downloadsRoutes); // download log + history (the user's library)
app.use('/api/app-requests', appRequestRoutes);
app.use('/api/waitlist', appRequestRoutes);

// Desktop Companion OTA Auto-Update Check Endpoint
app.get(['/api/app/update-check', '/api/app/version'], (req: Request, res: Response) => {
  const versionFileCandidates = [
    path.join(process.cwd(), 'backend', 'app-version.json'),
    path.join(process.cwd(), 'app-version.json'),
  ];
  const versionFile = versionFileCandidates.find(p => fs.existsSync(p));
  if (versionFile) {
    try {
      const data = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
      const host = req.get('host') || 'localhost:3001';
      const protocol = req.protocol || 'http';
      const baseUrl = `${protocol}://${host}`;
      if (data.downloadUrl && data.downloadUrl.startsWith('/')) {
        data.downloadUrl = `${baseUrl}${data.downloadUrl}`;
      }
      return res.json(data);
    } catch (e: any) {
      console.error('[UpdateCheck Error]:', e.message);
    }
  }
  res.json({
    version: '1.0.0',
    downloadUrl: '/public/downloads/ClipFlowHelper.exe',
    changelog: 'Latest stable release',
  });
});

// Serve direct browser downloads with forced attachment Content-Disposition header
app.get('/public/downloads/:filename', (req: Request, res: Response) => {
  let raw = req.params.filename as string;
  try { raw = decodeURIComponent(raw); } catch {}
  const filename = path.basename(raw);

  const candidates = [
    path.join(process.cwd(), 'backend', 'public', 'downloads', filename),
    path.join(process.cwd(), 'public', 'downloads', filename),
  ];

  const filePath = candidates.find(c => fs.existsSync(c));

  if (!filePath) {
    console.warn(`[Download] File not found in public downloads: "${filename}"`);
    return res.status(404).json({ error: 'File not found or download link expired' });
  }

  // Extract clean display file name without jobId prefix (e.g. "b3aae3b532804bee_Title.mp3" -> "Title.mp3")
  const displayName = filename.includes('_') ? filename.slice(filename.indexOf('_') + 1) : filename;

  res.download(filePath, displayName, (err) => {
    if (err && !res.headersSent) {
      console.error('[Download Error]:', err.message);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });
});

// Serve public static folder (downloads, assets)
const publicDirCandidates = [
  path.join(process.cwd(), 'backend', 'public'),
  path.join(process.cwd(), 'public'),
];
const publicDir = publicDirCandidates.find(p => fs.existsSync(p)) || path.join(process.cwd(), 'public');
app.use('/public', express.static(publicDir));

// Serve ClipFlow browser extension zip and static files
app.get('/extension/clipflow-extension.zip', (_req: Request, res: Response) => {
  const candidates = [
    path.join(process.cwd(), 'frontend', 'public', 'extension', 'clipflow-extension.zip'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'extension', 'clipflow-extension.zip'),
  ];
  const zipFile = candidates.find(c => fs.existsSync(c));
  if (!zipFile) {
    return res.status(404).json({ error: 'Extension zip package not found' });
  }
  res.download(zipFile, 'clipflow-extension.zip');
});

app.get(['/extension/install.bat', '/extension/install-clipflow.bat'], (_req: Request, res: Response) => {
  const candidates = [
    path.join(process.cwd(), 'frontend', 'public', 'extension', 'install.bat'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'extension', 'install.bat'),
  ];
  const batFile = candidates.find(c => fs.existsSync(c));
  if (!batFile) {
    return res.status(404).json({ error: 'Installer script not found' });
  }
  res.download(batFile, 'install-clipflow.bat');
});

const extDirCandidates = [
  path.join(process.cwd(), 'frontend', 'public', 'extension'),
  path.join(process.cwd(), '..', 'frontend', 'public', 'extension'),
];
const extDir = extDirCandidates.find(p => fs.existsSync(p));
if (extDir) {
  app.use('/extension', express.static(extDir));
}

// Serve production frontend bundle if built
const frontendDist = path.join(process.cwd(), '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('{*path}', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

httpServer.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Server Error] Port ${port} is already in use by another running instance.`);
    console.error(`[Server Error] Please stop the other running backend process before starting a new one.`);
    process.exit(1);
  } else {
    console.error(`[Server Error]`, err);
    process.exit(1);
  }
});

httpServer.listen(port, () => {
  console.log(`[Server] Production Server is running on port ${port}`);
  console.log(`[Server] Allowed Frontend Origin: ${FRONTEND_URL}`);
});

process.on('SIGINT', () => {
  console.log('\n[Server] Stopping backend server (SIGINT)...');
  try { httpServer.close(); } catch {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  try { httpServer.close(); } catch {}
  process.exit(0);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error({
    context: 'UnhandledRejection',
    summary: reason?.message || 'Unhandled Promise Rejection',
    error: reason,
  });
});

process.on('uncaughtException', (err: Error) => {
  logger.error({
    context: 'UncaughtException',
    summary: err.message,
    error: err,
  });
});

export default app;
