// src/pages/Register.jsx
import { useState, useEffect } from 'react';
import { FaExclamationTriangle, FaEye, FaEyeSlash, FaCheck, FaTimes, FaLock, FaEnvelope, FaGlobe, FaMapMarkerAlt, FaBirthdayCake, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/api';
import { validators, passwordStrength } from '../utils/validators';
import { REGIONS, COUNTRIES_BY_REGION, MONTHS } from '../utils/regions';

/* ── Field wrapper ───────────────────────────────────────────────────────── */
function Field({ label, error, hint, required, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{
        fontSize: '11px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: error ? '#ef4444' : 'var(--color-pk-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
      }}>
        {label}
        {required && <span style={{ color: 'var(--color-pk-red)' }}>*</span>}
      </label>
      {children}
      {hint && !error && (
        <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
          <FaExclamationTriangle /> {error}
        </span>
      )}
    </div>
  );
}

/* ── Input style factory ─────────────────────────────────────────────────── */
const iStyle = (hasErr) => ({
  width: '100%',
  padding: '10px 13px',
  fontSize: '14px',
  background: 'var(--color-pk-surface)',
  border: `1px solid ${hasErr ? '#ef4444' : 'var(--color-pk-border)'}`,
  borderRadius: '10px',
  color: 'var(--color-pk-text)',
  fontFamily: 'var(--font-body)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
});

const focusOn  = (e) => { e.target.style.borderColor = 'var(--color-pk-red)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'; };
const focusOff = (e, hasErr) => { e.target.style.borderColor = hasErr ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; };

/* ── Days helper ────────────────────────────────────────────────────────── */
const getDays = (month, year) => {
  if (!month) return 31;
  const m = parseInt(month, 10);
  const y = year ? parseInt(year, 10) : 2000;
  return new Date(y, m, 0).getDate();
};

/* ── Step indicator ─────────────────────────────────────────────────────── */
function Steps({ current }) {
  const steps = ['Cuenta', 'Perfil', 'Confirmación'];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '24px' }}>
      {steps.map((label, i) => {
        const active   = i === current;
        const done     = i < current;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div style={{
                width: '30px', height: '30px', borderRadius: '50%',
                background: done ? 'var(--color-pk-red)' : active ? 'rgba(220,38,38,0.2)' : 'var(--color-pk-surface)',
                border: `2px solid ${done || active ? 'var(--color-pk-red)' : 'var(--color-pk-border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                color: done ? '#fff' : active ? 'var(--color-pk-red-light)' : 'var(--color-pk-muted)',
                transition: 'all 0.3s ease',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <span style={{
                fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                color: active ? 'var(--color-pk-text)' : 'var(--color-pk-muted)',
              }}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div style={{
                flex: 1, height: '2px', margin: '0 6px', marginBottom: '18px',
                background: done ? 'var(--color-pk-red)' : 'var(--color-pk-border)',
                transition: 'background 0.3s ease',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Register({ onGoLogin }) {
  const { login } = useAuth();

  /* ── Form state ── */
  const [step,    setStep]    = useState(0); // 0=account, 1=profile, 2=done
  const [form,    setForm]    = useState({
    username: '', email: '', password: '', confirmPassword: '',
    region_id: '', country_id: '',
    day: '', month: '', year: '',
  });
  const [errors,  setErrors]  = useState({});
  const [showPwd, setShowPwd] = useState(false);
  const [showCPwd,setShowCPwd]= useState(false);
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  const strength = passwordStrength(form.password);

  /* ── Helpers ── */
  const set = (k, v) => {
    setForm((p) => {
      const next = { ...p, [k]: v };
      if (k === 'region_id') next.country_id = ''; // reset country on region change
      return next;
    });
    setErrors((p) => ({ ...p, [k]: null }));
    setApiErr('');
  };

  const countries = form.region_id ? (COUNTRIES_BY_REGION[Number(form.region_id)] || []) : [];
  const maxDays   = getDays(form.month, form.year);

  const days  = Array.from({ length: maxDays }, (_, i) => i + 1);
  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 5 - i);

  /* Reset day if invalid after month/year change */
  useEffect(() => {
    if (form.day && parseInt(form.day, 10) > maxDays) {
      setForm((p) => ({ ...p, day: '' }));
    }
  }, [form.month, form.year]);

  /* ── Validation per step ── */
  const validateStep0 = () => {
    const e = {};
    const eu = validators.username(form.username);        if (eu) e.username = eu;
    const ee = validators.email(form.email);              if (ee) e.email    = ee;
    const ep = validators.password(form.password);        if (ep) e.password = ep;
    const ec = validators.confirmPassword(form.confirmPassword, form.password);
    if (ec) e.confirmPassword = ec;
    return e;
  };

  const validateStep1 = () => {
    const e = {};
    const er = validators.region(form.region_id);   if (er) e.region_id  = er;
    const ec = validators.country(form.country_id); if (ec) e.country_id = ec;
    const ef = validators.fechaNac({ day: form.day, month: form.month, year: form.year });
    if (ef) e.fechaNac = ef;
    return e;
  };

  /* ── Navigation ── */
  const nextStep = () => {
    if (step === 0) {
      const e = validateStep0();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    if (step === 1) {
      const e = validateStep1();
      if (Object.keys(e).length) { setErrors(e); return; }
    }
    setStep((s) => s + 1);
  };

  const prevStep = () => setStep((s) => Math.max(0, s - 1));

  /* ── Submit ── */
  const handleSubmit = async () => {
    setLoading(true);
    setApiErr('');
    try {
      const payload = {
        username:   form.username.trim(),
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        region_id:  Number(form.region_id),
        country_id: Number(form.country_id),
        fecha_nac:  `${form.year}-${form.month}-${String(form.day).padStart(2, '0')}`,
      };
      const data = await registerUser(payload);
      login(data.user ?? { ...payload, id: 0, is_admin: false, is_active: true });
    } catch (err) {
      const msg = err.message || '';
      if (msg.toLowerCase().includes('username_taken') || msg.toLowerCase().includes('usuario')) {
        setErrors({ username: 'Este nombre de usuario ya está en uso.' });
        setStep(0);
      } else if (msg.toLowerCase().includes('email_taken') || msg.toLowerCase().includes('correo')) {
        setErrors({ email: 'Este correo ya está registrado.' });
        setStep(0);
      } else if (msg.toLowerCase().includes('username, email y password son requeridos')) {
        setApiErr('Faltan datos obligatorios: usuario, correo o contraseña.');
        setStep(0);
      } else if (msg.includes('Network') || msg.includes('connect') || msg.includes('fetch')) {
        setApiErr('No se pudo conectar con el servicio de autenticación. Intenta de nuevo más tarde.');
      } else {
        setApiErr(msg || 'No fue posible registrar el usuario. Revisa los datos e intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  /* ── Select option style ── */
  const selStyle = (k) => ({
    ...iStyle(!!errors[k]),
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234e6490' strokeWidth='2' strokeLinecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '32px',
  });

  /* ════════════════════════════════════════════════════════════════════════ */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Steps current={step} />

      {/* API error */}
      {apiErr && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '11px 14px', fontSize: '13px', color: '#fca5a5',
          display: 'flex', alignItems: 'flex-start', gap: '8px',
        }}>
          <FaExclamationTriangle style={{ flexShrink: 0 }} /> {apiErr}
        </div>
      )}

      {/* ──────────── STEP 0: Cuenta ──────────── */}
      {step === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          <Field label="Nombre de usuario" error={errors.username} required
            hint="Puedes usar cualquier carácter. Máximo 50 caracteres.">
            <input
              type="text"
              placeholder="Ash_Ketchum_99"
              value={form.username}
              maxLength={50}
              onChange={(e) => set('username', e.target.value)}
              style={iStyle(!!errors.username)}
              onFocus={focusOn}
              onBlur={(e) => focusOff(e, !!errors.username)}
              autoComplete="username"
            />
            {/* Character counter */}
            <span style={{ fontSize: '10px', color: form.username.length > 45 ? '#f59e0b' : 'var(--color-pk-muted)', textAlign: 'right' }}>
              {form.username.length}/50
            </span>
          </Field>

          <Field label="Correo electrónico" error={errors.email} required>
            <input
              type="email"
              placeholder="trainer@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              style={iStyle(!!errors.email)}
              onFocus={focusOn}
              onBlur={(e) => focusOff(e, !!errors.email)}
              autoComplete="email"
            />
          </Field>

          <Field label="Contraseña" error={errors.password} required
            hint="Mín. 8 caracteres · 1 mayúscula · 1 número · 1 carácter especial (.,- _!@#$%)">
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                style={{ ...iStyle(!!errors.password), paddingRight: '44px' }}
                onFocus={focusOn}
                onBlur={(e) => focusOff(e, !!errors.password)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowPwd((p) => !p)} tabIndex={-1}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: '15px' }}>
                {showPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {/* Strength bar */}
            {form.password && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                <div style={{ flex: 1, height: '4px', background: 'var(--color-pk-border)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '2px',
                    width: `${(strength.score / 4) * 100}%`,
                    background: strength.color,
                    transition: 'width 0.3s ease, background 0.3s ease',
                  }} />
                </div>
                <span style={{ fontSize: '10px', color: strength.color, fontFamily: 'var(--font-heading)', fontWeight: 700, minWidth: '44px' }}>
                  {strength.label}
                </span>
              </div>
            )}
          </Field>

          <Field label="Confirmar contraseña" error={errors.confirmPassword} required>
            <div style={{ position: 'relative' }}>
              <input
                type={showCPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                style={{ ...iStyle(!!errors.confirmPassword), paddingRight: '44px' }}
                onFocus={focusOn}
                onBlur={(e) => focusOff(e, !!errors.confirmPassword)}
                autoComplete="new-password"
              />
              <button type="button" onClick={() => setShowCPwd((p) => !p)} tabIndex={-1}
                style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: '15px' }}>
                {showCPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
              {/* Match indicator */}
              {form.confirmPassword && (
                <span style={{
                  position: 'absolute', right: '38px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '14px',
                }}>
                  {form.confirmPassword === form.password ? (<FaCheck style={{ color: '#16a34a' }} />) : (<FaTimes style={{ color: '#ef4444' }} />)}
                </span>
              )}
            </div>
          </Field>
        </div>
      )}

      {/* ──────────── STEP 1: Perfil ──────────── */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Region */}
          <Field label="Región competitiva" error={errors.region_id} required
            hint="Región de Pokémon VGC / Campeonatos mundiales a la que perteneces.">
            <select
              value={form.region_id}
              onChange={(e) => set('region_id', e.target.value)}
              style={selStyle('region_id')}
              onFocus={focusOn}
              onBlur={(e) => focusOff(e, !!errors.region_id)}
            >
              <option value="" style={{ background: 'var(--color-pk-card)' }}>— Selecciona tu región —</option>
              {REGIONS.map((r) => (
                <option key={r.id} value={r.id} style={{ background: 'var(--color-pk-card)' }}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Country */}
          <Field label="País" error={errors.country_id} required
            hint={!form.region_id ? 'Selecciona primero una región.' : undefined}>
            <select
              value={form.country_id}
              onChange={(e) => set('country_id', e.target.value)}
              disabled={!form.region_id}
              style={{ ...selStyle('country_id'), opacity: form.region_id ? 1 : 0.5, cursor: form.region_id ? 'pointer' : 'not-allowed' }}
              onFocus={focusOn}
              onBlur={(e) => focusOff(e, !!errors.country_id)}
            >
              <option value="" style={{ background: 'var(--color-pk-card)' }}>— Selecciona tu país —</option>
              {countries.map((c) => (
                <option key={c.id} value={c.id} style={{ background: 'var(--color-pk-card)' }}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Date of birth */}
          <Field label="Fecha de nacimiento" error={errors.fechaNac} required>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1.2fr', gap: '8px' }}>
              {/* Day */}
              <select
                value={form.day}
                onChange={(e) => set('day', e.target.value)}
                style={{ ...selStyle(!!errors.fechaNac), padding: '10px 8px' }}
                onFocus={focusOn}
                onBlur={(e) => focusOff(e, !!errors.fechaNac)}
              >
                <option value="" style={{ background: 'var(--color-pk-card)' }}>Día</option>
                {days.map((d) => (
                  <option key={d} value={d} style={{ background: 'var(--color-pk-card)' }}>
                    {String(d).padStart(2, '0')}
                  </option>
                ))}
              </select>
              {/* Month */}
              <select
                value={form.month}
                onChange={(e) => set('month', e.target.value)}
                style={{ ...selStyle(!!errors.fechaNac), padding: '10px 8px' }}
                onFocus={focusOn}
                onBlur={(e) => focusOff(e, !!errors.fechaNac)}
              >
                <option value="" style={{ background: 'var(--color-pk-card)' }}>Mes</option>
                {MONTHS.map((m) => (
                  <option key={m.v} value={m.v} style={{ background: 'var(--color-pk-card)' }}>
                    {m.label}
                  </option>
                ))}
              </select>
              {/* Year */}
              <select
                value={form.year}
                onChange={(e) => set('year', e.target.value)}
                style={{ ...selStyle(!!errors.fechaNac), padding: '10px 8px' }}
                onFocus={focusOn}
                onBlur={(e) => focusOff(e, !!errors.fechaNac)}
              >
                <option value="" style={{ background: 'var(--color-pk-card)' }}>Año</option>
                {years.map((y) => (
                  <option key={y} value={y} style={{ background: 'var(--color-pk-card)' }}>{y}</option>
                ))}
              </select>
            </div>
          </Field>
        </div>
      )}

      {/* ──────────── STEP 2: Confirmación ──────────── */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ fontSize: '13px', color: 'var(--color-pk-subtle)', margin: 0, textAlign: 'center' }}>
            Revisa tus datos antes de confirmar el registro.
          </p>

          {/* Summary card */}
          <div style={{
            background: 'var(--color-pk-surface)',
            border: '1px solid var(--color-pk-border)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}>
            {[
              { icon: <FaUser />, label: 'Usuario',    value: form.username },
                { icon: <FaEnvelope />, label: 'Correo',     value: form.email },
                { icon: <FaLock />, label: 'Contraseña', value: '•'.repeat(form.password.length) },
              {
                icon: <FaGlobe />, label: 'Región',
                value: REGIONS.find((r) => r.id === Number(form.region_id))?.name || '—',
              },
              {
                icon: <FaMapMarkerAlt />, label: 'País',
                value: countries.find((c) => c.id === Number(form.country_id))?.name || '—',
              },
              {
                icon: <FaBirthdayCake />, label: 'Nacimiento',
                value: form.day && form.month && form.year
                  ? `${String(form.day).padStart(2,'0')} de ${MONTHS.find((m) => m.v === form.month)?.label} de ${form.year}`
                  : '—',
              },
            ].map(({ icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{icon}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', width: '80px', flexShrink: 0 }}>
                  {label}
                </span>
                <span style={{ fontSize: '13px', color: 'var(--color-pk-text)', wordBreak: 'break-all' }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Privacy note */}
          <div style={{
            background: 'rgba(59,130,246,0.07)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: '10px',
            padding: '10px 13px',
            fontSize: '11px',
            color: 'var(--color-pk-blue)',
            lineHeight: 1.5,
          }}>
            <FaLock style={{ marginRight: 8 }} /> Tu contraseña será almacenada con hash seguro. Los campos <strong>is_admin</strong>, <strong>is_active</strong> y <strong>created_at</strong> son asignados automáticamente por el servidor y sólo son visibles para administradores.
          </div>
        </div>
      )}

      {/* ──────────── Navigation buttons ──────────── */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
        {step > 0 && (
          <button className="pk-btn pk-btn-secondary" onClick={prevStep}
            style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>
            ← Anterior
          </button>
        )}

        {step < 2 ? (
          <button className="pk-btn pk-btn-primary" onClick={nextStep}
            style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: '14px' }}>
            Siguiente →
          </button>
        ) : (
          <button
            className="pk-btn pk-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
            style={{ flex: 2, justifyContent: 'center', padding: '12px', fontSize: '14px', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <>
                <span style={{
                  width: '15px', height: '15px', borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                  animation: 'spin 0.7s linear infinite', display: 'inline-block',
                }} />
                Registrando...
              </>
            ) : (<><FaCheck style={{ marginRight: 8 }} /> Crear cuenta</>)}
          </button>
        )}
      </div>

      {/* Login link */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-pk-muted)', margin: 0 }}>
        ¿Ya tienes cuenta?{' '}
        <button onClick={onGoLogin}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-pk-red-light)', fontWeight: 600,
            fontFamily: 'var(--font-body)', fontSize: '13px',
            textDecoration: 'underline', textUnderlineOffset: '2px',
          }}>
          Inicia sesión
        </button>
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
