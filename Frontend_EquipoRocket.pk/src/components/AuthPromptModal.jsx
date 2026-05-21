// src/components/AuthPromptModal.jsx
// Se muestra cuando un visitante no registrado intenta guardar o exportar.

import { FaSave, FaFileAlt, FaUserPlus, FaBolt } from 'react-icons/fa';

export default function AuthPromptModal({ action = 'guardar', onLogin, onRegister, onClose }) {
  const messages = {
    guardar:   { icon: <FaSave />, title: 'Guarda tu equipo', desc: 'Crea una cuenta gratuita para guardar tus equipos y acceder a ellos desde cualquier lugar.' },
    exportar:  { icon: <FaFileAlt />, title: 'Exporta a Showdown', desc: 'Inicia sesión para descargar tu equipo en formato compatible con Pokémon Showdown y Pikalytics.' },
  };
  const msg = messages[action] ?? messages.guardar;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(6,12,24,0.85)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn .18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-pk-card)',
          border: '1px solid var(--color-pk-border-light)',
          borderRadius: '20px', padding: '32px 28px',
          width: 'min(400px, 100%)', textAlign: 'center',
          animation: 'modalSlide .22s ease',
          display: 'flex', flexDirection: 'column', gap: '16px',
        }}
      >
        <div style={{ fontSize: '44px' }}>{msg.icon}</div>

        <div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '22px',
            letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px',
          }}>
            {msg.title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--color-pk-subtle)', margin: 0, lineHeight: 1.6 }}>
            {msg.desc}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="pk-btn pk-btn-primary"
            onClick={onRegister}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', display:'flex', alignItems:'center', gap:8 }}
          >
            <FaUserPlus /> Crear cuenta gratis
          </button>
          <button
            className="pk-btn pk-btn-secondary"
            onClick={onLogin}
            style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '14px', display:'flex', alignItems:'center', gap:8 }}
          >
            <FaBolt /> Ya tengo cuenta — Iniciar sesión
          </button>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-pk-muted)', fontSize: '13px',
              fontFamily: 'var(--font-body)', padding: '4px',
              transition: 'color .15s ease',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-pk-subtle)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-pk-muted)'}
          >
            Continuar sin guardar
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn    { from{opacity:0} to{opacity:1} }
        @keyframes modalSlide { from{opacity:0;transform:scale(.95) translateY(8px)} to{opacity:1;transform:scale(1) translateY(0)} }
      `}</style>
    </div>
  );
}
