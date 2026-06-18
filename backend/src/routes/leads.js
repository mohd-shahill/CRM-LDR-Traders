import express from 'express';
import { 
  getLeads, 
  getLeadById, 
  createLead, 
  assignLead, 
  updateL1Details, 
  updateL2Details, 
  updateL3Details, 
  updateL4Details 
} from '../controllers/leads.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';

const router = express.Router();

router.post('/', createLead);

router.use(authenticateToken);

router.get('/', getLeads);
router.get('/:id', getLeadById);

router.put('/:id/assign', requirePermission('super_admin'), assignLead);
router.put('/:id/l1', requirePermission('l1'), updateL1Details);
router.put('/:id/l2', requirePermission('l2'), updateL2Details);
router.put('/:id/l3', requirePermission('l3'), updateL3Details);

// L4 can be submitted by L4 Pickers or Scrappers
router.put('/:id/l4', updateL4Details);

export default router;
