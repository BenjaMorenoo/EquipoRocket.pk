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
router.get('/users/registered-by-month', requireAuth, AdminCtrl.getUsersRegisteredByMonth);
router.get('/users/by-region', requireAuth, AdminCtrl.getUsersByRegion);
router.get('/users/retention', requireAuth, AdminCtrl.getUsersRetention);
router.get('/pokemon/most-used',          requireAuth, AdminCtrl.getMostUsedPokemon);
router.get('/users/engagement-by-region', requireAuth, AdminCtrl.getUserEngagementByRegion);
router.get('/users/ai-usage-by-region',   requireAuth, AdminCtrl.getAIUsageByRegion);
router.get('/users/age-engagement',       requireAuth, AdminCtrl.getAgeEngagement);
router.get('/pokemon/type-win-rates',     requireAuth, AdminCtrl.getTypeWinRates);
router.get('/pokemon/usage-vs-wins',      requireAuth, AdminCtrl.getPokemonUsageVsWins);
router.get('/teams/stats-by-region',      requireAuth, AdminCtrl.getTeamsStatsByRegion);
router.get('/teams',                      requireAuth, AdminCtrl.getAllTeams);
router.get('/teams/:id',                  requireAuth, AdminCtrl.getTeamByIdAdmin);

export default router;
