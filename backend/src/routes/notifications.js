import express from 'express';
import { 
  getNotifications, 
  markAsRead, 
  createNotification 
} from '../controllers/notifications.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/', getNotifications);
router.put('/read', markAsRead);
router.post('/', createNotification);

export default router;
