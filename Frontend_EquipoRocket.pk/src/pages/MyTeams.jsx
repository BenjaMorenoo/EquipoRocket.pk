// src/pages/MyTeams.jsx
import { useState, useEffect } from 'react';
import { getTeams, deleteTeam as apiDeleteTeam } from '../services/api';
import TypeBadge from '../components/TypeBadge';
import { FaEdit, FaTrash, FaRegImages, FaQuestionCircle } from 'react-icons/fa';

// Mock data while backend is not connected
const MOCK_TEAMS = [
  {
    id: 1,
    name: 'Dragon Storm',
    format: 'OU',
    createdAt: '2026-05-10',
    pokemon: [
      { name: 'dragonite', types: ['dragon', 'flying'], id: 149 },
      { name: 'salamence', types: ['dragon', 'flying'], id: 373 },
      { name: 'garchomp',  types: ['dragon', 'ground'], id: 445 },
      { name: 'haxorus',   types: ['dragon'],            id: 612 },
      { name: 'flygon',    types: ['dragon', 'ground'], id: 330 },
      { name: 'dragonair', types: ['dragon'],            id: 148 },
    ],
  },
  {
    id: 2,
    name: 'Sun & Steel',
    format: 'VGC',
    createdAt: '2026-05-12',
    pokemon: [
      { name: 'charizard',  types: ['fire', 'flying'],  id: 6 },
      { name: 'metagross',  types: ['steel', 'psychic'], id: 376 },
      { name: 'arcanine',   types: ['fire'],             id: 59 },
      { name: 'aegislash',  types: ['steel', 'ghost'],  id: 681 },
    ],
  },
];

function TeamCard({ team, onEdit, onDelete }) {
  const [sprites, setSprites] = useState({});
  useEffect(() => {
    // Clear previous sprites when team changes
    setSprites({});

    // helper: return lookup value for API and normalized key for map
    const getLookup = (pk) => {
      if (!pk) return null;
      const name = pk?.name ?? pk?.pokemon?.name ?? null;
      const id = pk?.id ?? pk?.pokemon_id ?? pk?.pokemon?.id ?? null;
      const lookup = name ?? id;
      if (!lookup) return null;
      const key = String(lookup).toLowerCase();
      return { lookup, key };
    };

    team.pokemon.forEach(async (pk) => {
      try {
        const info = getLookup(pk);
        if (!info) return;
        const { lookup, key } = info;
        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(lookup)}`);
        if (!res.ok) return;
        const data = await res.json();
        const sprite = data.sprites?.other?.['official-artwork']?.front_default || data.sprites?.front_default || null;
        if (sprite) {
          setSprites((prev) => ({ ...prev, [key]: sprite }));
        }
      } catch (err) { /* ignore individual failures */ }
    });
  }, [team]);

  // Collect all unique types (tolerate missing shapes)
  const allTypes = [...new Set(
    team.pokemon.flatMap((p) => (p?.types || [])
      .map((t) => (typeof t === 'string' ? t : (t?.type?.name || t?.name || '')))
      .filter(Boolean)
    )
  )];

  return (
    <div
      className="pk-card"
      style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '18px',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}>
            {team.name}
          </h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              background: 'rgba(245,158,11,0.12)',
              border: '1px solid rgba(245,158,11,0.3)',
              color: 'var(--color-pk-yellow)',
              borderRadius: '5px',
              padding: '2px 8px',
              fontSize: '10px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}>
              {team.format}
            </span>
              {team.created_by === 'ai' ? (
                <span style={{
                  background: 'rgba(59,130,246,0.08)',
                  border: '1px solid rgba(59,130,246,0.18)',
                  color: 'var(--color-pk-blue)',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}>IA</span>
              ) : (
                <span style={{
                  background: 'rgba(120,120,120,0.06)',
                  border: '1px solid rgba(120,120,120,0.12)',
                  color: 'var(--color-pk-muted)',
                  borderRadius: '5px',
                  padding: '2px 8px',
                  fontSize: '10px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                }}>Manual</span>
              )}
            <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>
              {new Date(team.createdAt).toLocaleDateString('es-CL')}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>
              {team.pokemon.length}/6 Pokémon
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            className="pk-btn pk-btn-secondary"
            onClick={() => onEdit(team)}
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FaEdit /> Editar
          </button>
          <button
            onClick={() => onDelete(team.id)}
            style={{
              background: 'none',
              border: '1px solid var(--color-pk-border)',
              borderRadius: '8px',
              color: 'var(--color-pk-muted)',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '12px',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)';
              e.currentTarget.style.color = '#ef4444';
              e.currentTarget.style.background = 'rgba(239,68,68,0.05)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-pk-border)';
              e.currentTarget.style.color = 'var(--color-pk-muted)';
              e.currentTarget.style.background = 'none';
            }}
          >
            <FaTrash />
          </button>
        </div>
      </div>

      {/* Pokemon sprites row */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {Array(6).fill(null).map((_, i) => {
          const pk = team.pokemon[i];
          const idKey = pk ? String((pk?.name ?? pk?.pokemon?.name ?? pk?.id ?? pk?.pokemon_id ?? pk?.pokemon?.id) || '').toLowerCase() : null;
          const spriteUrl = idKey ? sprites[idKey] : null;
          return (
            <div
              key={i}
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                background: pk ? 'var(--color-pk-surface)' : 'var(--color-pk-border)',
                border: `1px solid ${pk ? 'var(--color-pk-border-light)' : 'var(--color-pk-border)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pk ? 1 : 0.3,
              }}
            >
              {pk ? (
                spriteUrl ? (
                  <img
                    src={spriteUrl}
                    alt={pk.name}
                    style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                  />
                ) : (
                  <FaQuestionCircle style={{ fontSize: 20, color: 'var(--color-pk-muted)' }} />
                )
              ) : (
                <span style={{ fontSize: '14px', color: 'var(--color-pk-muted)' }}>—</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Types row */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        {allTypes.map((type) => (
          <TypeBadge key={type} type={type} size="xs" />
        ))}
      </div>
    </div>
  );
}

export default function MyTeams({ onNavigateToBuilder }) {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  const handleEdit = (team) => {
    onNavigateToBuilder?.(team);
  };

  const handleDelete = (id) => {
    if (!window.confirm('¿Seguro que quieres eliminar este equipo?')) return;
    (async () => {
      try {
        await apiDeleteTeam(id);
        setTeams((prev) => prev.filter((t) => t.id !== id));
      } catch (e) {
        console.error('Error eliminando equipo', e.message);
        alert('No se pudo eliminar el equipo');
      }
    })();
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getTeams();
        setTeams(res?.data?.teams || res?.teams || []);
      } catch (e) {
        console.error('Error cargando equipos', e.message);
        setTeams([]);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            margin: '0 0 4px',
          }}>
            Mis <span style={{ color: 'var(--color-pk-red)' }}>Equipos</span>
          </h1>
          <p style={{ color: 'var(--color-pk-muted)', fontSize: '14px', margin: 0 }}>
            {teams.length} equipo{teams.length !== 1 ? 's' : ''} guardado{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          className="pk-btn pk-btn-primary"
          onClick={() => onNavigateToBuilder?.()}
          style={{ fontSize: '14px' }}
        >
          + Crear Nuevo Equipo
        </button>
      </div>

      {/* Teams grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--color-pk-muted)' }}>
          Cargando equipos...
        </div>
      ) : teams.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '80px 20px',
          border: '2px dashed var(--color-pk-border)',
          borderRadius: '20px',
          color: 'var(--color-pk-muted)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}><FaRegImages /></div>
          <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '20px', margin: '0 0 8px', letterSpacing: '0.06em' }}>
            No tienes equipos aún
          </h3>
          <p style={{ fontSize: '14px', margin: '0 0 20px' }}>
            Crea tu primer equipo competitivo para empezar
          </p>
          <button className="pk-btn pk-btn-primary" onClick={() => onNavigateToBuilder?.()}>
            + Crear mi primer equipo
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
          gap: '16px',
        }}>
          {teams.map((team, i) => (
            <div
              key={team.id}
              className="fade-up"
              style={{ animationDelay: `${i * 0.07}s`, opacity: 0 }}
            >
              <TeamCard
                team={team}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
