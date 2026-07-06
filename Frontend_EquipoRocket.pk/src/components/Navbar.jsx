// src/components/Navbar.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaLayerGroup, FaWrench, FaBook, FaTrophy, FaUser, FaCog, FaDoorOpen, FaEye, FaTimes, FaBolt, FaUserPlus, FaPlus, FaCrown, FaVial, FaChartBar, FaBars } from 'react-icons/fa';
import logo from '../assets/logo.png';
import { getDataStatus } from '../services/api';

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function parseMetaDate(sourceUrl) {
  if (!sourceUrl) return null;
  const m = sourceUrl.match(/\/(\d{4})-(\d{2})\//);
  if (!m) return null;
  const [, y, mo] = m;
  return `${MONTHS_ES[parseInt(mo, 10) - 1]} ${y}`;
}

export function DataStatusChip() {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    getDataStatus().then(s => setStatus(s));
  }, []);

  if (!status?.loaded) return null;

  const metaDate = parseMetaDate(status.source_url);
  const loadedAt = status.fetched_at
    ? new Date(status.fetched_at).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null;

  return (
    <div style={{
      position: 'fixed', top: 12, right: 16, zIndex: 999,
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(10px)',
      border: '1px solid rgba(104,144,240,0.25)',
      borderRadius: 20, padding: '5px 12px',
      fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700,
      letterSpacing: '0.06em', textTransform: 'uppercase',
      color: 'var(--color-pk-blue)', whiteSpace: 'nowrap',
      boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
      VGC{metaDate ? ` · ${metaDate}` : ''}
      {loadedAt && <span style={{ color: 'var(--color-pk-muted)', fontWeight: 500, marginLeft: 2 }}>· {loadedAt}</span>}
    </div>
  );
}

const NAV_LINKS = [
  { id: 'teams',     path: '/equipos', label: 'Mis Equipos', icon: <FaLayerGroup /> },
  { id: 'mypokemon', path: '/mis-pokemon', label: 'Mis Pokémon', icon: <FaBolt /> },
  { id: 'sim',       path: '/simulaciones', label: 'Simulaciones', icon: <FaVial /> },
  { id: 'builder',   path: '/constructor', label: 'Constructor', icon: <FaWrench /> },
  { id: 'admin', path: '/admin', label: 'Analytics',    icon: <FaChartBar />, admin: true },
];

function NavBtn({ link, active, onNavigate }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => {
        navigate(link.path);
        onNavigate?.();
      }}
      style={{
        background: active ? 'rgba(220,38,38,0.12)' : 'none',
        border: active ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
        borderRadius: '8px', color: active ? 'var(--color-pk-red-light)' : 'var(--color-pk-subtle)',
        cursor: 'pointer', padding: '8px 14px', fontFamily: 'var(--font-heading)',
        fontWeight: 600, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
        transition: 'all .15s ease', display: 'flex', alignItems: 'center', gap: '5px',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.color='var(--color-pk-text)'; e.currentTarget.style.background='rgba(255,255,255,0.04)'; }}}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.color='var(--color-pk-subtle)'; e.currentTarget.style.background='none'; }}}
    >
      <span style={{ fontSize: '12px' }}>{link.icon}</span> {link.label}
    </button>
  );
}

function DropItem({ icon, label, onClick, danger, accent }) {
  return (
    <button onClick={onClick} style={{
      width:'100%', display:'flex', alignItems:'center', gap:'9px',
      background:'none', border:'none', borderRadius:'8px', padding:'9px 12px',
      cursor:'pointer', textAlign:'left',
      color: danger ? '#fca5a5' : accent ?? 'var(--color-pk-subtle)',
      fontFamily:'var(--font-body)', fontSize:'13px', fontWeight:500, transition:'all .12s ease',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = danger ? '#ef4444' : accent ?? 'var(--color-pk-text)'; }}
      onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color = danger ? '#fca5a5' : accent ?? 'var(--color-pk-subtle)'; }}
    >
      <span style={{ fontSize:'14px' }}>{icon}</span> {label}
    </button>
  );
}

function ProfileDropdown({ user, onLogout, isPreview, isMobile=false }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const initials = user?.username?.slice(0,2).toUpperCase() ?? 'PK';
  const isAdmin  = user?.is_admin && !isPreview;

  if (isMobile) {
    return (
      <div style={{ width: '100%' }}>
        <DropItem icon={<FaUser />} label="Mi Perfil" onClick={() => { navigate('/perfil'); }} />
        {user?.is_admin && !isPreview && (
          <DropItem icon={<FaCog />} label="Panel Admin" onClick={() => { navigate('/admin'); }} accent="var(--color-pk-yellow)" />
        )}
        <div style={{ margin:'5px 6px', borderTop:'1px solid var(--color-pk-border)' }} />
        <DropItem icon={<FaDoorOpen />} label="Cerrar sesión" onClick={() => { onLogout(); navigate('/'); }} danger />
      </div>
    );
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(p => !p)} style={{
        display:'flex', alignItems:'center', gap:'8px',
        background: open ? 'var(--color-pk-card)' : 'var(--color-pk-surface)',
        border:`1px solid ${open ? 'var(--color-pk-border-light)' : 'var(--color-pk-border)'}`,
        borderRadius:'10px', cursor:'pointer', padding:'5px 10px 5px 5px', transition:'all .15s ease',
      }}
        onMouseEnter={e => { e.currentTarget.style.borderColor='var(--color-pk-border-light)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor='var(--color-pk-border)'; }}
      >
        <div style={{
          width:'30px', height:'30px', borderRadius:'50%', flexShrink:0,
          background: isAdmin ? 'linear-gradient(135deg,#f59e0b,#dc2626)' : 'linear-gradient(135deg,var(--color-pk-red),var(--color-pk-blue))',
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:'11px', fontWeight:700, color:'#fff', fontFamily:'var(--font-heading)',
          border: isAdmin ? '2px solid rgba(245,158,11,0.5)' : '2px solid var(--color-pk-border-light)',
        }}>{initials}</div>
        <div style={{ textAlign:'left', lineHeight:1.2 }}>
          <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'12px', color:'var(--color-pk-text)', maxWidth:'100px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.username}</div>
          <div style={{ fontSize:'9px', fontFamily:'var(--font-heading)', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', color: isAdmin ? 'var(--color-pk-yellow)' : isPreview ? 'var(--color-pk-blue)' : 'var(--color-pk-muted)' }}>
            {isAdmin ? (<><FaCrown style={{ marginRight: 6 }} /> Admin</>) : isPreview ? (<><FaEye style={{ marginRight: 6 }} /> Vista previa</>) : (<><FaUser style={{ marginRight: 6 }} /> Usuario</>)}
          </div>
        </div>
        <span style={{ fontSize:'10px', color:'var(--color-pk-muted)', transition:'transform .15s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 8px)', right:0,
          background:'var(--color-pk-card)', border:'1px solid var(--color-pk-border-light)',
          borderRadius:'12px', padding:'6px', minWidth:'180px', zIndex:50,
          boxShadow:'0 8px 32px rgba(0,0,0,0.4)', animation:'dropDown .15s ease',
        }}>
          <DropItem icon={<FaUser />} label="Mi Perfil" onClick={() => { navigate('/perfil'); setOpen(false); }} />
          {user?.is_admin && !isPreview && (
            <DropItem icon={<FaCog />} label="Panel Admin" onClick={() => { navigate('/admin'); setOpen(false); }} accent="var(--color-pk-yellow)" />
          )}
          <div style={{ margin:'5px 6px', borderTop:'1px solid var(--color-pk-border)' }} />
          <DropItem icon={<FaDoorOpen />} label="Cerrar sesión" onClick={() => { onLogout(); navigate('/'); setOpen(false); }} danger />
        </div>
      )}
      <style>{`@keyframes dropDown { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }`}</style>
    </div>
  );
}

export default function Navbar({ currentPage, user, onLogout, isPreview=false, onExitPreview, onLoginClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when navigation happens
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      {isPreview && (
        <div style={{ background:'rgba(59,130,246,0.1)', borderBottom:'1px solid rgba(59,130,246,0.25)', padding:'7px 16px', display:'flex', alignItems:'center', justifyContent:'center', gap:'12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize:'12px', color:'var(--color-pk-blue)', fontFamily:'var(--font-heading)', fontWeight:600, letterSpacing:'0.05em', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaEye /> MODO VISTA PREVIA
          </span>
          <button onClick={onExitPreview} style={{ background:'rgba(59,130,246,0.2)', border:'1px solid rgba(59,130,246,0.4)', borderRadius:'6px', color:'var(--color-pk-blue)', cursor:'pointer', padding:'3px 12px', fontSize:'11px', fontFamily:'var(--font-heading)', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', display:'flex', alignItems:'center', gap:8 }}>
            Salir <FaTimes />
          </button>
        </div>
      )}
      <nav style={{ position:'sticky', top:0, zIndex:40, background:'rgba(6,12,24,0.88)', backdropFilter:'blur(16px)', borderBottom:`1px solid ${isPreview ? 'rgba(59,130,246,0.2)' : 'var(--color-pk-border)'}` }}>
        <div style={{ maxWidth:'1440px', margin:'0 auto', padding:'0 16px', minHeight:'60px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap: 'wrap' }}>
          
          {/* Logo */}
          <button onClick={() => navigate('/')} style={{ display:'flex', alignItems:'center', gap:'10px', background:'none', border:'none', cursor:'pointer', padding:0, flexShrink:0 }}>
            <img src={logo} alt='EquipoRocket' style={{ width:'34px', height:'34px', flexShrink:0 }} />
            <div style={{ lineHeight:1, display: 'none' }} className="logo-name">
              <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'17px', letterSpacing:'0.08em', color:'var(--color-pk-text)', textTransform:'uppercase' }}>Equipo<span style={{ color:'var(--color-pk-red)' }}>Rocket</span></div>
              <div style={{ fontSize:'8px', color:'var(--color-pk-muted)', letterSpacing:'0.2em', textTransform:'uppercase' }}>Pokémon Champions</div>
            </div>
            <style>{`
              @media (min-width: 768px) {
                .logo-name {
                  display: block !important;
                }
              }
            `}</style>
          </button>

          {/* Desktop Navigation */}
          <div className="navbar-desktop" style={{ display:'flex', alignItems:'center', gap:'2px', flex:1, justifyContent:'center', minWidth: 0 }}>
            {NAV_LINKS
              .filter(link => !link.admin || (user && user.is_admin))
              .map(link => {
                const isActive = location.pathname === link.path || (link.path === '/admin' && location.pathname.startsWith('/admin'));
                return <NavBtn key={link.id} link={link} active={isActive} onNavigate={() => setMobileMenuOpen(false)} />
              })}
          </div>

          {/* Desktop Right Actions */}
          <div className="navbar-desktop" style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0 }}>
            <button onClick={() => navigate('/constructor')} className="pk-btn pk-btn-primary" style={{ padding:'7px 16px', fontSize:'12px', display:'flex', alignItems:'center', gap:8 }}><FaPlus /> Nuevo Equipo</button>
            {user
              ? <ProfileDropdown user={user} onLogout={onLogout} isPreview={isPreview} />
              : <div style={{ display:'flex', gap:'8px' }}>
                  <button onClick={onLoginClick} className="pk-btn pk-btn-secondary" style={{ padding:'7px 14px', fontSize:'12px', display:'flex', gap:8, alignItems:'center' }}><FaBolt /> Iniciar</button>
                  <button onClick={onLoginClick} className="pk-btn pk-btn-primary"   style={{ padding:'7px 14px', fontSize:'12px', display:'flex', gap:8, alignItems:'center' }}><FaUserPlus /> Registrarse</button>
                </div>
            }
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="navbar-mobile"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{ 
              background: mobileMenuOpen ? 'rgba(220,38,38,0.12)' : 'none',
              border: mobileMenuOpen ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
              borderRadius: '8px',
              color: mobileMenuOpen ? 'var(--color-pk-red-light)' : 'var(--color-pk-subtle)',
              cursor: 'pointer',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              fontSize: '18px',
              transition: 'all 0.15s ease',
            }}
          >
            {mobileMenuOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="navbar-mobile" style={{ 
            background: 'var(--color-pk-surface)',
            borderTop: '1px solid var(--color-pk-border)',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}>
            {NAV_LINKS
              .filter(link => !link.admin || (user && user.is_admin))
              .map(link => {
                const isActive = location.pathname === link.path || (link.path === '/admin' && location.pathname.startsWith('/admin'));
                return (
                  <button
                    key={link.id}
                    onClick={() => {
                      navigate(link.path);
                      setMobileMenuOpen(false);
                    }}
                    style={{
                      width: '100%',
                      background: isActive ? 'rgba(220,38,38,0.12)' : 'none',
                      border: isActive ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
                      borderRadius: '8px',
                      color: isActive ? 'var(--color-pk-red-light)' : 'var(--color-pk-subtle)',
                      cursor: 'pointer',
                      padding: '10px 12px',
                      fontFamily: 'var(--font-heading)',
                      fontWeight: 600,
                      fontSize: '13px',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '14px' }}>{link.icon}</span> {link.label}
                  </button>
                );
              })}
            <div style={{ margin:'8px 0', borderTop:'1px solid var(--color-pk-border)' }} />
            <button 
              onClick={() => {
                navigate('/constructor');
                setMobileMenuOpen(false);
              }}
              className="pk-btn pk-btn-primary" 
              style={{ width: '100%', padding:'10px 12px', fontSize:'12px', display:'flex', alignItems:'center', gap:8, justifyContent: 'center' }}
            >
              <FaPlus /> Nuevo Equipo
            </button>
            {user
              ? <ProfileDropdown user={user} onLogout={onLogout} isPreview={isPreview} isMobile={true} />
              : <div style={{ display:'flex', gap:'8px', flexDirection: 'column' }}>
                  <button onClick={onLoginClick} className="pk-btn pk-btn-secondary" style={{ width: '100%', padding:'10px 12px', fontSize:'12px', display:'flex', gap:8, alignItems:'center', justifyContent: 'center' }}><FaBolt /> Iniciar Sesión</button>
                  <button onClick={onLoginClick} className="pk-btn pk-btn-primary" style={{ width: '100%', padding:'10px 12px', fontSize:'12px', display:'flex', gap:8, alignItems:'center', justifyContent: 'center' }}><FaUserPlus /> Registrarse</button>
                </div>
            }
          </div>
        )}
      </nav>
    </>
  );
}

// Note: Navbar already exported above. The guest buttons are handled via
// the onLoginClick prop when user is null — see App.jsx usage.