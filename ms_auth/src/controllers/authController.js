// src/controllers/authController.js
// Controlador simple para registro de usuarios usando el Repository Pattern.
import bcrypt from 'bcryptjs';
import UserRepo from '../repositories/userRepository.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export const register = async (req, res) => {
  try {
    const { username, email, password, region_id, country_id, fecha_nac } = req.body;
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

    const user = await UserRepo.create({ username, email, password_hash, region_id, country_id, fecha_nac });

    return res.status(201).json({ success:true, data: { user } });
  } catch (e) {
    console.error('[ms_auth] Error en register:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, error: 'email y password requeridos' });

    const user = await UserRepo.findByEmail(email);
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
      is_active: user.is_active,
      created_at: user.created_at,
    };

    return res.status(200).json({ success:true, data: { token, user: publicUser } });
  } catch (e) {
    console.error('[ms_auth] Error en login:', e.message);
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
          is_active: u.is_active, created_at: u.created_at,
        };
        return res.json({ success:true, data: { user: publicUser } });
      }
    }

    if (!user) return res.status(404).json({ success:false, error: 'USER_NOT_FOUND' });
    const publicUser = {
      id: user.id, username: user.username, email: user.email,
      region_id: user.region_id, country_id: user.country_id, fecha_nac: user.fecha_nac,
      is_active: user.is_active, created_at: user.created_at,
    };
    return res.json({ success:true, data: { user: publicUser } });
  } catch (e) {
    console.error('[ms_auth] Error en me:', e.message);
    return res.status(500).json({ success:false, error: 'INTERNAL_ERROR' });
  }
};
