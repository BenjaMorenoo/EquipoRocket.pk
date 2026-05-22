// src/pages/AuthPage.jsx
import { useState } from 'react';
import { FaLayerGroup, FaChartBar, FaTrophy, FaBolt, FaUserPlus } from 'react-icons/fa';
import logo from '../assets/logo.png';
import Login from './Login';
import Register from './Register';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'stretch',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Left panel: branding (hidden on small screens) ── */}
      <div style={{
        flex: '0 0 42%',
        background: 'linear-gradient(160deg, #0d1a36 0%, #0a0e1a 60%, #1a0a0a 100%)',
        borderRight: '1px solid var(--color-pk-border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 40px',
        position: 'relative',
        overflow: 'hidden',
      }}
        className="hidden lg:flex"
      >
        {/* Decorative circles */}
        {[
          { size: 300, top: '-80px',  left: '-80px',  color: 'rgba(220,38,38,0.06)'  },
          { size: 200, top: '60%',    left: '60%',    color: 'rgba(59,130,246,0.06)' },
          { size: 150, top: '40%',    left: '-40px',  color: 'rgba(245,158,11,0.04)' },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute', width: c.size, height: c.size,
            borderRadius: '50%', background: c.color, top: c.top, left: c.left,
            filter: 'blur(40px)', pointerEvents: 'none',
          }} />
        ))}

        {/* Grid background */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.15,
          backgroundImage: 'linear-gradient(rgba(30,46,80,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(30,46,80,0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '320px' }}>

          {/* Pokeball logo */}
          <img src={logo} alt='EquipoRocket' style={{ width: '88px', height: '88px', margin: '0 auto 24px', filter: 'drop-shadow(0 0 40px rgba(220,38,38,0.3))' }} />

          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '32px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            margin: '0 0 6px',
            lineHeight: 1.1,
          }}>
            Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>
          </h1>

          <p style={{
            fontSize: '11px',
            color: 'var(--color-pk-muted)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 32px',
          }}>
            Pokémon Champions
          </p>

          <p style={{
            fontSize: '15px',
            color: 'var(--color-pk-subtle)',
            lineHeight: 1.6,
            margin: '0 0 36px',
          }}>
            La plataforma definitiva para armar, analizar y dominar con tus equipos competitivos.
          </p>

          {/* Feature pills */}
          {[
            { icon: <FaLayerGroup />, text: 'Constructor de equipos' },
            { icon: <FaChartBar />, text: 'Análisis de cobertura' },
            { icon: <FaTrophy />, text: 'Rankings competitivos' },
          ].map((f) => (
            <div key={f.text} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-pk-border)',
              borderRadius: '10px',
              padding: '10px 14px',
              marginBottom: '8px',
              textAlign: 'left',
            }}>
              <span style={{ fontSize: '18px' }}>{f.icon}</span>
              <span style={{ fontSize: '13px', color: 'var(--color-pk-subtle)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.04em' }}>
                {f.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>

          {/* Mobile logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}
            className="lg:hidden"
          >
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 12px',
              background: 'conic-gradient(var(--color-pk-red) 0deg 180deg, #e8e8e8 180deg 360deg)',
              border: '2px solid var(--color-pk-border)',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '12px', height: '12px', borderRadius: '50%',
                background: 'var(--color-pk-surface)', border: '2px solid var(--color-pk-border)',
              }} />
            </div>
            <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px', letterSpacing: '0.06em' }}>
              Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>
            </span>
          </div>

          {/* Card */}
          <div style={{
            background: 'var(--color-pk-card)',
            border: '1px solid var(--color-pk-border)',
            borderRadius: '20px',
            padding: '32px 28px',
          }}>
            {/* Tab switcher */}
            <div style={{
              display: 'flex',
              background: 'var(--color-pk-surface)',
              border: '1px solid var(--color-pk-border)',
              borderRadius: '12px',
              padding: '3px',
              marginBottom: '24px',
            }}>
              {[
                { id: 'login',    label: (<><FaBolt style={{ marginRight: 8 }} /> Iniciar Sesión</>) },
                { id: 'register', label: (<><FaUserPlus style={{ marginRight: 8 }} /> Registrarse</>) },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setMode(tab.id)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: '9px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '13px',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    transition: 'all 0.2s ease',
                    background: mode === tab.id ? 'var(--color-pk-red)' : 'none',
                    color:      mode === tab.id ? '#fff' : 'var(--color-pk-muted)',
                    boxShadow:  mode === tab.id ? '0 2px 12px rgba(220,38,38,0.3)' : 'none',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Form */}
            {mode === 'login'
              ? <Login    onGoRegister={() => setMode('register')} />
              : <Register onGoLogin={()   => setMode('login')}    />
            }
          </div>
        </div>
      </div>
    </div>
  );
}
