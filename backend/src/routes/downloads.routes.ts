import { Router, Response } from 'express';
import { requireAuth, optionalAuth, AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { DownloadLog } from '../models/DownloadLog.model.js';
import { downloadLogSchema } from '../utils/validation.schemas.js';
import { clientInfo } from '../utils/client-info.util.js';

const router = Router();

/**
 * POST /api/downloads/log
 * Called by the website for every download. Login is optional: logged-out users are
 * recorded by anonId. Upserts by jobId so one download is one document that moves
 * started → completed/failed/cancelled.
 */
router.post('/log', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  const parsed = downloadLogSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid log payload', details: parsed.error.issues });
  }
  try {
    const { jobId, ...fields } = parsed.data;
    const owner = req.userId ? { userId: req.userId } : {};
    // A job is claimed by its first writer; later updates must come from the same user/browser.
    const existing = await DownloadLog.findOne({ jobId }).select('userId anonId').lean();
    if (existing && String(existing.userId ?? '') !== String(req.userId ?? '') && existing.anonId !== fields.anonId) {
      return res.status(409).json({ error: 'jobId belongs to another user' });
    }
    // Country / browser are taken from the first request of a job (the click), not overwritten later.
    const client = clientInfo(req);
    await DownloadLog.updateOne({ jobId }, { $set: { ...fields, ...owner }, $setOnInsert: { jobId, ...client } }, { upsert: true });
    if (fields.status !== 'started') {
      // One line per finished download, e.g. "[download] completed youtube audio mp3 10s 0.4MB IN".
      const f = fields;
      console.log(['[download]', f.status, f.platform, f.action, f.output, f.quality,
        f.clipSec != null ? `${Math.round(f.clipSec)}s` : '', f.sizeBytes ? `${(f.sizeBytes / 1e6).toFixed(1)}MB` : '',
        client.country, f.status === 'failed' ? `"${f.error?.slice(0, 80)}"` : ''].filter(Boolean).join(' '));
    }
    return res.status(204).end();
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to store download log' });
  }
});

/** GET /api/downloads/history?limit=50&before=<ISO date> */
router.get('/history', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const limit = Math.min(parseInt(String(req.query.limit || '50'), 10) || 50, 200);
  const filter: Record<string, unknown> = { userId: req.userId };
  if (req.query.before) filter.createdAt = { $lt: new Date(String(req.query.before)) };
  const items = await DownloadLog.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  return res.json({ items });
});

/** DELETE /api/downloads/:jobId — remove one entry from the user's history */
router.delete('/:jobId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { deletedCount } = await DownloadLog.deleteOne({ userId: req.userId, jobId: String(req.params.jobId) });
  return deletedCount ? res.status(204).end() : res.status(404).json({ error: 'Not found' });
});

export default router;
