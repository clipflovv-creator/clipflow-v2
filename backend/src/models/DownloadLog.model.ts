import mongoose, { Document, Schema } from 'mongoose';

export type DownloadPlatform = 'youtube' | 'instagram' | 'twitter' | 'twitch';
export type DownloadStatus = 'started' | 'completed' | 'failed' | 'cancelled';

export interface IDownloadLog extends Document {
  userId?: mongoose.Types.ObjectId;   // absent for logged-out users
  anonId?: string;                    // per-browser id, set for everyone
  jobId: string;
  platform: DownloadPlatform;
  kind?: string;
  url: string;
  title?: string;
  quality?: string;
  sizeBytes?: number;
  durationSec?: number;
  status: DownloadStatus;
  error?: string;
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
    platform: { type: String, enum: ['youtube', 'instagram', 'twitter', 'twitch'], required: true, index: true },
    kind: String,
    url: { type: String, required: true, maxlength: 2048 },
    title: { type: String, maxlength: 500 },
    quality: String,
    sizeBytes: Number,
    durationSec: Number,
    status: { type: String, enum: ['started', 'completed', 'failed', 'cancelled'], default: 'started' },
    error: { type: String, maxlength: 1000 },
    extVersion: String,
    build: { type: String, enum: ['store', 'full'] },
  },
  { timestamps: true }
);

DownloadLogSchema.index({ userId: 1, createdAt: -1 });
DownloadLogSchema.index({ jobId: 1 }, { unique: true });

export const DownloadLog = mongoose.model<IDownloadLog>('DownloadLog', DownloadLogSchema);
