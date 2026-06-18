import express from 'express';
import { getUsers, createUser, updateUser } from '../controllers/users.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
const router = express.Router();

router.use(authenticateToken);

// All authenticated staff can view the directory list of users
router.get('/', getUsers);

// Only Super Admins can enroll or modify staff members
router.post('/', requirePermission('super_admin'), createUser);
router.put('/:id', requirePermission('super_admin'), updateUser);

export default router;
