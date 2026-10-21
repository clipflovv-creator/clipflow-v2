import mongoose, { Document, Schema } from 'mongoose';

export type DownloadPlatform = 'youtube' | 'instagram' | 'twitter' | 'twitch';
export type DownloadStatus = 'started' | 'completed' | 'failed' | 'cancelled';
export type DownloadAction = 'video' | 'audio' | 'frame' | 'thumbnail' | 'captions';

/**
 * One document per download (video, audio, frame, thumbnail or captions), moving
 * started → completed / failed / cancelled. Doubles as the user's download history and as an
 * analytics dataset: what is downloaded, from where, in which format and quality.
 * No raw IP is stored; country comes from proxy geo headers or an offline IP lookup.
 */
export interface IDownloadLog extends Document {
  userId?: mongoose.Types.ObjectId;   // absent for logged-out users
  anonId?: string;                    // per-browser id, set for everyone
  jobId: string;
  status: DownloadStatus;
  error?: string;

  // What
  action?: DownloadAction;
  platform: DownloadPlatform;
  kind?: string;                      // video, short, reel, clip, vod, live, post, tweet
  url: string;
  videoId?: string;
  title?: string;
  author?: string;
  isLive?: boolean;
  sourceDurationSec?: number;         // length of the original video

  // How
  output?: string;                    // mp4, mp3, m4a, wav, png, jpg, srt, vtt, txt
  quality?: string;                   // format picked by the extension, e.g. "1080p"
  maxHeight?: number;                 // quality requested in the editor
  audioBitrate?: string;
  startSec?: number;
  endSec?: number;
  clipSec?: number;                   // requested clip length
  aspectRatio?: string;
  fitMode?: string;
  edited?: boolean;                   // crop / aspect-ratio filter applied
  captionLang?: string;

  // Result
  sizeBytes?: number;
  durationSec?: number;               // length of the saved file
  elapsedMs?: number;                 // click → file saved

  // Where / who (coarse)
  country?: string;
  countryName?: string;
  continent?: string;
  region?: string;
  city?: string;
  timezone?: string;
  language?: string;
  browser?: string;
  os?: string;
  device?: string;
  extVersion?: string;
  build?: 'store' | 'full';

  createdAt: Date;
  updatedAt: Date;
}

const DownloadLogSchema = new Schema<IDownloadLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    anonId: { type: String, maxlength: 64, index: true },
    jobId: { type: String, required: true },
    status: { type: String, enum: ['started', 'completed', 'failed', 'cancelled'], default: 'started', index: true },
    error: { type: String, maxlength: 1000 },

    action: { type: String, enum: ['video', 'audio', 'frame', 'thumbnail', 'captions'], index: true },
    platform: { type: String, enum: ['youtube', 'instagram', 'twitter', 'twitch'], required: true, index: true },
    kind: String,
    url: { type: String, required: true, maxlength: 2048 },
    videoId: { type: String, maxlength: 128 },
    title: { type: String, maxlength: 500 },
    author: { type: String, maxlength: 200 },
    isLive: Boolean,
    sourceDurationSec: Number,

    output: { type: String, maxlength: 8 },
    quality: String,
    maxHeight: Number,
    audioBitrate: { type: String, maxlength: 8 },
    startSec: Number,
    endSec: Number,
    clipSec: Number,
    aspectRatio: { type: String, maxlength: 16 },
    fitMode: { type: String, maxlength: 16 },
    edited: Boolean,
    captionLang: { type: String, maxlength: 16 },

    sizeBytes: Number,
    durationSec: Number,
    elapsedMs: Number,

    country: { type: String, maxlength: 2, index: true },
    countryName: String,
    continent: { type: String, maxlength: 2 },
    region: { type: String, maxlength: 64 },
    city: { type: String, maxlength: 128 },
    timezone: { type: String, maxlength: 64 },
    language: { type: String, maxlength: 35 },
    browser: String,
    os: String,
    device: String,
    extVersion: String,
    build: { type: String, enum: ['store', 'full'] },
  },
  { timestamps: true }
);

DownloadLogSchema.index({ userId: 1, createdAt: -1 });
DownloadLogSchema.index({ jobId: 1 }, { unique: true });
DownloadLogSchema.index({ createdAt: -1 });

export const DownloadLog = mongoose.model<IDownloadLog>('DownloadLog', DownloadLogSchema);
