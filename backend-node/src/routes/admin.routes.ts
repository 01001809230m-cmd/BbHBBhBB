import express from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { AdminController } from '../controllers/admin.controller';

const router = express.Router();

router.get('/users', requireAuth, requireRole(['admin', 'super_admin']), AdminController.getUsers);
router.post('/users/:userId/promote', requireAuth, requireRole(['super_admin']), AdminController.promoteUser);
router.post('/users/:userId/ban', requireAuth, requireRole(['admin', 'super_admin']), AdminController.banUser);

export default router;
