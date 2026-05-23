// src/components/PokemonSlot.jsx
import TypeBadge from './TypeBadge';
import { STAT_COLORS, STAT_LABELS } from '../utils/typeColors';
import { FaQuestionCircle, FaTimes, FaPlus } from 'react-icons/fa';

const STAT_ORDER = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
const MAX_STAT = 255;

function StatBar({ statName, value }) {
  const color = STAT_COLORS[statName] || '#94a3b8';
  const pct   = Math.round((value / MAX_STAT) * 100);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{
        width: '28px',
        fontSize: '9px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        letterSpacing: '0.05em',
        color: color,
        textAlign: 'right',
        flexShrink: 0,
      }}>
        {STAT_LABELS[statName] || statName.slice(0, 3).toUpperCase()}
      </span>
      <div className="stat-bar-bg" style={{ flex: 1 }}>
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span style={{
        width: '22px',
        fontSize: '9px',
        color: 'var(--color-pk-subtle)',
        fontFamily: 'var(--font-heading)',
        flexShrink: 0,
      }}>
        {value}
      </span>
    </div>
  );
}

/* ── Empty Slot ──────────────────────────────────────────────────────────── */
function EmptySlot({ slotNumber, onClick }) {
  return (
    <div
      className="pokemon-slot-empty fade-up"
      style={{
        animationDelay: `${(slotNumber - 1) * 0.06}s`,
        opacity: 0,
        minHeight: '200px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        padding: '24px',
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      aria-label={`Agregar Pokémon al espacio ${slotNumber}`}
    >
      {/* Slot number indicator */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '12px',
        fontSize: '10px',
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        color: 'var(--color-pk-muted)',
        letterSpacing: '0.1em',
      }}>
        #{slotNumber}
      </div>

      {/* Plus circle */}
      <div style={{
        width: '52px',
        height: '52px',
        borderRadius: '50%',
        border: '2px dashed var(--color-pk-border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '24px',
        color: 'var(--color-pk-muted)',
        transition: 'all 0.2s ease',
      }}>
        <FaPlus />
      </div>

      <span style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        fontSize: '13px',
        color: 'var(--color-pk-muted)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}>
        Agregar Pokémon
      </span>
    </div>
  );
}

/* ── Filled Slot ─────────────────────────────────────────────────────────── */
function FilledSlot({ pokemon, slotNumber, onRemove, onClick }) {
  const name   = pokemon.name;
  const types  = pokemon.types || [];
  const stats  = pokemon.stats;
  const sprite = pokemon.sprites?.other?.['official-artwork']?.front_default
              || pokemon.sprites?.front_default;
  const id     = String(pokemon.id).padStart(3, '0');
  const primaryType = (types[0] && (types[0].type?.name || types[0].name)) || 'normal';
  const colors = {
    normal:   '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
    grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
    steel: '#B8B8D0', fairy: '#EE99AC',
  };
  const typeColor = colors[primaryType] || '#68A090';

  return (
    <div
      className="pk-card fade-up"
      style={{
        animationDelay: `${(slotNumber - 1) * 0.06}s`,
        opacity: 0,
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
        cursor: 'pointer',
        minHeight: '200px',
      }}
      onClick={onClick}
    >
      {/* Background glow from type color */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        background: typeColor,
        opacity: 0.06,
        filter: 'blur(30px)',
        pointerEvents: 'none',
      }} />

      {/* Slot number + remove */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
      }}>
        <span style={{
          fontSize: '10px',
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          color: 'var(--color-pk-muted)',
          letterSpacing: '0.1em',
        }}>
          #{id}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '6px',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '11px',
            padding: '2px 8px',
            fontFamily: 'var(--font-heading)',
            fontWeight: 600,
            letterSpacing: '0.05em',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.25)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
            e.currentTarget.style.borderColor = 'rgba(239,68,68,0.2)';
          }}
          aria-label={`Remover ${name}`}
        >
          <FaTimes />
        </button>
      </div>

      {/* Sprite + info row */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '12px' }}>
        {/* Sprite */}
        <div style={{
          width: '72px',
          height: '72px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle, ${typeColor}18 0%, transparent 70%)`,
          borderRadius: '12px',
        }}>
          {sprite ? (
            <img
              src={sprite}
              alt={name}
              style={{ width: '68px', height: '68px', objectFit: 'contain', imageRendering: 'auto' }}
            />
          ) : (
            <FaQuestionCircle style={{ fontSize: 36, color: 'var(--color-pk-muted)' }} />
          )}
        </div>

        {/* Name + types */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '16px',
            letterSpacing: '0.05em',
            textTransform: 'capitalize',
            color: 'var(--color-pk-text)',
            marginBottom: '6px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {name}
          </div>
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {types.map((t) => (
              <TypeBadge key={t.type.name} type={t.type.name} size="xs" />
            ))}
            {pokemon.spread_id ? (
              <div style={{ fontSize: '11px', color: 'var(--color-pk-muted)', marginTop: 6 }}>Spread: #{pokemon.spread_id}</div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {STAT_ORDER.map((sName) => {
          const stat = stats?.find((s) => s.stat.name === sName);
          if (!stat) return null;
          return <StatBar key={sName} statName={sName} value={stat.base_stat} />;
        })}
      </div>
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────────────────────── */
export default function PokemonSlot({ pokemon, slotNumber, onAdd, onRemove, onEdit }) {
  if (!pokemon) {
    return (
      <div style={{ position: 'relative' }}>
        <EmptySlot slotNumber={slotNumber} onClick={onAdd} />
      </div>
    );
  }

  return (
    <FilledSlot
      pokemon={pokemon}
      slotNumber={slotNumber}
      onRemove={onRemove}
      onClick={onEdit}
    />
  );
}
