import express from 'express';
import { login, logout, getMe } from '../controllers/auth.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getMe);

export default router;
