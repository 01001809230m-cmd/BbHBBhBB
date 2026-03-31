import express from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { videoApiLimiter } from '../middleware/rate-limit.middleware';
import { VideoController } from '../controllers/video.controller';

const router = express.Router();

router.post('/request-access', requireAuth, videoApiLimiter, VideoController.requestAccess);
router.post('/heartbeat', requireAuth, VideoController.heartbeat);

export default router;
