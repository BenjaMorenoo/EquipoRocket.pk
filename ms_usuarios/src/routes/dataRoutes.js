import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listMoves, listAbilities, listItems, listSpreads, createSpread } from '../controllers/dataController.js';

const router = Router();

router.get('/moves', listMoves);
router.get('/abilities', listAbilities);
router.get('/items', listItems);
router.get('/spreads', listSpreads);
router.post('/spreads', requireAuth, createSpread);

export default router;
