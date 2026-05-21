import jwt from 'jsonwebtoken';
import { getUserById } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';

export const requireAdmin = async (req, res, next) => {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success:false, error: 'NO_TOKEN' });
    const token = m[1];
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ success:false, error: 'INVALID_TOKEN' }); }
    if (!payload || !payload.sub) return res.status(401).json({ success:false, error: 'INVALID_TOKEN' });
    const user = await getUserById(payload.sub);
    if (!user || !user.is_admin) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
    req.authUser = user;
    next();
  } catch (e) {
    console.error('[requireAdmin] Error:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export default requireAdmin;
