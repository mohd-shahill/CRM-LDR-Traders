import express from 'express';
import { getAuditLogs, createAuditLog } from '../controllers/audit.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getAuditLogs);
router.post('/', createAuditLog);

export default router;
