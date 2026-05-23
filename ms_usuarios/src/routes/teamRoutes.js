import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listTeams, createTeam, getTeam, updateTeam, deleteTeam, addFeedback, getFeedback, updatePokemonSpread, listPublicTeams } from '../controllers/teamsController.js';

const router = Router();

// Public endpoint: anyone can read aggregated feedback counts for a team
router.get('/:id/feedback', getFeedback);

// Public-ish: list teams from other users (authenticated)
router.get('/public', requireAuth, listPublicTeams);

// Authenticated routes
router.get('/', requireAuth, listTeams);
router.post('/', requireAuth, createTeam);
router.get('/:id', requireAuth, getTeam);
router.patch('/:id/pokemon/:teamPokemonId/spread', requireAuth, updatePokemonSpread);
router.put('/:id', requireAuth, updateTeam);
router.delete('/:id', requireAuth, deleteTeam);
router.post('/:id/feedback', requireAuth, addFeedback);

export default router;
