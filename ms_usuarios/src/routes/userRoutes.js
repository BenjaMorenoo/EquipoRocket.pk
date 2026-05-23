import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getMe, updateMe, getCollections, addCollection, removeCollection } from '../controllers/userController.js';

const router = Router();
import { listUsers } from '../controllers/userController.js';
router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
// Admin: list users
router.get('/', requireAuth, listUsers);
router.get('/collections', requireAuth, getCollections);
router.post('/collections', requireAuth, addCollection);
router.delete('/collections/:pokemonId', requireAuth, removeCollection);

export default router;
