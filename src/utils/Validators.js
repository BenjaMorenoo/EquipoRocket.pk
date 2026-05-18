// src/utils/validators.js

export const validators = {
  username: (v) => {
    if (!v || !v.trim()) return 'El nombre de usuario es obligatorio.';
    if (v.trim().length > 50) return 'Máximo 50 caracteres.';
    return null;
  },

  email: (v) => {
    if (!v || !v.trim()) return 'El correo es obligatorio.';
    // RFC-5322 simplified: needs @, a domain with at least one dot
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!re.test(v.trim())) return 'Ingresa un correo válido (ejemplo: nombre@dominio.com).';
    return null;
  },

  password: (v) => {
    if (!v) return 'La contraseña es obligatoria.';
    if (v.length < 8) return 'Mínimo 8 caracteres.';
    if (!/[A-Z]/.test(v)) return 'Debe contener al menos una letra mayúscula.';
    if (!/[0-9]/.test(v)) return 'Debe contener al menos un número.';
    if (!/[.,\-_!@#$%^&*()+=?]/.test(v))
      return 'Debe contener al menos un carácter especial (., - _ ! @ # $ % etc).';
    return null;
  },

  confirmPassword: (v, original) => {
    if (!v) return 'Confirma tu contraseña.';
    if (v !== original) return 'Las contraseñas no coinciden.';
    return null;
  },

  region: (v) => {
    if (!v) return 'Selecciona una región.';
    return null;
  },

  country: (v) => {
    if (!v) return 'Selecciona un país.';
    return null;
  },

  fechaNac: ({ day, month, year }) => {
    if (!day || !month || !year) return 'La fecha de nacimiento es obligatoria.';
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    const y = parseInt(year, 10);
    const date = new Date(y, m - 1, d);
    if (
      date.getFullYear() !== y ||
      date.getMonth() + 1 !== m ||
      date.getDate() !== d
    ) return 'La fecha ingresada no es válida.';
    const today = new Date();
    const age = today.getFullYear() - y - (
      today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d) ? 1 : 0
    );
    if (age < 5)  return 'Debes tener al menos 5 años.';
    if (age > 120) return 'Fecha de nacimiento no válida.';
    return null;
  },
};

/** Strength score 0-4 for password */
export const passwordStrength = (v) => {
  if (!v) return { score: 0, label: '', color: '' };
  let s = 0;
  if (v.length >= 8)                       s++;
  if (/[A-Z]/.test(v))                     s++;
  if (/[0-9]/.test(v))                     s++;
  if (/[.,\-_!@#$%^&*()+=?]/.test(v))      s++;
  const map = [
    { label: '',           color: '' },
    { label: 'Débil',     color: '#ef4444' },
    { label: 'Regular',   color: '#f59e0b' },
    { label: 'Buena',     color: '#3b82f6' },
    { label: 'Fuerte',    color: '#22c55e' },
  ];
  return { score: s, ...map[s] };
};