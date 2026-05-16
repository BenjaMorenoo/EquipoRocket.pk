// src/components/Navbar.jsx
import { useState } from 'react';

const NAV_LINKS = [
  { id: 'teams',   label: 'Mis Equipos',  icon: '⚔️' },
  { id: 'builder', label: 'Constructor',  icon: '🔧' },
  { id: 'dex',     label: 'Pokédex',      icon: '📖' },
  { id: 'ranking', label: 'Rankings',     icon: '🏆' },
];

export default function Navbar({ currentPage, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      background: 'rgba(6, 12, 24, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--color-pk-border)',
    }}>
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: '0 24px',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '24px',
      }}>

        {/* Logo */}
        <button
          onClick={() => onNavigate('teams')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {/* Pokeball Icon */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'conic-gradient(var(--color-pk-red) 0deg 180deg, white 180deg 360deg)',
            border: '2px solid var(--color-pk-border-light)',
            position: 'relative',
            flexShrink: 0,
          }}>
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: 'var(--color-pk-surface)',
              border: '2px solid var(--color-pk-border-light)',
            }} />
          </div>

          <div style={{ lineHeight: 1 }}>
            <div style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '18px',
              letterSpacing: '0.08em',
              color: 'var(--color-pk-text)',
              textTransform: 'uppercase',
            }}>
              Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>
            </div>
            <div style={{
              fontSize: '9px',
              color: 'var(--color-pk-muted)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              Pokemon Champions
            </div>
          </div>
        </button>

        {/* Desktop nav links */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          justifyContent: 'center',
        }}
          className="hidden md:flex"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => onNavigate(link.id)}
              style={{
                background: currentPage === link.id
                  ? 'rgba(220, 38, 38, 0.12)'
                  : 'none',
                border: currentPage === link.id
                  ? '1px solid rgba(220, 38, 38, 0.3)'
                  : '1px solid transparent',
                borderRadius: '8px',
                color: currentPage === link.id
                  ? 'var(--color-pk-red-light)'
                  : 'var(--color-pk-subtle)',
                cursor: 'pointer',
                padding: '8px 16px',
                fontFamily: 'var(--font-heading)',
                fontWeight: 600,
                fontSize: '14px',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => {
                if (currentPage !== link.id) {
                  e.currentTarget.style.color = 'var(--color-pk-text)';
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== link.id) {
                  e.currentTarget.style.color = 'var(--color-pk-subtle)';
                  e.currentTarget.style.background = 'none';
                }
              }}
            >
              <span style={{ fontSize: '13px' }}>{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={() => onNavigate('builder')}
            className="pk-btn pk-btn-primary"
            style={{ padding: '8px 18px', fontSize: '13px' }}
          >
            + Nuevo Equipo
          </button>

          {/* Avatar placeholder */}
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-pk-red), var(--color-pk-blue))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: 700,
            color: 'white',
            cursor: 'pointer',
            border: '2px solid var(--color-pk-border-light)',
          }}>
            T
          </div>
        </div>
      </div>
    </nav>
  );
}
