// src/components/ConfirmModal.jsx
import { useState, useEffect, useRef } from 'react';
import { FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * Props:
 *  title          – heading
 *  description    – body text / JSX
 *  confirmLabel   – red button text
 *  requirePassword – show password field (bool)
 *  requireTyping   – string user must type exactly to unlock confirm
 *  onConfirm(password) – async callback
 *  onClose
 */
export default function ConfirmModal({
  title         = '¿Estás seguro?',
  description,
  confirmLabel  = 'Confirmar',
  requirePassword = false,
  requireTyping   = null,
  onConfirm,
  onClose,
}) {
  const [password, setPassword] = useState('');
  const [typed,    setTyped]    = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const firstRef = useRef(null);

  useEffect(() => {
    setTimeout(() => firstRef.current?.focus(), 80);
    const esc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const typingOk  = !requireTyping  || typed    === requireTyping;
  const passwordOk = !requirePassword || password.length >= 1;
  const canConfirm = typingOk && passwordOk && !loading;

  const handleConfirm = async () => {
    if (!canConfirm) {
      if (!typingOk)   setError(`Escribe exactamente: "${requireTyping}"`);
      else if (!passwordOk) setError('Ingresa tu contraseña.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await onConfirm(password);
    } catch (err) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  };

  const inp = (hasErr) => ({
    width: '100%', padding: '10px 13px', fontSize: '14px',
    background: 'var(--color-pk-surface)',
    border: `1px solid ${hasErr ? '#ef4444' : 'var(--color-pk-border)'}`,
    borderRadius: '10px', color: 'var(--color-pk-text)',
    fontFamily: 'var(--font-body)', outline: 'none',
    transition: 'border-color .15s, box-shadow .15s',
  });

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(6,12,24,0.88)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', animation: 'fadeIn .18s ease',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--color-pk-card)',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '18px', padding: '28px 28px 24px',
          width: 'min(440px, 100%)',
          animation: 'modalSlide .22s ease',
          display: 'flex', flexDirection: 'column', gap: '18px',
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textAlign: 'center' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(239,68,68,0.12)', border: '2px solid rgba(239,68,68,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
          }}>
            <FaExclamationTriangle />
          </div>
          <h2 style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '20px',
            letterSpacing: '0.05em', textTransform: 'uppercase',
            color: 'var(--color-pk-text)', margin: 0,
          }}>
            {title}
          </h2>
          {description && (
            <p style={{ fontSize: '13px', color: 'var(--color-pk-subtle)', margin: 0, lineHeight: 1.6 }}>
              {description}
            </p>
          )}
        </div>

        {/* Typing confirmation */}
        {requireTyping && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)',
            }}>
              Escribe <span style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: '5px', padding: '1px 7px', color: '#fca5a5',
                fontFamily: 'monospace', fontSize: '12px',
              }}>{requireTyping}</span> para confirmar
            </label>
            <input
              ref={firstRef}
              type="text"
              value={typed}
              onChange={(e) => { setTyped(e.target.value); setError(''); }}
              placeholder={requireTyping}
              style={inp(!!error && !typingOk)}
              onFocus={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'; }}
              onBlur={(e)  => { e.target.style.borderColor = 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>
        )}

        {/* Password field */}
        {requirePassword && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{
              fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)',
            }}>
              Tu contraseña para confirmar
            </label>
            <div style={{ position: 'relative' }}>
              <input
                ref={requireTyping ? undefined : firstRef}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                placeholder="••••••••"
                style={{ ...inp(!!error && !passwordOk), paddingRight: '42px' }}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                onFocus={(e) => { e.target.style.borderColor = '#ef4444'; e.target.style.boxShadow = '0 0 0 3px rgba(239,68,68,0.12)'; }}
                onBlur={(e)  => { e.target.style.borderColor = 'var(--color-pk-border)'; e.target.style.boxShadow = 'none'; }}
              />
              <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1} style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-pk-muted)', fontSize: '15px',
              }}>
                {showPwd ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: '8px', padding: '9px 12px',
            fontSize: '12px', color: '#fca5a5',
            display: 'flex', gap: '6px', alignItems: 'flex-start',
          }}>
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onClose}
            style={{
              flex: 1, padding: '11px', borderRadius: '10px', cursor: 'pointer',
              background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
              color: 'var(--color-pk-subtle)', fontFamily: 'var(--font-heading)',
              fontWeight: 700, fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'all .15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-pk-border-light)'; e.currentTarget.style.color = 'var(--color-pk-text)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-pk-border)'; e.currentTarget.style.color = 'var(--color-pk-subtle)'; }}
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            style={{
              flex: 1.4, padding: '11px', borderRadius: '10px', cursor: canConfirm ? 'pointer' : 'not-allowed',
              background: canConfirm ? '#dc2626' : 'rgba(220,38,38,0.2)',
              border: `1px solid ${canConfirm ? 'rgba(239,68,68,0.5)' : 'rgba(220,38,38,0.2)'}`,
              color: canConfirm ? '#fff' : 'rgba(255,255,255,0.3)',
              fontFamily: 'var(--font-heading)', fontWeight: 700,
              fontSize: '13px', letterSpacing: '0.06em', textTransform: 'uppercase',
              transition: 'all .2s ease', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              boxShadow: canConfirm ? '0 4px 16px rgba(220,38,38,0.3)' : 'none',
            }}
          >
            {loading ? (
              <span style={{
                width: '14px', height: '14px', borderRadius: '50%',
                border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                animation: 'spin .7s linear infinite', display: 'inline-block',
              }} />
            ) : confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn    { from { opacity:0 } to { opacity:1 } }
        @keyframes modalSlide { from { opacity:0; transform:scale(.95) translateY(8px) } to { opacity:1; transform:scale(1) translateY(0) } }
        @keyframes spin      { to { transform:rotate(360deg) } }
      `}</style>
    </div>
  );
}
