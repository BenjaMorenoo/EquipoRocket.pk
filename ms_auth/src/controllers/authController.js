// src/controllers/authController.js
// Controlador simple para registro de usuarios usando el Repository Pattern.
import bcrypt from 'bcryptjs';
import UserRepo from '../repositories/userRepository.js';

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
