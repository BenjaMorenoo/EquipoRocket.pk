import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listTeams, createTeam, getTeam, updateTeam, deleteTeam } from '../controllers/teamsController.js';

const router = Router();

router.use(requireAuth);
router.get('/', listTeams);
router.post('/', createTeam);
router.get('/:id', getTeam);
router.put('/:id', updateTeam);
router.delete('/:id', deleteTeam);

export default router;
