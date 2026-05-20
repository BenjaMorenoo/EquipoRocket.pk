import { Router } from 'express';
import { listPokemons, getPokemon } from '../controllers/pokemonController.js';

const router = Router();

router.get('/', listPokemons);
router.get('/:name', getPokemon);

export default router;
