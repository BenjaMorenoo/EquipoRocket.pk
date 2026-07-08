import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCrown, FaExclamationTriangle, FaTimes, FaEye, FaUsers,
  FaCheckCircle, FaTrophy, FaSearch, FaUser, FaEyeSlash,
  FaChartBar, FaGlobeAmericas, FaDragon, FaHome,
  FaSignOutAlt, FaChartLine, FaBolt, FaTrash,
} from 'react-icons/fa';
import logo from '../assets/logo.png';
import { useAuth } from '../context/AuthContext';
import { REGIONS, COUNTRIES_BY_REGION } from '../utils/regions';
import { validators } from '../utils/validators';
import ConfirmModal              from '../components/ConfirmModal';
import AdminSimulationsAnalytics from '../components/AdminSimulationsAnalytics';
import AdminUsersByMonth         from '../components/AdminUsersByMonth';
import AdminPokemonMostUsed      from '../components/AdminPokemonMostUsed';
import AdminUsersAnalytics       from '../components/AdminUsersAnalytics';
import AdminPokemonCrossAnalysis from '../components/AdminPokemonCrossAnalysis';
import AdminTeamsCrossAnalysis   from '../components/AdminTeamsCrossAnalysis';
import AdminDashboardCharts      from '../components/AdminDashboardCharts';
import AdminTeamsView            from '../components/AdminTeamsView';
import { getUsers, setUserActive, registerUser, getAdminTeams, deleteUserPermanently } from '../services/api';

/* ── Constants ────────────────────────────────────────────────────────────── */
const SIDEBAR_W = 260;

const regionName  = (id)       => REGIONS.find(r => r.id === id)?.name ?? '—';
const countryName = (rId, cId) => (COUNTRIES_BY_REGION[rId] ?? []).find(c => c.id === cId)?.name ?? '—';

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaHome />,   accent: '#f59e0b' },
  { id: 'users',     label: 'Usuarios',  icon: <FaUsers />,  accent: '#22c55e' },
  { id: 'teams',     label: 'Equipos',   icon: <FaTrophy />, accent: '#ef4444' },
];
const ANALYSIS_NAV = [
  { id: 'analysis-users',       label: 'Usuarios',      icon: <FaChartLine />,     accent: '#22c55e' },
  { id: 'analysis-pokemon',     label: 'Pokémon',       icon: <FaDragon />,        accent: '#ef4444' },
  { id: 'analysis-teams',       label: 'Equipos',       icon: <FaGlobeAmericas />, accent: '#f59e0b' },
  { id: 'analysis-simulations', label: 'Simulaciones',  icon: <FaChartBar />,      accent: '#6890F0' },
];
const ALL_NAV = [...NAV, ...ANALYSIS_NAV];

/* ── Sidebar ──────────────────────────────────────────────────────────────── */
function NavItem({ id, label, icon, accent, active, onClick, indented }) {
  return (
    <button
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: indented ? '9px 16px 9px 40px' : '10px 16px',
        background: active ? `${accent}18` : 'transparent',
        border: 'none',
        borderLeft: `3px solid ${active ? accent : 'transparent'}`,
        cursor: 'pointer',
        color: active ? accent : 'var(--color-pk-muted)',
        fontFamily: 'var(--font-heading)', fontWeight: active ? 700 : 500,
        fontSize: indented ? 12 : 13,
        letterSpacing: '0.05em', textTransform: 'uppercase',
        transition: 'all 0.12s ease', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <span aria-hidden="true" style={{ fontSize: indented ? 11 : 14, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

function Sidebar({ section, onSection, user, onPreviewAsUser }) {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav
      aria-label="Panel de administración"
      style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: SIDEBAR_W,
        display: 'flex', flexDirection: 'column',
        background: '#06090f',
        borderRight: '1px solid var(--color-pk-border)',
        zIndex: 100, overflowY: 'auto', overflowX: 'hidden',
      }}
    >
      {/* Brand */}
      <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--color-pk-border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src={logo} alt="EquipoRocket" width={36} height={36} style={{ filter: 'drop-shadow(0 0 8px rgba(220,38,38,0.4))' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, letterSpacing: '0.04em', lineHeight: 1.1 }}>
              Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>
            </div>
            <div style={{ fontSize: 9, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#f59e0b', marginTop: 2 }}>
              Admin Panel
            </div>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ flex: 1, paddingTop: 8, paddingBottom: 8 }}>
        {NAV.map(item => (
          <NavItem
            key={item.id}
            {...item}
            active={section === item.id}
            onClick={() => onSection(item.id)}
          />
        ))}

        {/* Analysis group */}
        <div style={{ padding: '16px 16px 6px', fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
          Análisis
        </div>
        {ANALYSIS_NAV.map(item => (
          <NavItem
            key={item.id}
            {...item}
            active={section === item.id}
            onClick={() => onSection(item.id)}
            indented
          />
        ))}
      </div>

      {/* Bottom: user + actions */}
      <div style={{ borderTop: '1px solid var(--color-pk-border)', flexShrink: 0 }}>
        {/* User info */}
        <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #f59e0b, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)',
          }} aria-hidden="true">
            {user?.username?.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div style={{ fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#f59e0b', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
              Administrador
            </div>
          </div>
        </div>

        {/* Vista de usuario */}
        <button
          onClick={onPreviewAsUser}
          aria-label="Ver plataforma como usuario normal"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--color-pk-border)',
            cursor: 'pointer', color: 'var(--color-pk-subtle)',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 12,
            letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(104,144,240,0.08)'; e.currentTarget.style.color = '#6890F0'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-pk-subtle)'; }}
        >
          <FaEye aria-hidden="true" style={{ fontSize: 14 }} />
          Vista de usuario
        </button>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', background: 'transparent',
            border: 'none', borderTop: '1px solid var(--color-pk-border)',
            cursor: 'pointer', color: 'var(--color-pk-muted)',
            fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: 12,
            letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#fca5a5'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-pk-muted)'; }}
        >
          <FaSignOutAlt aria-hidden="true" style={{ fontSize: 14 }} />
          Cerrar sesión
        </button>
      </div>
    </nav>
  );
}

/* ── Stat card ────────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color, onClick }) {
  return (
    <div
      className="pk-card"
      onClick={onClick}
      style={{
        padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = `${color}60`; e.currentTarget.style.background = `${color}08`; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; } }}
    >
      <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0, background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color }} aria-hidden="true">
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      </div>
      {onClick && (
        <span style={{ marginLeft: 'auto', fontSize: 12, color: `${color}80`, flexShrink: 0 }}>→</span>
      )}
    </div>
  );
}

/* ── Section header ───────────────────────────────────────────────────────── */
function SectionHeader({ title, sub, accent = '#f59e0b', action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(20px,3vw,28px)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--color-pk-text)' }}>
          {title}
        </h1>
        {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-pk-muted)' }}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

/* ── Create Admin Modal ───────────────────────────────────────────────────── */
function CreateAdminModal({ onClose, onCreate }) {
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: null })); setApiErr(''); };
  const inp = err => ({ width: '100%', padding: '10px 13px', fontSize: '14px', background: 'var(--color-pk-surface)', border: `1px solid ${err ? '#ef4444' : 'var(--color-pk-border)'}`, borderRadius: '10px', color: 'var(--color-pk-text)', fontFamily: 'var(--font-body)', outline: 'none', transition: 'border-color .15s, box-shadow .15s' });
  const focusOn  = e => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)'; };
  const focusOff = (e, err) => { e.target.style.borderColor = err ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; };

  const handleCreate = async () => {
    const e = {};
    const eu = validators.username(form.username);                              if (eu) e.username = eu;
    const ee = validators.email(form.email);                                    if (ee) e.email    = ee;
    const ep = validators.password(form.password);                              if (ep) e.password = ep;
    const ec = validators.confirmPassword(form.confirmPassword, form.password); if (ec) e.confirmPassword = ec;
    if (Object.keys(e).length) { setErrors(e); return; }
    setLoading(true);
    try {
      await onCreate({ username: form.username.trim(), email: form.email.trim().toLowerCase(), password: form.password, is_admin: true });
      onClose();
    } catch (err) {
      setApiErr(err.message || 'Error al crear administrador.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="dlg-title" onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(6,12,24,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, animation: 'fadeIn .18s ease' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'var(--color-pk-card)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: 28, width: 'min(460px,100%)', display: 'flex', flexDirection: 'column', gap: 16, animation: 'modalSlide .22s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 id="dlg-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 18, letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--color-pk-yellow)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaCrown aria-hidden="true" /> Crear Administrador
          </h2>
          <button onClick={onClose} aria-label="Cerrar" style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: 8, color: 'var(--color-pk-muted)', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FaTimes aria-hidden="true" />
          </button>
        </div>
        <div role="note" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '10px 13px', fontSize: 12, color: '#fcd34d', lineHeight: 1.5, display: 'flex', gap: 8, alignItems: 'center' }}>
          <FaExclamationTriangle aria-hidden="true" /> Este usuario tendrá acceso total al panel de administración.
        </div>
        {apiErr && <div role="alert" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#fca5a5', display: 'flex', alignItems: 'center', gap: 8 }}><FaExclamationTriangle aria-hidden="true" /> {apiErr}</div>}
        {[{ key:'username', label:'Nombre de usuario', type:'text', placeholder:'AdminUser', maxLen:50 }, { key:'email', label:'Correo electrónico', type:'email', placeholder:'admin@example.com' }].map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor={`c-${f.key}`} style={{ fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
            <input id={`c-${f.key}`} type={f.type} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLen} onChange={e => set(f.key, e.target.value)} style={inp(!!errors[f.key])} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} aria-invalid={!!errors[f.key]} />
            {errors[f.key] && <span role="alert" style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle aria-hidden="true" /> {errors[f.key]}</span>}
          </div>
        ))}
        {[{ key:'password', label:'Contraseña' }, { key:'confirmPassword', label:'Confirmar contraseña' }].map((f, i) => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label htmlFor={`c-${f.key}`} style={{ fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
            <div style={{ position: 'relative' }}>
              <input id={`c-${f.key}`} type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ ...inp(!!errors[f.key]), paddingRight: 42 }} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} aria-invalid={!!errors[f.key]} />
              {i === 0 && <button type="button" onClick={() => setShowPwd(p => !p)} aria-label={showPwd ? 'Ocultar' : 'Mostrar'} tabIndex={-1} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--color-pk-muted)', fontSize:14 }}>{showPwd ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}</button>}
            </div>
            {errors[f.key] && <span role="alert" style={{ fontSize: 11, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle aria-hidden="true" /> {errors[f.key]}</span>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button className="pk-btn pk-btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: 12 }}>Cancelar</button>
          <button onClick={handleCreate} disabled={loading} style={{ flex: 2, padding: 12, borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.15)', color: 'var(--color-pk-yellow)', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all .2s', opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.25)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.15)'}>
            {loading ? 'Creando...' : <><FaCrown aria-hidden="true" /> Crear Admin</>}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes modalSlide{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

/* ── Dashboard section ────────────────────────────────────────────────────── */
function DashboardSection({ users, onSection }) {
  const totalUsers  = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const adminCount  = users.filter(u => u.is_admin).length;
  const totalTeams  = users.reduce((a, u) => a + u.teams, 0);

  const quickLinks = ANALYSIS_NAV.map(item => ({
    ...item,
    desc: item.id === 'analysis-users' ? 'Retención y engagement' : item.id === 'analysis-pokemon' ? 'Uso y win rates' : item.id === 'analysis-teams' ? 'Métricas por región' : 'Win rates y rendimiento',
  }));

  return (
    <div>
      <SectionHeader title="Dashboard" sub="Resumen general de la plataforma" accent="#f59e0b" />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 14, marginBottom: 28 }}>
        <StatCard label="Usuarios totales" value={totalUsers}  icon={<FaUsers />}       color="#6890F0" onClick={() => onSection('analysis-users')} />
        <StatCard label="Activos"           value={activeUsers} icon={<FaCheckCircle />} color="#22c55e" onClick={() => onSection('users')} />
        <StatCard label="Admins"            value={adminCount}  icon={<FaCrown />}       color="#f59e0b" onClick={() => onSection('users')} />
        <StatCard label="Equipos creados"   value={totalTeams}  icon={<FaTrophy />}      color="#ef4444" onClick={() => onSection('analysis-teams')} />
      </div>

      {/* Users by month chart */}
      <div
        style={{ marginBottom: 28, cursor: 'pointer' }}
        onClick={() => onSection('analysis-users')}
        title="Ver análisis de usuarios"
      >
        <AdminUsersByMonth height={260} />
      </div>

      {/* Overview mini-charts */}
      <AdminDashboardCharts onSection={onSection} />

      {/* Quick links to analysis */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: 14 }}>
          Acceso rápido — Análisis
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
          {quickLinks.map(item => (
            <button
              key={item.id}
              onClick={() => onSection(item.id)}
              style={{
                background: 'var(--color-pk-card)', border: `1px solid ${item.accent}28`,
                borderRadius: 12, padding: '14px 16px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${item.accent}0f`; e.currentTarget.style.borderColor = `${item.accent}50`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-pk-card)'; e.currentTarget.style.borderColor = `${item.accent}28`; }}
            >
              <span style={{ fontSize: 18, color: item.accent }} aria-hidden="true">{item.icon}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12, letterSpacing: '0.06em', textTransform: 'uppercase', color: item.accent }}>{item.label}</div>
                <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 2 }}>{item.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Users management section ─────────────────────────────────────────────── */
const USERS_PAGE_SIZE = 8;

function UsersPagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / USERS_PAGE_SIZE);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  const btn = (active, disabled) => ({
    minWidth: 32, height: 32, borderRadius: 8, border: '1px solid', fontSize: 12,
    fontFamily: 'var(--font-heading)', fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background:  active  ? 'rgba(34,197,94,0.12)'  : 'var(--color-pk-surface)',
    borderColor: active  ? 'rgba(34,197,94,0.4)'   : 'var(--color-pk-border)',
    color:       active  ? '#22c55e' : disabled ? 'rgba(255,255,255,0.2)' : 'var(--color-pk-muted)',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--color-pk-border)' }}>
      <span style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginRight: 8 }}>
        Página {page} de {totalPages} · {total} usuarios
      </span>
      <button style={btn(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>‹</button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: 'var(--color-pk-muted)', fontSize: 12, padding: '0 4px' }}>…</span>
          : <button key={p} style={btn(p === page, false)} onClick={() => onChange(p)}>{p}</button>
      )}
      <button style={btn(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>›</button>
    </div>
  );
}

function UsersSection({ users, adminUser, onToggle, onDelete, onOpenCreateAdmin }) {
  const [search,     setSearch]     = useState('');
  const [filterReg,  setFilterReg]  = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterAct,  setFilterAct]  = useState('');
  const [sortBy,     setSortBy]     = useState('created_at');
  const [page,       setPage]       = useState(1);

  const selStyle = { background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: 8, color: 'var(--color-pk-text)', fontFamily: 'var(--font-body)', fontSize: 13, padding: '8px 10px', outline: 'none', cursor: 'pointer' };

  const list = useMemo(() => users
    .filter(u => {
      if (search && !u.username.toLowerCase().includes(search.toLowerCase()) && !u.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterReg  && u.region_id !== Number(filterReg)) return false;
      if (filterRole === 'admin' && !u.is_admin)  return false;
      if (filterRole === 'user'  &&  u.is_admin)  return false;
      if (filterAct  === 'active'   && !u.is_active) return false;
      if (filterAct  === 'inactive' &&  u.is_active) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'username')   return a.username.localeCompare(b.username);
      if (sortBy === 'teams')      return b.teams - a.teams;
      return new Date(b.created_at) - new Date(a.created_at);
    }), [users, search, filterReg, filterRole, filterAct, sortBy]);

  // Reset page cuando cambian los filtros
  useEffect(() => setPage(1), [search, filterReg, filterRole, filterAct, sortBy]);

  const paginated = list.slice((page - 1) * USERS_PAGE_SIZE, page * USERS_PAGE_SIZE);

  return (
    <div>
      <SectionHeader
        title="Usuarios"
        sub={`${users.length} usuarios registrados · ${users.filter(u => u.is_active).length} activos`}
        accent="#22c55e"
        action={
          <button
            onClick={onOpenCreateAdmin}
            style={{ padding: '9px 18px', borderRadius: 10, cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: 'var(--color-pk-yellow)', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all .15s', display: 'flex', alignItems: 'center', gap: 7 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,158,11,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(245,158,11,0.1)'}
          >
            <FaCrown aria-hidden="true" /> Crear Admin
          </button>
        }
      />

      <div className="pk-card" style={{ padding: 20 }}>
        {/* Filters */}
        <div role="search" style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px' }}>
            <label htmlFor="u-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Buscar usuario</label>
            <input id="u-search" type="search" placeholder="Buscar usuario o email..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...selStyle, width: '100%', padding: '9px 13px 9px 36px', borderRadius: 10 }} />
            <FaSearch aria-hidden="true" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pk-muted)' }} />
          </div>
          <select value={filterReg}  onChange={e => setFilterReg(e.target.value)}  style={selStyle} aria-label="Región"><option value="">Todas las regiones</option>{REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={selStyle} aria-label="Rol"><option value="">Todos los roles</option><option value="admin">Solo admins</option><option value="user">Solo usuarios</option></select>
          <select value={filterAct}  onChange={e => setFilterAct(e.target.value)}  style={selStyle} aria-label="Estado"><option value="">Todos los estados</option><option value="active">Activos</option><option value="inactive">Inactivos</option></select>
          <select value={sortBy}     onChange={e => setSortBy(e.target.value)}     style={selStyle} aria-label="Ordenar por"><option value="created_at">Más recientes</option><option value="username">Nombre A-Z</option><option value="teams">Más equipos</option></select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }} aria-label="Lista de usuarios">
            <thead>
              <tr>
                {['Usuario','Correo','Región / País','Equipos','Estado','Rol','Registro','Acción'].map(h => (
                  <th key={h} scope="col" style={{ textAlign: 'left', padding: '10px 12px', fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', borderBottom: '1px solid var(--color-pk-border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: 40, color: 'var(--color-pk-muted)', fontSize: 13 }}>No se encontraron usuarios</td></tr>
              ) : paginated.map((u, i) => (
                <tr key={u.id}
                  style={{ borderBottom: '1px solid var(--color-pk-border)', transition: 'background .12s', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                      <div aria-hidden="true" style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: u.is_admin ? 'linear-gradient(135deg,#f59e0b,#dc2626)' : 'linear-gradient(135deg,var(--color-pk-red),var(--color-pk-blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)' }}>{u.username.slice(0,2).toUpperCase()}</div>
                      <span style={{ fontSize: 13, fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{u.username}{u.id === adminUser?.id && <span style={{ fontSize: 10, color: 'var(--color-pk-muted)', marginLeft: 5 }}>(tú)</span>}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--color-pk-subtle)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                    <div>{regionName(u.region_id)}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-pk-muted)' }}>{countryName(u.region_id, u.country_id)}</div>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 13, fontFamily: 'var(--font-heading)', fontWeight: 700, textAlign: 'center' }}>{u.teams}</td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: u.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: u.is_active ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)', color: u.is_active ? '#4ade80' : '#fca5a5', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {u.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', background: u.is_admin ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.08)', border: u.is_admin ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(59,130,246,0.2)', color: u.is_admin ? 'var(--color-pk-yellow)' : 'var(--color-pk-blue)', borderRadius: 20, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                      {u.is_admin ? <><FaCrown aria-hidden="true" style={{ marginRight: 5 }} />Admin</> : <><FaUser aria-hidden="true" style={{ marginRight: 5 }} />Usuario</>}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', fontSize: 12, color: 'var(--color-pk-muted)', whiteSpace: 'nowrap' }}>{new Date(u.created_at).toLocaleDateString('es-CL')}</td>
                  <td style={{ padding: '12px 12px' }}>
                    {u.id !== adminUser?.id ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          onClick={() => onToggle(u)}
                          aria-label={u.is_active ? `Desactivar a ${u.username}` : `Activar a ${u.username}`}
                          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 7, color: '#fca5a5', cursor: 'pointer', padding: '6px 12px', fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.05em', transition: 'all .15s', whiteSpace: 'nowrap' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#fca5a5'; }}
                        >
                          {u.is_active ? <><FaTimes aria-hidden="true" style={{ marginRight: 6 }} />Desactivar</> : <><FaCheckCircle aria-hidden="true" style={{ marginRight: 6 }} />Activar</>}
                        </button>
                        <button
                          onClick={() => onDelete(u)}
                          aria-label={`Eliminar permanentemente a ${u.username}`}
                          title="Eliminar permanentemente (Ley N° 21.719)"
                          style={{ background: 'rgba(127,29,29,0.2)', border: '1px solid rgba(185,28,28,0.3)', borderRadius: 7, color: '#f87171', cursor: 'pointer', padding: '6px 10px', fontSize: 11, transition: 'all .15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(185,28,28,0.35)'; e.currentTarget.style.color = '#ef4444'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(127,29,29,0.2)'; e.currentTarget.style.color = '#f87171'; }}
                        >
                          <FaTrash aria-hidden="true" />
                        </button>
                      </div>
                    ) : <span style={{ fontSize: 11, color: 'var(--color-pk-muted)' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <UsersPagination page={page} total={list.length} onChange={setPage} />
      </div>
    </div>
  );
}

/* ── Section-level date range filter ─────────────────────────────────────── */
const MONTHS_SHORT = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MONTHS_FULL  = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_RANGE   = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i);

function SectionDateRangeFilter({ from, to, onFromChange, onToChange }) {
  const SEL = {
    padding: '7px 10px', borderRadius: 8, fontSize: 12,
    background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
    color: 'var(--color-pk-text)', cursor: 'pointer', outline: 'none',
  };
  const LBL = { fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-pk-muted)', flexShrink: 0 };

  const fromY = from ? from.split('-')[0] : '';
  const fromM = from ? from.split('-')[1] : '';
  const toY   = to   ? to.split('-')[0]   : '';
  const toM   = to   ? to.split('-')[1]   : '';

  const setFrom = (y, m) => onFromChange(y ? (m ? `${y}-${String(m).padStart(2,'0')}` : `${y}-01`) : '');
  const setTo   = (y, m) => onToChange(y   ? (m ? `${y}-${String(m).padStart(2,'0')}` : `${y}-12`) : '');

  const hasFilter = !!(from || to);

  const fromLabel = from ? `${MONTHS_SHORT[Number(fromM)-1] || ''} ${fromY}`.trim() : null;
  const toLabel   = to   ? `${MONTHS_SHORT[Number(toM)-1]   || ''} ${toY}`.trim()   : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--color-pk-border)',
      borderRadius: 12, padding: '12px 16px', marginBottom: 20,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    }}>
      <span style={{ ...LBL, color: 'var(--color-pk-subtle)' }}>Período:</span>

      {/* Desde */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={LBL}>Desde</span>
        <select aria-label="Año inicio" value={fromY} onChange={e => setFrom(e.target.value, fromM)} style={SEL}>
          <option value="">Año</option>
          {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Mes inicio" value={fromM} onChange={e => setFrom(fromY, e.target.value)} style={{ ...SEL, opacity: fromY ? 1 : 0.4 }} disabled={!fromY}>
          <option value="">Mes</option>
          {MONTHS_FULL.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
      </div>

      <span style={{ color: 'var(--color-pk-border)', fontSize: 16 }}>→</span>

      {/* Hasta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={LBL}>Hasta</span>
        <select aria-label="Año fin" value={toY} onChange={e => setTo(e.target.value, toM)} style={SEL}>
          <option value="">Año</option>
          {YEAR_RANGE.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select aria-label="Mes fin" value={toM} onChange={e => setTo(toY, e.target.value)} style={{ ...SEL, opacity: toY ? 1 : 0.4 }} disabled={!toY}>
          <option value="">Mes</option>
          {MONTHS_FULL.map((m, i) => <option key={i+1} value={String(i+1).padStart(2,'0')}>{m}</option>)}
        </select>
      </div>

      {hasFilter && (
        <>
          <span style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, background: 'rgba(104,144,240,0.12)', border: '1px solid rgba(104,144,240,0.3)', color: '#6890F0', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
            {fromLabel ?? '—'} → {toLabel ?? 'hoy'}
          </span>
          <button
            onClick={() => { onFromChange(''); onToChange(''); }}
            style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
          >
            × Limpiar
          </button>
        </>
      )}
    </div>
  );
}

/* ── Analysis shell ───────────────────────────────────────────────────────── */
function AnalysisSection({ section, users }) {
  const [from, setFrom] = useState('');
  const [to,   setTo]   = useState('');

  const item = ANALYSIS_NAV.find(n => n.id === section);
  if (!item) return null;

  const subtitles = {
    'analysis-users':       'Registros, retención, geografía, edad, engagement y comportamiento de usuarios',
    'analysis-pokemon':     'Pokémon más usados, win rates por tipo y análisis cruzado con simulaciones',
    'analysis-teams':       'Distribución por país, completitud, uso de IA y métricas por región',
    'analysis-simulations': 'Rendimiento Manual vs IA, throughput, latencia y win rates por tipo',
  };

  return (
    <div>
      <SectionHeader title={item.label} sub={subtitles[section]} accent={item.accent} />
      <SectionDateRangeFilter from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
      {section === 'analysis-users' && (
        <AdminUsersAnalytics users={users} from={from} to={to} />
      )}
      {section === 'analysis-pokemon' && (
        <div style={{ display: 'grid', gap: 16 }}>
          <AdminPokemonMostUsed from={from} to={to} />
          <AdminPokemonCrossAnalysis from={from} to={to} />
        </div>
      )}
      {section === 'analysis-teams' && (
        <AdminTeamsCrossAnalysis from={from} to={to} />
      )}
      {section === 'analysis-simulations' && (
        <AdminSimulationsAnalytics from={from} to={to} />
      )}
    </div>
  );
}

/* ── Main AdminPanel ──────────────────────────────────────────────────────── */
export default function AdminPanel({ onPreviewAsUser, initialSection = null }) {
  const { user: adminUser } = useAuth();

  const [users,           setUsers]           = useState([]);
  const [teams,           setTeams]           = useState([]);
  const [deleteTarget,    setDeleteTarget]     = useState(null);
  const [toggleAction,    setToggleAction]     = useState('deactivate');
  const [eraseTarget,     setEraseTarget]      = useState(null);
  const [createAdminOpen, setCreateAdminOpen]  = useState(false);
  const [section,         setSection]          = useState('dashboard');

  /* Map old section IDs to new ones */
  useEffect(() => {
    if (!initialSection) return;
    const map = { users: 'users', teams: 'analysis-teams', simulations: 'analysis-simulations', pokemon: 'analysis-pokemon' };
    setSection(map[initialSection] || initialSection);
  }, [initialSection]);

  /* Load users + teams */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([getUsers(), getAdminTeams()]);
        const list      = usersRes?.data?.users || [];
        const teamsList = teamsRes?.data?.teams  || [];
        const counts    = teamsList.reduce((acc, t) => {
          const uid = t.user_id || t.owner_id || t.created_by_user_id || t.userId || null;
          if (!uid) return acc;
          acc[uid] = (acc[uid] || 0) + 1;
          return acc;
        }, {});
        if (mounted) {
          setTeams(teamsList);
          setUsers(list.map(u => ({ ...u, teams: Number(u.teams ?? counts[u.id] ?? 0) })));
        }
      } catch {
        try {
          const res  = await getUsers();
          const list = res?.data?.users || [];
          if (mounted) setUsers(list.map(u => ({ ...u, teams: u.teams ?? 0 })));
        } catch { /* empty state */ }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleToggle = (u) => { setDeleteTarget(u); setToggleAction(u.is_active ? 'deactivate' : 'activate'); };
  const handleDelete = (u) => { setEraseTarget(u); };

  const handleConfirmToggle = async (password) => {
    const res     = await setUserActive(deleteTarget.id, toggleAction === 'activate', password);
    const updated = res?.data?.user;
    if (updated) {
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, is_active: updated.is_active } : u));
      setDeleteTarget(null);
    } else {
      throw new Error('USER_UPDATE_FAILED');
    }
  };

  const handleConfirmErase = async (password) => {
    await deleteUserPermanently(eraseTarget.id, password);
    setUsers(prev => prev.filter(u => u.id !== eraseTarget.id));
    setEraseTarget(null);
  };

  const handleCreateAdmin = async (data) => {
    const res     = await registerUser({ ...data });
    const created = res?.data?.user;
    if (created) {
      setUsers(p => [{ id: created.id, username: created.username, email: created.email, region_id: created.region_id, country_id: created.country_id, is_admin: created.is_admin, is_active: created.is_active, teams: 0, created_at: created.created_at }, ...p]);
    }
  };

  const isAnalysis = section.startsWith('analysis-');

  return (
    <>
      {/* ── Sidebar ── */}
      <Sidebar
        section={section}
        onSection={setSection}
        user={adminUser}
        onPreviewAsUser={onPreviewAsUser}
      />

      {/* ── Content ── */}
      <div style={{ marginLeft: SIDEBAR_W, minHeight: '100vh', padding: '32px 36px 60px', boxSizing: 'border-box' }}>
        {section === 'dashboard'  && <DashboardSection users={users} onSection={setSection} />}
        {section === 'users'      && <UsersSection users={users} adminUser={adminUser} onToggle={handleToggle} onDelete={handleDelete} onOpenCreateAdmin={() => setCreateAdminOpen(true)} />}
        {section === 'teams'      && <AdminTeamsView teams={teams} users={users} />}
        {isAnalysis               && <AnalysisSection section={section} users={users} />}
      </div>

      {/* ── Modals ── */}
      {deleteTarget && (
        <ConfirmModal
          title={toggleAction === 'activate' ? 'Activar usuario' : 'Desactivar usuario'}
          description={toggleAction === 'activate'
            ? <><strong>Activar</strong> la cuenta de <strong style={{ color: '#4ade80' }}>{deleteTarget.username}</strong>. El usuario podrá acceder nuevamente.</>
            : <><strong>Desactivar</strong> la cuenta de <strong style={{ color: '#fca5a5' }}>{deleteTarget.username}</strong>. Sus datos se conservan y puede reactivarse después.</>
          }
          confirmLabel={toggleAction === 'activate'
            ? <><FaCheckCircle aria-hidden="true" style={{ marginRight: 8 }} />Activar a {deleteTarget.username}</>
            : <><FaTimes       aria-hidden="true" style={{ marginRight: 8 }} />Desactivar a {deleteTarget.username}</>
          }
          requireTyping={deleteTarget.username}
          requirePassword={toggleAction === 'deactivate'}
          onConfirm={handleConfirmToggle}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {createAdminOpen && (
        <CreateAdminModal
          onClose={() => setCreateAdminOpen(false)}
          onCreate={handleCreateAdmin}
        />
      )}

      {eraseTarget && (
        <ConfirmModal
          title="Eliminar usuario permanentemente"
          description={
            <>
              <span style={{ display: 'block', marginBottom: 8, color: '#fca5a5', fontWeight: 700 }}>
                ⚠ Esta acción es irreversible y no puede deshacerse.
              </span>
              Se eliminará permanentemente la cuenta de{' '}
              <strong style={{ color: '#f87171' }}>{eraseTarget.username}</strong> y todos sus datos personales,
              conforme a la <strong>Ley N° 21.719</strong>. Sus equipos quedarán anónimos.
            </>
          }
          confirmLabel={<><FaTrash aria-hidden="true" style={{ marginRight: 8 }} />Eliminar permanentemente</>}
          requireTyping={eraseTarget.username}
          requirePassword
          onConfirm={handleConfirmErase}
          onClose={() => setEraseTarget(null)}
        />
      )}
    </>
  );
}
