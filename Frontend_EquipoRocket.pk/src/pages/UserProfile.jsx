// src/pages/UserProfile.jsx
import { useState, useEffect } from 'react';
import { updateCurrentUser, getTeams, verifyCurrentPassword } from '../services/api';
import { FaLock, FaEdit, FaTimes, FaEye, FaEyeSlash, FaUnlock, FaSave, FaGlobe, FaMapMarkerAlt, FaBirthdayCake, FaCalendarAlt, FaCheck, FaExclamationTriangle, FaLayerGroup, FaPlus } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { validators } from '../utils/validators';
import { REGIONS, COUNTRIES_BY_REGION, MONTHS } from '../utils/regions';
import ConfirmModal from '../components/ConfirmModal';

// Mock teams — fallback
const MOCK_TEAMS = [
  { id: 1, name: 'Dragon Storm',  format: 'OU',  pokemon: 6, updatedAt: '2026-05-10' },
  { id: 2, name: 'Sun & Steel',   format: 'VGC', pokemon: 4, updatedAt: '2026-05-12' },
  { id: 3, name: 'Rain Dance',    format: 'UU',  pokemon: 6, updatedAt: '2026-05-15' },
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
const regionName  = (id) => REGIONS.find(r => r.id === id)?.name  ?? '—';
const countryName = (regionId, countryId) =>
  (COUNTRIES_BY_REGION[regionId] ?? []).find(c => c.id === countryId)?.name ?? '—';
const formatDate  = (iso) => {
  if (!iso) return '—';
  // support 'YYYY-MM-DD' and full ISO 'YYYY-MM-DDTHH:MM:SSZ'
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  const day = d ? String(Number(d)).padStart(2, '0') : '—';
  return `${day} de ${MONTHS.find(mo => mo.v === m)?.label ?? m} de ${y}`;
};

const parseDateParts = (iso) => {
  if (!iso) return { day: '', month: '', year: '' };
  const datePart = iso.includes('T') ? iso.split('T')[0] : iso;
  const [y, m, d] = datePart.split('-');
  return { day: d ? String(Number(d)) : '', month: m || '', year: y || '' };
};

/* ── Inline input ───────────────────────────────────────────────────────── */
const inp = (err) => ({
  width: '100%', padding: '10px 13px', fontSize: '14px',
  background: 'var(--color-pk-surface)',
  border: `1px solid ${err ? '#ef4444' : 'var(--color-pk-border)'}`,
  borderRadius: '10px', color: 'var(--color-pk-text)',
  fontFamily: 'var(--font-body)', outline: 'none',
  transition: 'border-color .15s, box-shadow .15s',
});
const focusOn  = (e) => { e.target.style.borderColor = 'var(--color-pk-red)'; e.target.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'; };
const focusOff = (e, err) => { e.target.style.borderColor = err ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; };

/* ── Data row ───────────────────────────────────────────────────────────── */
function DataRow({ icon, label, value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '12px',
      padding: '12px 0', borderBottom: '1px solid var(--color-pk-border)',
    }}>
      <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: '2px' }}>
          {label}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--color-pk-text)' }}>{value}</div>
      </div>
    </div>
  );
}

/* ── Edit modal ─────────────────────────────────────────────────────────── */
function EditModal({ user, onSave, onClose }) {
  const [step, setStep] = useState(0); // 0=password gate, 1=edit form
  const [gatePassword, setGatePassword] = useState('');
  const [gateErr,      setGateErr]      = useState('');
  const [showGate,     setShowGate]     = useState(false);

  const [form,   setForm]   = useState({
    username:   user.username   ?? '',
    email:      user.email      ?? '',
    region_id:  user.region_id  ?? '',
    country_id: user.country_id ?? '',
    ...parseDateParts(user.fecha_nac),
  });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  const countries = form.region_id ? (COUNTRIES_BY_REGION[Number(form.region_id)] ?? []) : [];
  const years     = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 5 - i);
  const maxDay    = form.month ? new Date(Number(form.year) || 2000, Number(form.month), 0).getDate() : 31;
  const days      = Array.from({ length: maxDay }, (_, i) => i + 1);

  const set = (k, v) => {
    setForm(p => ({ ...p, [k]: v, ...(k === 'region_id' ? { country_id: '' } : {}) }));
    setErrors(p => ({ ...p, [k]: null }));
  };

  // Step 0: verify password
  const verifyPassword = async () => {
    if (!gatePassword.trim()) { setGateErr('Ingresa tu contraseña actual.'); return; }
    setLoading(true);
    try {
      // Call backend to verify current password
      await verifyCurrentPassword(gatePassword);
      setStep(1);
    } catch {
      setGateErr('Contraseña incorrecta.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1: save changes
  const handleSave = async () => {
    const e = {};
    const eu = validators.username(form.username); if (eu) e.username = eu;
    const ee = validators.email(form.email);       if (ee) e.email    = ee;
    if (!form.region_id)  e.region_id  = 'Selecciona una región.';
    if (!form.country_id) e.country_id = 'Selecciona un país.';
    const ef = validators.fechaNac({ day: form.day, month: form.month, year: form.year });
    if (ef) e.fechaNac = ef;
    if (Object.keys(e).length) { setErrors(e); return; }

    setLoading(true);
    setApiErr('');
    try {
      const updated = {
        ...user,
        username:   form.username.trim(),
        email:      form.email.trim().toLowerCase(),
        region_id:  Number(form.region_id),
        country_id: Number(form.country_id),
        fecha_nac:  `${form.year}-${form.month}-${String(form.day).padStart(2,'0')}`,
      };
      await onSave(updated, gatePassword);
    } catch (err) {
      setApiErr(err.message || 'Error al guardar cambios.');
    } finally {
      setLoading(false);
    }
  };

  const sel = (k) => ({
    ...inp(!!errors[k]), cursor: 'pointer', appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%234e6490' strokeWidth='2' strokeLinecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', paddingRight: '32px',
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn .18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border-light)', borderRadius: '20px', padding: '28px', width: 'min(500px,100%)', maxHeight: '90vh', overflowY: 'auto', animation: 'modalSlide .22s ease', display: 'flex', flexDirection: 'column', gap: '18px' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
            {step === 0 ? (<><FaLock style={{ marginRight: 8 }} /> Verificar identidad</>) : (<><FaEdit style={{ marginRight: 8 }} /> Editar perfil</>)}
          </h2>
          <button onClick={onClose} style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: '8px', color: 'var(--color-pk-muted)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}><FaTimes /></button>
        </div>

        {/* ── GATE: password verification ── */}
        {step === 0 && (
          <>
            <p style={{ fontSize: '13px', color: 'var(--color-pk-subtle)', margin: 0 }}>
              Para editar tus datos debes confirmar tu contraseña actual.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)' }}>Contraseña actual</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showGate ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={gatePassword}
                  onChange={e => { setGatePassword(e.target.value); setGateErr(''); }}
                  onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                  style={{ ...inp(!!gateErr), paddingRight: '42px' }}
                  onFocus={focusOn} onBlur={e => focusOff(e, !!gateErr)}
                  autoFocus
                />
                <button type="button" onClick={() => setShowGate(p => !p)} tabIndex={-1} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: '15px' }}>
                  {showGate ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              {gateErr && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {gateErr}</span>}
            </div>
            <button className="pk-btn pk-btn-primary" onClick={verifyPassword} disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
              {loading ? 'Verificando...' : (<><FaUnlock /> Verificar y editar</>)}
            </button>
          </>
        )}

        {/* ── EDIT FORM ── */}
        {step === 1 && (
          <>
            {apiErr && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px 13px', fontSize: '12px', color: '#fca5a5' }}><FaExclamationTriangle /> {apiErr}</div>}

            {/* Username */}
            {[
              { key: 'username', label: 'Nombre de usuario', type: 'text', placeholder: 'Ash_Ketchum', maxLength: 50 },
              { key: 'email',    label: 'Correo electrónico', type: 'email', placeholder: 'trainer@example.com' },
            ].map(f => (
              <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLength} onChange={e => set(f.key, e.target.value)} style={inp(!!errors[f.key])} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} />
                {errors[f.key] && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors[f.key]}</span>}
              </div>
            ))}

            {/* Region */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors.region_id ? '#ef4444' : 'var(--color-pk-subtle)' }}>Región competitiva</label>
              <select value={form.region_id} onChange={e => set('region_id', e.target.value)} style={sel('region_id')} onFocus={focusOn} onBlur={e => focusOff(e, !!errors.region_id)}>
                <option value="" style={{ background: 'var(--color-pk-card)' }}>— Selecciona —</option>
                {REGIONS.map(r => <option key={r.id} value={r.id} style={{ background: 'var(--color-pk-card)' }}>{r.name}</option>)}
              </select>
              {errors.region_id && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors.region_id}</span>}
            </div>

            {/* Country */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors.country_id ? '#ef4444' : 'var(--color-pk-subtle)' }}>País</label>
              <select value={form.country_id} onChange={e => set('country_id', e.target.value)} disabled={!form.region_id} style={{ ...sel('country_id'), opacity: form.region_id ? 1 : .5 }} onFocus={focusOn} onBlur={e => focusOff(e, !!errors.country_id)}>
                <option value="" style={{ background: 'var(--color-pk-card)' }}>— Selecciona —</option>
                {countries.map(c => <option key={c.id} value={c.id} style={{ background: 'var(--color-pk-card)' }}>{c.name}</option>)}
              </select>
              {errors.country_id && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors.country_id}</span>}
            </div>

            {/* Date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors.fechaNac ? '#ef4444' : 'var(--color-pk-subtle)' }}>Fecha de nacimiento</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1.2fr', gap: '8px' }}>
                {[
                  { key: 'day',   placeholder: 'Día',  options: days.map(d => ({ v: String(d), label: String(d).padStart(2,'0') })) },
                  { key: 'month', placeholder: 'Mes',  options: MONTHS.map(m => ({ v: m.v, label: m.label })) },
                  { key: 'year',  placeholder: 'Año',  options: years.map(y => ({ v: String(y), label: String(y) })) },
                ].map(f => (
                  <select key={f.key} value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ ...sel('fechaNac'), padding: '10px 8px', fontSize: '13px' }} onFocus={focusOn} onBlur={e => focusOff(e, !!errors.fechaNac)}>
                    <option value="" style={{ background: 'var(--color-pk-card)' }}>{f.placeholder}</option>
                    {f.options.map(o => <option key={o.v} value={o.v} style={{ background: 'var(--color-pk-card)' }}>{o.label}</option>)}
                  </select>
                ))}
              </div>
              {errors.fechaNac && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors.fechaNac}</span>}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button className="pk-btn pk-btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>Cancelar</button>
              <button className="pk-btn pk-btn-primary"   onClick={handleSave} disabled={loading} style={{ flex: 2, justifyContent: 'center', padding: '12px', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                {loading ? 'Guardando...' : (<><FaSave /> Guardar cambios</>)}
              </button>
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes modalSlide{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function UserProfile({ onNavigate }) {
  const { user, login } = useAuth();
  const [editOpen, setEditOpen]   = useState(false);
  const [saved,    setSaved]      = useState(false);
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await getTeams();
        const list = res?.data?.teams || [];
        if (mounted) setTeams(list);
      } catch (e) {
        // fallback to mock data
        if (mounted) setTeams(MOCK_TEAMS);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!user) return null;

  const handleSave = async (updated, currentPassword) => {
    try {
      const payload = {
        username: updated.username,
        email: updated.email,
        region_id: updated.region_id,
        country_id: updated.country_id,
        fecha_nac: updated.fecha_nac,
        current_password: currentPassword,
      };
      const res = await updateCurrentUser(payload);
      const newUser = res?.data?.user;
      if (newUser) {
        login(newUser);
        setEditOpen(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        throw new Error('No se recibió usuario actualizado');
      }
    } catch (e) {
      throw e;
    }
  };

  const initials = user.username?.slice(0,2).toUpperCase() ?? 'PK';

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 60px' }}>

      {/* Saved toast */}
      {saved && (
        <div style={{
          position: 'fixed', top: '80px', right: '24px', zIndex: 50,
          background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '10px', padding: '12px 18px',
          color: '#4ade80', fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: '13px', letterSpacing: '0.06em', animation: 'fadeIn .2s ease',
        }}>
          <FaCheck style={{ marginRight: 8 }} /> Perfil actualizado correctamente
        </div>
      )}

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(22px,4vw,34px)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
          Mi <span style={{ color: 'var(--color-pk-red)' }}>Perfil</span>
        </h1>
        <button className="pk-btn pk-btn-secondary" onClick={() => setEditOpen(true)} style={{ fontSize: '13px', padding: '9px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FaEdit /> Editar datos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1.3fr)', gap: '20px', alignItems: 'start' }}>

        {/* LEFT: profile card */}
        <div className="fade-up fade-up-2" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="pk-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', textAlign: 'center' }}>
            {/* Avatar */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-pk-red), var(--color-pk-blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '28px', fontWeight: 700, color: '#fff',
              fontFamily: 'var(--font-heading)', border: '3px solid var(--color-pk-border-light)',
              boxShadow: '0 0 24px rgba(220,38,38,0.2)',
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', letterSpacing: '0.05em' }}>{user.username}</div>
              <div style={{ fontSize: '13px', color: 'var(--color-pk-muted)', marginTop: '3px' }}>{user.email}</div>
            </div>
            {/* Status badge */}
            <div style={{
              background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
              borderRadius: '20px', padding: '4px 14px',
              fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase', color: '#4ade80',
            }}>
              ● Activo
            </div>
          </div>

          {/* Data card */}
          <div className="pk-card" style={{ padding: '20px' }}>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', margin: '0 0 4px' }}>
              Información
            </h3>
            <DataRow icon={<FaGlobe />} label="Región"           value={regionName(user.region_id)} />
            <DataRow icon={<FaMapMarkerAlt />} label="País"             value={countryName(user.region_id, user.country_id)} />
            <DataRow icon={<FaBirthdayCake />} label="Fecha nacimiento" value={formatDate(user.fecha_nac)} />
            <div style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <DataRow icon={<FaCalendarAlt />} label="Miembro desde"  value={user.created_at ? new Date(user.created_at).toLocaleDateString('es-CL') : '—'} />
            </div>
          </div>
        </div>

        {/* RIGHT: teams */}
        <div className="fade-up fade-up-3">
          <div className="pk-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '14px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
                <FaLayerGroup style={{ marginRight: 8 }} /> Mis Equipos <span style={{ color: 'var(--color-pk-muted)', fontWeight: 400 }}>({teams.length || MOCK_TEAMS.length})</span>
              </h3>
              <button className="pk-btn pk-btn-primary" onClick={() => onNavigate?.('builder')} style={{ padding: '6px 14px', fontSize: '12px', display:'flex', alignItems:'center', gap:8 }}>
                <FaPlus /> Nuevo
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(teams.length ? teams.slice(0,3) : MOCK_TEAMS).map(team => (
                <div key={team.id} style={{
                  background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'all .15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-pk-border-light)'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-pk-border)'; e.currentTarget.style.transform = 'none'; }}
                >
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '15px', letterSpacing: '0.04em', marginBottom: '4px' }}>{team.name}</div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: 'var(--color-pk-muted)' }}>
                            <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '4px', padding: '1px 7px', color: 'var(--color-pk-yellow)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{team.format}</span>
                            <span>{(Array.isArray(team.pokemon) ? team.pokemon.length : (typeof team.pokemon === 'number' ? team.pokemon : (team.pokemon_count || (team.pokemons ? team.pokemons.length : 0))))}/6 Pokémon</span>
                      <span>{new Date(team.updatedAt).toLocaleDateString('es-CL')}</span>
                    </div>
                  </div>
                  <button className="pk-btn pk-btn-secondary" onClick={() => onNavigate?.('builder', team)} style={{ padding: '6px 12px', fontSize: '11px' }}>Ver →</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {editOpen && <EditModal user={user} onSave={handleSave} onClose={() => setEditOpen(false)} />}
    </div>
  );
}
