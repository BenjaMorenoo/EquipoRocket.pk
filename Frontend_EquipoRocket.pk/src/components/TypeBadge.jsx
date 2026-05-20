// src/components/TypeBadge.jsx
import { getTypeColor } from '../utils/typeColors';

export default function TypeBadge({ type, size = 'sm' }) {
  const colors = getTypeColor(type);
  const label = type.charAt(0).toUpperCase() + type.slice(1);

  const sizes = {
    xs:  { fontSize: '9px',  padding: '2px 7px',  borderRadius: '5px' },
    sm:  { fontSize: '10px', padding: '3px 9px',  borderRadius: '6px' },
    md:  { fontSize: '12px', padding: '4px 12px', borderRadius: '7px' },
    lg:  { fontSize: '14px', padding: '6px 16px', borderRadius: '8px' },
  };

  const s = sizes[size] || sizes.sm;

  return (
    <span style={{
      ...s,
      background: colors.light,
      color: colors.bg,
      border: `1px solid ${colors.border}`,
      fontFamily: 'var(--font-heading)',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      display: 'inline-flex',
      alignItems: 'center',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    }}>
      {label}
    </span>
  );
}
