// src/pages/AdminPanel.jsx
import { useState, useMemo, useEffect } from 'react';
import { FaCrown, FaExclamationTriangle, FaTimes, FaEye, FaEyeSlash, FaUsers, FaCheckCircle, FaTrophy, FaSearch, FaTrash, FaUser } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { REGIONS, COUNTRIES_BY_REGION } from '../utils/regions';
import { validators } from '../utils/validators';
import ConfirmModal from '../components/ConfirmModal';
import { getUsers, setUserActive, registerUser, getTeams } from '../services/api';
import AdminUsageByCountry from '../components/AdminUsageByCountry';
import AdminSimulationsAnalytics from '../components/AdminSimulationsAnalytics';

/* ── Mock data (replace with API calls when backend is ready) ───────────── */
const MOCK_USERS = [
  { id: 1,  username: 'AshKetchum',  email: 'ash@pallet.com',      region_id: 1, country_id: 12, is_admin: false, is_active: true,  teams: 6, created_at: '2026-01-15' },
  { id: 2,  username: 'MistyWater',  email: 'misty@cerulean.com',   region_id: 1, country_id: 4,  is_admin: false, is_active: true,  teams: 3, created_at: '2026-01-20' },
  { id: 3,  username: 'BrockStone',  email: 'brock@pewter.com',     region_id: 2, country_id: 22, is_admin: false, is_active: false, teams: 1, created_at: '2026-02-01' },
  { id: 4,  username: 'GaryOak',     email: 'gary@oak-lab.com',     region_id: 2, country_id: 22, is_admin: false, is_active: true,  teams: 9, created_at: '2026-02-10' },
  { id: 5,  username: 'SerenaK',     email: 'serena@kalos.fr',      region_id: 3, country_id: 35, is_admin: false, is_active: true,  teams: 4, created_at: '2026-02-18' },
  { id: 6,  username: 'CleaEU',      email: 'clea@europe.eu',       region_id: 3, country_id: 32, is_admin: true,  is_active: true,  teams: 7, created_at: '2026-03-01' },
  { id: 7,  username: 'RedChampion', email: 'red@mt-silver.jp',     region_id: 4, country_id: 61, is_admin: false, is_active: true,  teams: 12,created_at: '2026-03-05' },
  { id: 8,  username: 'BlueViridian',email: 'blue@viridian.jp',     region_id: 4, country_id: 61, is_admin: false, is_active: false, teams: 0, created_at: '2026-03-10' },
  { id: 9,  username: 'LillyeMoons', email: 'lillie@aether.com',    region_id: 4, country_id: 62, is_admin: false, is_active: true,  teams: 2, created_at: '2026-03-20' },
  { id: 10, username: 'DiancePRG',   email: 'diance@africa.co.za',  region_id: 5, country_id: 74, is_admin: false, is_active: true,  teams: 5, created_at: '2026-04-01' },
];

/* ── Helpers ───────────────────────────────────────────────────────────── */
const regionName  = (id) => REGIONS.find(r => r.id === id)?.name ?? '—';
const countryName = (rId, cId) => (COUNTRIES_BY_REGION[rId] ?? []).find(c => c.id === cId)?.name ?? '—';

/* ── Stat card ─────────────────────────────────────────────────────────── */
function StatCard({ label, value, icon, color }) {
  return (
    <div className="pk-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
      <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: `${color}18`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '26px', color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '2px' }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Create Admin Modal ─────────────────────────────────────────────────── */
function CreateAdminModal({ onClose, onCreate }) {
  const [form,    setForm]    = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors,  setErrors]  = useState({});
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [apiErr,  setApiErr]  = useState('');

  const set = (k, v) => { setForm(p => ({ ...p, [k]: v })); setErrors(p => ({ ...p, [k]: null })); setApiErr(''); };

  const inp = (err) => ({
    width: '100%', padding: '10px 13px', fontSize: '14px',
    background: 'var(--color-pk-surface)',
    border: `1px solid ${err ? '#ef4444' : 'var(--color-pk-border)'}`,
    borderRadius: '10px', color: 'var(--color-pk-text)',
    fontFamily: 'var(--font-body)', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  });
  const focusOn  = (e) => { e.target.style.borderColor = '#f59e0b'; e.target.style.boxShadow = '0 0 0 3px rgba(245,158,11,0.12)'; };
  const focusOff = (e, err) => { e.target.style.borderColor = err ? '#ef4444' : 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; };

  const handleCreate = async () => {
    const e = {};
    const eu = validators.username(form.username);                          if (eu) e.username = eu;
    const ee = validators.email(form.email);                                if (ee) e.email    = ee;
    const ep = validators.password(form.password);                          if (ep) e.password = ep;
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(6,12,24,0.88)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', animation: 'fadeIn .18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--color-pk-card)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '20px', padding: '28px', width: 'min(460px,100%)', display: 'flex', flexDirection: 'column', gap: '16px', animation: 'modalSlide .22s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '19px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--color-pk-yellow)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaCrown /> Crear Administrador
          </h2>
          <button onClick={onClose} style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: '8px', color: 'var(--color-pk-muted)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}><FaTimes /></button>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 13px', fontSize: '12px', color: '#fcd34d', lineHeight: 1.5, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <FaExclamationTriangle /> Solo un administrador puede crear otros administradores. Este usuario tendrá acceso total al panel de administración.
        </div>

        {apiErr && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '8px' }}><FaExclamationTriangle /> {apiErr}</div>}

        {[
          { key: 'username', label: 'Nombre de usuario', type: 'text',     placeholder: 'AdminUser',          maxLen: 50 },
          { key: 'email',    label: 'Correo electrónico',type: 'email',    placeholder: 'admin@example.com'           },
        ].map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLen} onChange={e => set(f.key, e.target.value)} style={inp(!!errors[f.key])} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} />
            {errors[f.key] && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors[f.key]}</span>}
          </div>
        ))}

        {[
          { key: 'password',        label: 'Contraseña' },
          { key: 'confirmPassword', label: 'Confirmar contraseña' },
        ].map((f, i) => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
            <div style={{ position: 'relative' }}>
              <input type={showPwd ? 'text' : 'password'} placeholder="••••••••" value={form[f.key]} onChange={e => set(f.key, e.target.value)} style={{ ...inp(!!errors[f.key]), paddingRight: '42px' }} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} />
              {i === 0 && <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: '15px' }}>{showPwd ? <FaEyeSlash /> : <FaEye />}</button>}
            </div>
            {errors[f.key] && <span style={{ fontSize: '11px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: 6 }}><FaExclamationTriangle /> {errors[f.key]}</span>}
          </div>
        ))}

        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button className="pk-btn pk-btn-secondary" onClick={onClose} style={{ flex: 1, justifyContent: 'center', padding: '12px' }}>Cancelar</button>
          <button onClick={handleCreate} disabled={loading} style={{
            flex: 2, padding: '12px', borderRadius: '10px', cursor: 'pointer', border: '1px solid rgba(245,158,11,0.4)',
            background: 'rgba(245,158,11,0.15)', color: 'var(--color-pk-yellow)',
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px',
            letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all .2s ease',
            opacity: loading ? .7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.25)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.15)'; }}
          >
            {loading ? 'Creando...' : (<><FaCrown /> Crear Admin</>)}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes modalSlide{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────────── */
export default function AdminPanel({ onPreviewAsUser, initialSection = null }) {
  const { user: adminUser } = useAuth();
  const [users,      setUsers]      = useState([]);
  const [search,     setSearch]     = useState('');
  const [filterReg,  setFilterReg]  = useState('');
  const [filterRole, setFilterRole] = useState(''); // '' | 'admin' | 'user'
  const [filterAct,  setFilterAct]  = useState(''); // '' | 'active' | 'inactive'
  const [sortBy,     setSortBy]     = useState('created_at');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [toggleAction, setToggleAction] = useState('deactivate');
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [section, setSection] = useState(initialSection || 'users');

  /* ── Derived stats ── */
  const totalUsers   = users.length;
  const activeUsers  = users.filter(u => u.is_active).length;
  const adminCount   = users.filter(u => u.is_admin).length;
  const totalTeams   = users.reduce((a, u) => a + u.teams, 0);

  /* ── Filtered + sorted list ── */
  const filtered = useMemo(() => {
    return users
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
        if (sortBy === 'username')    return a.username.localeCompare(b.username);
        if (sortBy === 'teams')       return b.teams - a.teams;
        if (sortBy === 'created_at')  return new Date(b.created_at) - new Date(a.created_at);
        return 0;
      });
  }, [users, search, filterReg, filterRole, filterAct, sortBy]);

  /* ── Delete user ── */
  const handleDelete = async (password) => {
    try {
      const desiredActive = toggleAction === 'activate';
      const res = await setUserActive(deleteTarget.id, desiredActive, password);
      const updated = res?.data?.user;
      if (updated) {
        setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, is_active: updated.is_active } : u));
        // close modal only on success
        setDeleteTarget(null);
      } else {
        // unexpected: keep modal open and surface error
        throw new Error('USER_UPDATE_FAILED');
      }
    } catch (e) {
      console.error('Failed to toggle user active state', e.message);
      // rethrow so ConfirmModal receives the error and displays message to user
      throw e;
    }
  };

  /* ── Create admin ── */
  const handleCreateAdmin = async (data) => {
    try {
      const res = await registerUser({ ...data });
      const created = res?.data?.user;
      if (created) {
        // Add minimal fields expected by table
        const newAdmin = { id: created.id, username: created.username, email: created.email, region_id: created.region_id, country_id: created.country_id, is_admin: created.is_admin, is_active: created.is_active, teams: 0, created_at: created.created_at };
        setUsers(p => [newAdmin, ...p]);
      }
    } catch (e) {
      console.error('Failed create admin', e.message);
      throw e;
    }
  };

  /* ── Load users on mount ── */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [usersRes, teamsRes] = await Promise.all([getUsers(), getTeams()]);
        const list = usersRes?.data?.users || [];
        const teamsList = teamsRes?.data?.teams || [];
        // build a map userId -> teamsCount
        const counts = teamsList.reduce((acc, t) => {
          const uid = t.user_id || t.owner_id || t.created_by_user_id || t.userId || null;
          // prefer explicit user_id field; fallback to owner or created_by variants
          if (!uid) return acc;
          acc[uid] = (acc[uid] || 0) + 1;
          return acc;
        }, {});
        if (mounted) setUsers(list.map(u => ({ ...u, teams: Number(u.teams ?? counts[u.id] ?? 0) })));
      } catch (e) {
        console.error('Failed to load users or teams', e.message);
        // fallback to whatever users endpoint returned or mock
        try {
          const res = await getUsers();
          const list = res?.data?.users || [];
          if (mounted) setUsers(list.map(u => ({ ...u, teams: u.teams ?? 0 })));
        } catch (err) {
          setUsers(MOCK_USERS);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If initialSection prop changes (via navigation), update local section
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  const selStyle = {
    background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
    borderRadius: '8px', color: 'var(--color-pk-text)', fontFamily: 'var(--font-body)',
    fontSize: '13px', padding: '8px 10px', outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '28px 24px 60px' }}>

      {/* ── Header ── */}
      <div className="fade-up fade-up-1" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(22px,4vw,34px)', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0 }}>
              Panel de <span style={{ color: 'var(--color-pk-yellow)' }}>Administración</span>
            </h1>
            <div style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '6px', padding: '3px 9px', fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-yellow)' }}>
              ADMIN
            </div>
          </div>
          <p style={{ color: 'var(--color-pk-muted)', fontSize: '13px', margin: 0 }}>
            Sesión como <strong style={{ color: 'var(--color-pk-subtle)' }}>{adminUser?.username}</strong>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* Preview as user */}
          <button
            onClick={onPreviewAsUser}
            style={{
              padding: '9px 18px', borderRadius: '10px', cursor: 'pointer', border: '1px solid var(--color-pk-border-light)',
              background: 'var(--color-pk-card)', color: 'var(--color-pk-subtle)',
              fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '13px',
              letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all .15s ease',
              display: 'flex', alignItems: 'center', gap: '7px',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-pk-blue)'; e.currentTarget.style.color = 'var(--color-pk-blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-pk-border-light)'; e.currentTarget.style.color = 'var(--color-pk-subtle)'; }}
          >
            <FaEye style={{ marginRight: 8 }} /> Vista de usuario
          </button>
          {/* Create admin */}
          <button
            onClick={() => setCreateAdminOpen(true)}
            style={{
              padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
              border: '1px solid rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)',
              color: 'var(--color-pk-yellow)', fontFamily: 'var(--font-heading)', fontWeight: 700,
              fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'all .15s ease', display: 'flex', alignItems: 'center', gap: '7px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.1)'; }}
          >
            <FaCrown /> Crear Admin
          </button>
        </div>
      </div>

      {/* Admin performance metrics */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          {/* Performance tab removed */}
          <button onClick={() => setSection('users')} style={{ padding: '8px 12px', borderRadius: 8, background: section === 'users' ? 'rgba(16,185,129,0.08)' : 'var(--color-pk-card)', border: section === 'users' ? '1px solid rgba(16,185,129,0.18)' : '1px solid var(--color-pk-border)', cursor: 'pointer' }}>Usuarios</button>
          <button onClick={() => setSection('teams')} style={{ padding: '8px 12px', borderRadius: 8, background: section === 'teams' ? 'rgba(245,158,11,0.08)' : 'var(--color-pk-card)', border: section === 'teams' ? '1px solid rgba(245,158,11,0.18)' : '1px solid var(--color-pk-border)', cursor: 'pointer' }}>Equipos</button>
          <button onClick={() => setSection('simulations')} style={{ padding: '8px 12px', borderRadius: 8, background: section === 'simulations' ? 'rgba(220,38,38,0.06)' : 'var(--color-pk-card)', border: section === 'simulations' ? '1px solid rgba(220,38,38,0.14)' : '1px solid var(--color-pk-border)', cursor: 'pointer' }}>Simulaciones</button>
        </div>

        <div className="fade-up fade-up-2">
          {/* Performance section removed */}
          {section === 'users' && (
            <div className="pk-card fade-up fade-up-3" style={{ padding: '20px' }}>
              {/* Reuse existing Users table below by moving its JSX here */}
              <div style={{ marginBottom: 8 }}> (Users management)</div>
            </div>
          )}
          {section === 'teams' && (
            <div className="fade-up fade-up-3">
              <AdminUsageByCountry />
            </div>
          )}
          {section === 'simulations' && (
            <div className="fade-up fade-up-3">
              <AdminSimulationsAnalytics />
            </div>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="Usuarios totales" value={totalUsers}  icon={<FaUsers />} color="var(--color-pk-blue)"   />
        <StatCard label="Activos"          value={activeUsers} icon={<FaCheckCircle />} color="#22c55e"                />
        <StatCard label="Admins"           value={adminCount}  icon={<FaCrown />} color="var(--color-pk-yellow)" />
        <StatCard label="Equipos creados"  value={totalTeams}  icon={<FaTrophy />} color="var(--color-pk-red)"    />
      </div>

      {/* ── Users table card ── */}
      {section === 'users' && (
        <div className="pk-card fade-up fade-up-3" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Gestión de Usuarios <span style={{ color: 'var(--color-pk-muted)', fontWeight: 400, fontSize: '13px' }}>({filtered.length})</span>
          </h2>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 200px' }}>
            <input
              type="text"
              placeholder="Buscar usuario o email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ ...selStyle, width: '100%', padding: '9px 13px 9px 36px', fontSize: '13px', borderRadius: '10px' }}
            />
            <FaSearch style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pk-muted)' }} />
          </div>
          <select value={filterReg}  onChange={e => setFilterReg(e.target.value)}  style={selStyle}>
            <option value="">Todas las regiones</option>
            {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <select value={filterRole} onChange={e => setFilterRole(e.target.value)} style={selStyle}>
            <option value="">Todos los roles</option>
            <option value="admin">Solo admins</option>
            <option value="user">Solo usuarios</option>
          </select>
          <select value={filterAct}  onChange={e => setFilterAct(e.target.value)}  style={selStyle}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
            <option value="created_at">Más recientes</option>
            <option value="username">Nombre A-Z</option>
            <option value="teams">Más equipos</option>
          </select>
        </div>

        {/* Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Usuario', 'Correo', 'Región / País', 'Equipos', 'Estado', 'Rol', 'Registro', 'Acción'].map(h => (
                  <th key={h} style={{
                    textAlign: 'left', padding: '10px 12px',
                    fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                    letterSpacing: '0.1em', textTransform: 'uppercase',
                    color: 'var(--color-pk-muted)', borderBottom: '1px solid var(--color-pk-border)',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--color-pk-muted)', fontSize: '13px' }}>No se encontraron usuarios</td></tr>
              ) : filtered.map((u, i) => (
                <tr key={u.id} style={{
                  borderBottom: '1px solid var(--color-pk-border)',
                  transition: 'background .12s ease',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {/* Username */}
                  <td style={{ padding: '12px 12px', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: u.is_admin
                          ? 'linear-gradient(135deg, #f59e0b, #dc2626)'
                          : 'linear-gradient(135deg, var(--color-pk-red), var(--color-pk-blue))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-heading)',
                      }}>
                        {u.username.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {u.username}
                        {u.id === adminUser?.id && <span style={{ fontSize: '10px', color: 'var(--color-pk-muted)', marginLeft: '5px' }}>(tú)</span>}
                      </span>
                    </div>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', color: 'var(--color-pk-subtle)', whiteSpace: 'nowrap' }}>{u.email}</td>
                  {/* Region/Country */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', color: 'var(--color-pk-subtle)' }}>
                    <div>{regionName(u.region_id)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>{countryName(u.region_id, u.country_id)}</div>
                  </td>
                  {/* Teams */}
                  <td style={{ padding: '12px 12px', fontSize: '13px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-pk-text)', textAlign: 'center' }}>{u.teams}</td>
                  {/* Status */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: u.is_active ? 'rgba(34,197,94,0.1)'  : 'rgba(239,68,68,0.1)',
                      border:     u.is_active ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
                      color:      u.is_active ? '#4ade80'               : '#fca5a5',
                      borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>
                      {u.is_active ? '● Activo' : '○ Inactivo'}
                    </span>
                  </td>
                  {/* Role */}
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{
                      fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      background: u.is_admin ? 'rgba(245,158,11,0.1)'  : 'rgba(59,130,246,0.08)',
                      border:     u.is_admin ? '1px solid rgba(245,158,11,0.3)' : '1px solid rgba(59,130,246,0.2)',
                      color:      u.is_admin ? 'var(--color-pk-yellow)' : 'var(--color-pk-blue)',
                      borderRadius: '20px', padding: '3px 10px', whiteSpace: 'nowrap',
                    }}>
                      {u.is_admin ? (<><FaCrown style={{ marginRight: 6 }} /> Admin</>) : (<><FaUser style={{ marginRight: 6 }} /> Usuario</>)}
                    </span>
                  </td>
                  {/* Created */}
                  <td style={{ padding: '12px 12px', fontSize: '12px', color: 'var(--color-pk-muted)', whiteSpace: 'nowrap' }}>
                    {new Date(u.created_at).toLocaleDateString('es-CL')}
                  </td>
                  {/* Action */}
                  <td style={{ padding: '12px 12px' }}>
                    {u.id !== adminUser?.id ? (
                      <button
                        onClick={() => { setDeleteTarget(u); setToggleAction(u.is_active ? 'deactivate' : 'activate'); }}
                        style={{
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          borderRadius: '7px', color: '#fca5a5', cursor: 'pointer',
                          padding: '6px 12px', fontSize: '11px',
                          fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.05em',
                          transition: 'all .15s ease', whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#fca5a5'; }}
                      >
                        {u.is_active ? (<><FaTimes style={{ marginRight: 8 }} /> Desactivar</>) : (<><FaCheckCircle style={{ marginRight: 8 }} /> Activar</>)}
                      </button>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <ConfirmModal
          title={toggleAction === 'activate' ? 'Activar usuario' : 'Desactivar usuario'}
          description={
            toggleAction === 'activate' ? (
              <>
                Estás a punto de <strong>activar</strong> la cuenta de{' '}
                <strong style={{ color: '#4ade80' }}>{deleteTarget.username}</strong>. Esto permitirá que el usuario acceda nuevamente a la plataforma.
              </>
            ) : (
              <>
                Estás a punto de <strong>desactivar</strong> la cuenta de{' '}
                <strong style={{ color: '#fca5a5' }}>{deleteTarget.username}</strong>.
                Esta acción deshabilita el acceso del usuario, pero conserva sus datos y equipos.
                Puedes reactivar la cuenta más tarde desde este panel.
              </>
            )
          }
          confirmLabel={toggleAction === 'activate' ? (<><FaCheckCircle style={{ marginRight: 8 }} />Activar a {deleteTarget.username}</>) : (<><FaTimes style={{ marginRight: 8 }} />Desactivar a {deleteTarget.username}</>)}
          requireTyping={deleteTarget.username}
          requirePassword={toggleAction === 'deactivate'}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
        />
      )}

      {/* ── Create admin modal ── */}
      {createAdminOpen && (
        <CreateAdminModal
          onClose={() => setCreateAdminOpen(false)}
          onCreate={handleCreateAdmin}
        />
      )}
    </div>
  );
}
