import app from './src/app.js';
import { env } from './src/config/env.js';

const port = env.port || 8080;
app.listen(port, () => console.log(`[ms_usuarios] listening on ${port}`));
