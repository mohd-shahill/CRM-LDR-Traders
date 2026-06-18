import express from 'express';
import { getInspectorSchedules, logInspection } from '../controllers/onsite.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);
router.use(requirePermission('onsite_inspect'));

router.get('/schedules', getInspectorSchedules);
router.post('/inspection', logInspection);

export default router;
