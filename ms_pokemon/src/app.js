import express from 'express';
import cors from 'cors';
import pokemonRoutes from './routes/pokemonRoutes.js';

const app = express();

app.use(express.json());
app.use(cors({ origin: true }));

app.use('/api/pokemon', pokemonRoutes);

app.get('/', (req, res) => res.json({ service: 'ms_pokemon' }));

export default app;
