import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { config } from '../config/env.js';

const router = Router();

// Only failed attempts count towards the limit.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: config.loginRateLimitMax,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Please wait 15 minutes and try again.' } },
});

router.get('/csrf', auth.csrfToken);
router.post('/login', loginLimiter, auth.login);
router.get('/me', authenticate, auth.me);
router.post('/logout', auth.logout);

export default router;
