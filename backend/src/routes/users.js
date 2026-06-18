import express from 'express';
import { getUsers, createUser, updateUser } from '../controllers/users.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

// Only Super Admins can manage staff members
router.use(authenticateToken);
router.use(requirePermission('super_admin'));

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);

export default router;
