import { useState } from 'react';
import LegalModal from './LegalModal';

export default function Footer() {
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState('terms');

  const openTab = (tab) => { setLegalTab(tab); setLegalOpen(true); };

  return (
    <>
      <footer style={{
        borderTop: '1px solid var(--color-pk-border)',
        background: 'var(--color-pk-surface)',
        padding: '18px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
        marginTop: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, color: 'var(--color-pk-red)', letterSpacing: '0.06em' }}>
            EquipoRocket.pk
          </span>
          <span style={{ color: 'var(--color-pk-border)', fontSize: 13 }}>·</span>
          <span style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>
            Fan-made. No afiliado a Nintendo/Game Freak.
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button
            onClick={() => openTab('terms')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: 12, padding: 0, fontFamily: 'inherit', transition: 'color .15s', textDecoration: 'underline', textUnderlineOffset: 3 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-pk-subtle)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-pk-muted)'}
          >
            Términos y Condiciones
          </button>
          <button
            onClick={() => openTab('privacy')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: 12, padding: 0, fontFamily: 'inherit', transition: 'color .15s', textDecoration: 'underline', textUnderlineOffset: 3 }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--color-pk-subtle)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--color-pk-muted)'}
          >
            Política de Privacidad
          </button>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--color-pk-muted)', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: 6, padding: '2px 8px' }}>
            ⚖️ Ley N° 21.719
          </span>
        </div>
      </footer>

      <LegalModal open={legalOpen} initialTab={legalTab} onClose={() => setLegalOpen(false)} />
    </>
  );
}
