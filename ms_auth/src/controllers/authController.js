// src/controllers/authController.js
// Controlador simple para registro de usuarios usando el Repository Pattern.
import bcrypt from 'bcryptjs';
import UserRepo from '../repositories/userRepository.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export const register = async (req, res) => {
  try {
    const { username, email, password, region_id, country_id, fecha_nac, is_admin } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ success:false, error: 'username, email y password son requeridos' });
    }

    // Verificar duplicados
    if (await UserRepo.emailExists(email)) {
      return res.status(409).json({ success:false, error: 'EMAIL_TAKEN' });
    }
    if (await UserRepo.usernameExists(username)) {
      return res.status(409).json({ success:false, error: 'USERNAME_TAKEN' });
    }

    const password_hash = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // If request tries to create an admin user, ensure caller is an admin.
    if (is_admin) {
      try {
        const auth = req.headers.authorization || '';
        const m = auth.match(/^Bearer\s+(.+)$/i);
        if (!m) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
        const token = m[1];
        const payload = jwt.verify(token, JWT_SECRET);
        // fallback to model to fetch user
        const userModel = await import('../models/userModel.js');
        const caller = await userModel.getUserById(payload.sub);
        if (!caller || !caller.is_admin) return res.status(403).json({ success:false, error: 'FORBIDDEN' });
      } catch (e) {
        return res.status(403).json({ success:false, error: 'FORBIDDEN' });
      }
    }

    const user = await UserRepo.create({ username, email, password_hash, region_id, country_id, fecha_nac, is_admin });

    return res.status(201).json({ success:true, data: { user } });
  } catch (e) {
    console.error('[ms_auth] Error en register:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, username, password, identifier } = req.body;
    const idf = identifier || email || username;
    if (!idf || !password) return res.status(400).json({ success:false, error: 'identifier/email/username y password requeridos' });

    // decide lookup by email pattern or username
    let user = null;
    const isEmail = typeof idf === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(idf);
    if (isEmail) user = await UserRepo.findByEmail(idf);
    else user = await UserRepo.findByUsername(idf);
    if (!user) return res.status(401).json({ success:false, error: 'INVALID_CREDENTIALS' });

    const match = await bcrypt.compare(password, user.password_hash || '');
    if (!match) return res.status(401).json({ success:false, error: 'INVALID_CREDENTIALS' });

    const payload = { sub: user.id, username: user.username, email: user.email };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    // return token and public user fields
    const publicUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      region_id: user.region_id,
      country_id: user.country_id,
      fecha_nac: user.fecha_nac,
      is_admin: user.is_admin,
      is_active: user.is_active,
      created_at: user.created_at,
    };

    return res.status(200).json({ success:true, data: { token, user: publicUser } });
  } catch (e) {
    console.error('[ms_auth] Error en login:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const listUsers = async (req, res) => {
  try {
    const userModel = await import('../models/userModel.js');
    const users = await userModel.listUsers();
    return res.json({ success:true, data: { users } });
  } catch (e) {
    console.error('[ms_auth] Error en listUsers:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const setUserActive = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success:false, error: 'INVALID_ID' });
    const { active, password } = req.body || {};
    if (typeof active !== 'boolean') return res.status(400).json({ success:false, error: 'INVALID_PAYLOAD' });
    const userModel = await import('../models/userModel.js');

    // If deactivating, require a password to be provided and valid.
    // Accept either the target user's password OR the admin's password (caller), to reduce UX friction.
    if (active === false) {
      if (!password) return res.status(400).json({ success:false, error: 'PASSWORD_REQUIRED' });
      const target = await userModel.getUserById(id);
      if (!target) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });

      // req.authUser is populated by requireAdmin middleware (the caller admin)
      const adminCaller = req.authUser || null;

      // First try target user's password
      const matchTarget = await bcrypt.compare(password, target.password_hash || '');
      if (!matchTarget) {
        // fallback: accept admin caller's password
        if (adminCaller && adminCaller.password_hash) {
          const matchAdmin = await bcrypt.compare(password, adminCaller.password_hash || '');
          if (!matchAdmin) return res.status(401).json({ success:false, error: 'INVALID_PASSWORD' });
        } else {
          return res.status(401).json({ success:false, error: 'INVALID_PASSWORD' });
        }
      }
    }

    const u = await userModel.setUserActive(id, active);
    if (!u) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });
    return res.json({ success:true, data: { user: u } });
  } catch (e) {
    console.error('[ms_auth] Error en setUserActive:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const me = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success:false, error: 'NO_TOKEN' });
    const token = m[1];
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ success:false, error: 'INVALID_TOKEN' });
    }

    const user = await UserRepo.findByEmail(payload.email) || await UserRepo.findByEmail(payload.username) || null;
    // better: find by sub id if available
    if (!user && payload.sub) {
      // fallback to model
      const userModel = await import('../models/userModel.js');
      const u = await userModel.getUserById(payload.sub);
      if (u) {
        const publicUser = {
          id: u.id, username: u.username, email: u.email,
          region_id: u.region_id, country_id: u.country_id, fecha_nac: u.fecha_nac,
          is_admin: u.is_admin, is_active: u.is_active, created_at: u.created_at,
        };
        return res.json({ success:true, data: { user: publicUser } });
      }
    }

    if (!user) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });
    const publicUser = {
      id: user.id, username: user.username, email: user.email,
      region_id: user.region_id, country_id: user.country_id, fecha_nac: user.fecha_nac,
      is_admin: user.is_admin, is_active: user.is_active, created_at: user.created_at,
    };
    return res.json({ success:true, data: { user: publicUser } });
  } catch (e) {
    console.error('[ms_auth] Error en me:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const updateMe = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success:false, error: 'NO_TOKEN' });
    const token = m[1];
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ success:false, error: 'INVALID_TOKEN' }); }

    const userId = payload.sub;
    if (!userId) return res.status(400).json({ success:false, error: 'NO_SUBJECT' });
    const { username, email, region_id, country_id, fecha_nac, current_password } = req.body || {};
    // basic validation
    if (!username || !email) return res.status(400).json({ success:false, error: 'INVALID_PAYLOAD' });

    // require current password to authorize profile updates
    if (!current_password) return res.status(400).json({ success:false, error: 'PASSWORD_REQUIRED' });

    const userModel = await import('../models/userModel.js');
    const existing = await userModel.getUserById(userId);
    if (!existing) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });

    const match = await bcrypt.compare(current_password, existing.password_hash || '');
    if (!match) return res.status(401).json({ success:false, error: 'INVALID_PASSWORD' });

    const updated = await userModel.updateUserProfile(userId, { username, email, region_id, country_id, fecha_nac });
    if (!updated) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });

    return res.json({ success:true, data: { user: updated } });
  } catch (e) {
    console.error('[ms_auth] Error en updateMe:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const verifyPassword = async (req, res) => {
  try {
    const auth = req.headers.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return res.status(401).json({ success:false, error: 'NO_TOKEN' });
    const token = m[1];
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ success:false, error: 'INVALID_TOKEN' }); }

    const userId = payload.sub;
    if (!userId) return res.status(400).json({ success:false, error: 'NO_SUBJECT' });

    const { password } = req.body || {};
    if (!password) return res.status(400).json({ success:false, error: 'PASSWORD_REQUIRED' });

    const userModel = await import('../models/userModel.js');
    const existing = await userModel.getUserById(userId);
    if (!existing) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });

    const match = await bcrypt.compare(password, existing.password_hash || '');
    if (!match) return res.status(401).json({ success:false, error: 'INVALID_PASSWORD' });

    return res.json({ success:true, data: { valid: true } });
  } catch (e) {
    console.error('[ms_auth] Error en verifyPassword:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};
