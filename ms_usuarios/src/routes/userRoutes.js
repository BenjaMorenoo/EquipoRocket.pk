import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe, updateMe, getCollections, addCollection, removeCollection } from '../controllers/userController.js';

const router = Router();
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.get('/collections', requireAuth, getCollections);
router.post('/collections', requireAuth, addCollection);
router.delete('/collections/:pokemonId', requireAuth, removeCollection);

export default router;
