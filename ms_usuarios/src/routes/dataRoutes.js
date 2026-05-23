import { Router } from 'express';
import { listMoves, listAbilities, listItems } from '../controllers/dataController.js';

const router = Router();

router.get('/moves', listMoves);
router.get('/abilities', listAbilities);
router.get('/items', listItems);

export default router;
