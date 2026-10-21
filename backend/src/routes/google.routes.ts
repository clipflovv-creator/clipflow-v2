import { Router, Request, Response } from 'express';
import { GoogleOAuthService } from '../services/google-oauth.service.js';
import { SessionService } from '../services/session.service.js';
import {
  requireAuth,
  optionalAuth,
  AuthenticatedRequest,
} from '../middlewares/auth.middleware.js';
import { GoogleOAuthConnectionModel } from '../models/GoogleOAuthConnection.model.js';
import { emailService } from '../services/email.service.js';

const router = Router();
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ─── GET /api/google/connect & /api/auth/google ─────────────────────────────
// Initiates Google sign-in (1-click registration/login, or linking Google to an existing account)
router.get(['/connect', '/'], optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user ? req.user._id.toString() : 'new';
    const { url } = GoogleOAuthService.generateConnectUrl(userId);

    if (req.query.format === 'json') {
      return res.json({ url });
    }
    return res.redirect(url);
  } catch (err: any) {
    console.error('[Google Connect Error]', err.message);
    return res.status(500).json({ error: 'Failed to generate Google authorization URL' });
  }
});

// ─── GET /api/google/callback & /api/auth/google/callback ───────────────────
// Handles the Google sign-in callback: signs in / registers the user and sets the session cookie
router.get(['/callback', '/auth/callback'], async (req: Request, res: Response) => {
  const code = req.query.code as string;
  const state = req.query.state as string;
  const error = req.query.error as string;

  if (error) {
    console.error('[Google Callback Error from Google]', error);
    return res.redirect(`${FRONTEND_URL}/login?auth_error=${encodeURIComponent(error)}`);
  }

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?auth_error=missing_oauth_parameters`);
  }

  try {
    // Verify state signature and extract userId or 'new'
    if (!state) throw new Error('missing_oauth_state');
    const stateUserId = GoogleOAuthService.verifyState(state);

    // Exchange authorization code for user profile and encrypted tokens
    const { user, isNewUser } = await GoogleOAuthService.handleCallback(code, stateUserId);

    // Send welcome email to users signing in with Google if not yet sent
    if (isNewUser || !user.welcomeEmailSent) {
      try {
        const sent = await emailService.sendWelcomeEmail(user.email, user.name);
        if (sent) {
          user.welcomeEmailSent = true;
          await user.save();
          console.log(`[Google OAuth] Welcome email delivered to ${user.email}`);
        }
      } catch (emailErr: any) {
        console.warn('[Google OAuth] Welcome email error:', emailErr.message);
      }
    }

    // Create / rotate server-side session and set secure HttpOnly cookie
    const existingSessionId = req.cookies?.sessionId;
    const { rawSessionId } = await SessionService.rotateSession(existingSessionId, user._id, req);
    SessionService.setSessionCookie(res, rawSessionId);

    console.log(`[Google OAuth] User authenticated${isNewUser ? ' (new user)' : ''}: ${user.email}`);

    return res.redirect(`${FRONTEND_URL}/?auth_status=success&connected=true`);
  } catch (err: any) {
    console.error('[Google Callback Exception]', err.message);
    return res.redirect(`${FRONTEND_URL}/login?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// ─── POST /api/google/disconnect ────────────────────────────────────────────
// Unlinks the user's Google account
router.post('/disconnect', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await GoogleOAuthService.disconnect(req.user!._id);
    res.json({
      success: true,
      message: 'Google account has been unlinked.',
    });
  } catch (err: any) {
    console.error('[Google Disconnect Error]', err.message);
    res.status(500).json({ error: 'Failed to unlink Google account' });
  }
});

// ─── GET /api/google/status ─────────────────────────────────────────────────
// Is a Google account linked?
router.get('/status', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connection = await GoogleOAuthConnectionModel.findOne({
      userId: req.user!._id,
      isConnected: true,
    });

    res.json({
      connected: Boolean(connection),
      googleEmail: connection?.googleEmail || null,
    });
  } catch (err: any) {
    console.error('[Google Status Error]', err.message);
    res.status(500).json({ error: 'Failed to fetch Google account status' });
  }
});

export default router;
