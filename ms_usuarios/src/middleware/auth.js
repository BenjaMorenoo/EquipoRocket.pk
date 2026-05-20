import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const requireAuth = (req, res, next) => {
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return res.status(401).json({ success:false, error: 'NO_TOKEN' });
  const token = m[1];
  try {
    const payload = jwt.verify(token, env.jwt_secret);
    req.user = { id: payload.sub, username: payload.username, email: payload.email };
    return next();
  } catch (e) {
    return res.status(401).json({ success:false, error: 'INVALID_TOKEN' });
  }
};
