// src/pages/Login.jsx
import { useState } from 'react';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaBolt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/api';
import { validators } from '../utils/validators';

/* ── Reusable field ──────────────────────────────────────────────────────── */
function Field({ label, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{
        fontSize: '11px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: error ? '#ef4444' : 'var(--color-pk-subtle)',
      }}>
        {label}
      </label>
      {children}
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaExclamationTriangle /> {error}
        </span>
      )}
    </div>
  );
}

export default function Login({ onGoRegister }) {
  const { login } = useAuth();

  const [form,    setForm]    = useState({ identifier: '', password: '' });
  const [errors,  setErrors]  = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  const set = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: null }));
    setApiErr('');
  };

  const validate = () => {
    const e = {};
    if (!form.identifier.trim()) e.identifier = 'Ingresa tu usuario o correo.';
    if (!form.password)          e.password   = 'Ingresa tu contraseña.';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setApiErr('');
    try {
      // Detect if identifier is email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.identifier.trim());
      const payload = isEmail
        ? { email: form.identifier.trim(), password: form.password }
        : { username: form.identifier.trim(), password: form.password };

      const data = await loginUser(payload);
      login(data.user ?? data);
    } catch (err) {
      // Backend not ready yet — show message
      setApiErr(
        err.message?.includes('Network') || err.message?.includes('connect')
          ? 'El servidor de autenticación no está disponible aún. (Backend en desarrollo)'
          : err.message || 'Credenciales incorrectas.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasErr) => ({
    width: '100%',
    padding: '11px 14px',
    fontSize: '14px',
    background: 'var(--color-pk-surface)',
    border: `1px solid ${hasErr ? '#ef4444' : 'var(--color-pk-border)'}`,
    borderRadius: '10px',
    color: 'var(--color-pk-text)',
    fontFamily: 'var(--font-body)',
    outline: 'none',
    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* API error */}
      {apiErr && (
        <div style={{
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px',
          padding: '12px 14px',
          fontSize: '13px',
          color: '#fca5a5',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
        }}>
          <FaExclamationTriangle style={{ flexShrink: 0, marginTop: '1px' }} />
          {apiErr}
        </div>
      )}

      {/* Identifier */}
      <Field label="Usuario o Correo" error={errors.identifier}>
        <input
          type="text"
          placeholder="trainer@pokemon.com o Ash_Ketchum"
          value={form.identifier}
          onChange={(e) => set('identifier', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          style={inputStyle(errors.identifier)}
          onFocus={(e)  => { e.target.style.borderColor = 'var(--color-pk-red)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'; }}
          onBlur={(e)   => { e.target.style.borderColor = errors.identifier ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; }}
          autoComplete="username"
        />
      </Field>

      {/* Password */}
      <Field label="Contraseña" error={errors.password}>
        <div style={{ position: 'relative' }}>
          <input
            type={showPwd ? 'text' : 'password'}
            placeholder="••••••••"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            style={{ ...inputStyle(errors.password), paddingRight: '44px' }}
            onFocus={(e)  => { e.target.style.borderColor = 'var(--color-pk-red)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'; }}
            onBlur={(e)   => { e.target.style.borderColor = errors.password ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; }}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPwd((p) => !p)}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-pk-muted)', fontSize: '16px', lineHeight: 1,
              padding: '4px',
            }}
            tabIndex={-1}
          >
            {showPwd ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>
      </Field>

      {/* Submit */}
      <button
        className="pk-btn pk-btn-primary"
        onClick={handleSubmit}
        disabled={loading}
        style={{
          width: '100%',
          justifyContent: 'center',
          padding: '13px',
          fontSize: '15px',
          opacity: loading ? 0.7 : 1,
          marginTop: '4px',
        }}
      >
        {loading ? (
          <>
            <span style={{
              width: '16px', height: '16px', borderRadius: '50%',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              animation: 'spin 0.7s linear infinite',
              display: 'inline-block',
            }} />
            Iniciando sesión...
          </>
        ) : (<><FaBolt style={{ marginRight: 8 }} /> Iniciar Sesión</>)}
      </button>

      {/* Register link */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-pk-muted)', margin: 0 }}>
        ¿No tienes cuenta?{' '}
        <button
          onClick={onGoRegister}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-pk-red-light)', fontWeight: 600,
            fontFamily: 'var(--font-body)', fontSize: '13px',
            textDecoration: 'underline', textUnderlineOffset: '2px',
          }}
        >
          Regístrate gratis
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
