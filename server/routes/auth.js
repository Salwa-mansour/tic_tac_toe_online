// routes/auth.js
import express from 'express';
import rateLimit from 'express-rate-limit';
import { Player } from '../models/Player.js';
import { registerOrLogin } from '../controllers/authController.js';

const router = express.Router();

// Rate Limiter: Max 10 requests per 15 minutes per IP address
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many registration attempts. Please try again later.' }
});

// POST /api/auth/register-or-login
router.post('/register-or-login', authLimiter,registerOrLogin);

export default router;