import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import AdminCtrl from '../controllers/adminController.js';

const router = express.Router();

// Performance aggregates by created_by (manual | ai)
router.get('/teams/performance', requireAuth, AdminCtrl.getTeamPerformance);
router.get('/performance/latency', requireAuth, AdminCtrl.getSimulationDurationStats);
router.get('/performance/throughput', requireAuth, AdminCtrl.getSimulationThroughputHourly);
router.get('/performance/errors', requireAuth, AdminCtrl.getSimulationErrors);
router.get('/usage/types-by-country', requireAuth, AdminCtrl.getTypesByCountry);
router.get('/users/by-age', requireAuth, AdminCtrl.getUsersByAge);
router.get('/users/age-buckets', requireAuth, AdminCtrl.getUsersAgeBuckets);

export default router;
