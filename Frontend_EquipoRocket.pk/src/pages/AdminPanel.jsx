// src/pages/AdminPanel.jsx
import { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { REGIONS, COUNTRIES_BY_REGION } from '../utils/regions';
import { validators } from '../utils/validators';
import ConfirmModal from '../components/ConfirmModal';

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
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '19px', letterSpacing: '0.06em', textTransform: 'uppercase', margin: 0, color: 'var(--color-pk-yellow)' }}>
            👑 Crear Administrador
          </h2>
          <button onClick={onClose} style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: '8px', color: 'var(--color-pk-muted)', cursor: 'pointer', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px' }}>✕</button>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '10px 13px', fontSize: '12px', color: '#fcd34d', lineHeight: 1.5 }}>
          ⚠️ Solo un administrador puede crear otros administradores. Este usuario tendrá acceso total al panel de administración.
        </div>

        {apiErr && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px', padding: '9px 12px', fontSize: '12px', color: '#fca5a5' }}>⚠ {apiErr}</div>}

        {[
          { key: 'username', label: 'Nombre de usuario', type: 'text',     placeholder: 'AdminUser',          maxLen: 50 },
          { key: 'email',    label: 'Correo electrónico',type: 'email',    placeholder: 'admin@example.com'           },
        ].map(f => (
          <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <label style={{ fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: errors[f.key] ? '#ef4444' : 'var(--color-pk-subtle)' }}>{f.label}</label>
            <input type={f.type} placeholder={f.placeholder} value={form[f.key]} maxLength={f.maxLen} onChange={e => set(f.key, e.target.value)} style={inp(!!errors[f.key])} onFocus={focusOn} onBlur={e => focusOff(e, !!errors[f.key])} />
            {errors[f.key] && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠ {errors[f.key]}</span>}
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
              {i === 0 && <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: '15px' }}>{showPwd ? '🙈' : '👁'}</button>}
            </div>
            {errors[f.key] && <span style={{ fontSize: '11px', color: '#ef4444' }}>⚠ {errors[f.key]}</span>}
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
            {loading ? 'Creando...' : '👑 Crear Admin'}
          </button>
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes modalSlide{from{opacity:0;transform:scale(.95) translateY(8px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>
    </div>
  );
}

/* ── Main Panel ─────────────────────────────────────────────────────────── */
export default function AdminPanel({ onPreviewAsUser }) {
  const { user: adminUser } = useAuth();
  const [users,      setUsers]      = useState(MOCK_USERS);
  const [search,     setSearch]     = useState('');
  const [filterReg,  setFilterReg]  = useState('');
  const [filterRole, setFilterRole] = useState(''); // '' | 'admin' | 'user'
  const [filterAct,  setFilterAct]  = useState(''); // '' | 'active' | 'inactive'
  const [sortBy,     setSortBy]     = useState('created_at');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);

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
    // TODO: call deleteUser(deleteTarget.id, password) API
    await new Promise(r => setTimeout(r, 700));
    setUsers(p => p.filter(u => u.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  /* ── Create admin ── */
  const handleCreateAdmin = async (data) => {
    // TODO: call createAdmin(data) API
    await new Promise(r => setTimeout(r, 700));
    const newAdmin = { id: Date.now(), ...data, region_id: null, country_id: null, is_active: true, teams: 0, created_at: new Date().toISOString().split('T')[0] };
    setUsers(p => [newAdmin, ...p]);
  };

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
            👁 Vista de usuario
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
            👑 Crear Admin
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <StatCard label="Usuarios totales" value={totalUsers}  icon="👥" color="var(--color-pk-blue)"   />
        <StatCard label="Activos"          value={activeUsers} icon="✅" color="#22c55e"                />
        <StatCard label="Admins"           value={adminCount}  icon="👑" color="var(--color-pk-yellow)" />
        <StatCard label="Equipos creados"  value={totalTeams}  icon="⚔️" color="var(--color-pk-red)"    />
      </div>

      {/* ── Users table card ── */}
      <div className="pk-card fade-up fade-up-3" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
            Gestión de Usuarios <span style={{ color: 'var(--color-pk-muted)', fontWeight: 400, fontSize: '13px' }}>({filtered.length})</span>
          </h2>
        </div>

        {/* Filters bar */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="🔍 Buscar usuario o email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selStyle, flex: '1 1 200px', padding: '9px 13px', fontSize: '13px', borderRadius: '10px' }}
          />
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
                      {u.is_admin ? '👑 Admin' : '👤 Usuario'}
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
                        onClick={() => setDeleteTarget(u)}
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
                        🗑 Eliminar
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

      {/* ── Delete confirm modal ── */}
      {deleteTarget && (
        <ConfirmModal
          title="Eliminar usuario"
          description={
            <>
              Estás a punto de eliminar permanentemente la cuenta de{' '}
              <strong style={{ color: '#fca5a5' }}>{deleteTarget.username}</strong>.
              Esta acción <strong>no se puede deshacer</strong> y eliminará también todos sus equipos ({deleteTarget.teams}).
            </>
          }
          confirmLabel={`🗑 Eliminar a ${deleteTarget.username}`}
          requireTyping={deleteTarget.username}
          requirePassword={true}
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
