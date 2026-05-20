// src/pages/Home.jsx
// Página pública — visible sin iniciar sesión.
// Muestra estadísticas globales: Pokémon y equipos más usados.

import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth }       from '../context/AuthContext';
import TypeBadge         from '../components/TypeBadge';

/* ── Mock data (reemplazar con llamadas al backend cuando esté listo) ────── */
const MOCK_TOP_POKEMON = [
  { name: 'garchomp',    usage: 38.4, types: ['dragon','ground'] },
  { name: 'flutter-mane',usage: 35.1, types: ['ghost','fairy']   },
  { name: 'landorus-therian', usage: 33.7, types: ['ground','flying'] },
  { name: 'iron-hands',  usage: 31.2, types: ['fighting','electric'] },
  { name: 'kingambit',   usage: 28.9, types: ['dark','steel']    },
  { name: 'incineroar',  usage: 27.4, types: ['fire','dark']     },
  { name: 'tornadus',    usage: 24.6, types: ['flying']          },
  { name: 'rillaboom',   usage: 22.1, types: ['grass']           },
  { name: 'urshifu-single-strike', usage: 20.8, types: ['fighting','dark'] },
  { name: 'calyrex-shadow', usage: 19.3, types: ['psychic','ghost'] },
];

const MOCK_TOP_TEAMS = [
  { id: 1, name: 'Hyper Offense VGC',    format: 'VGC',  uses: 412,  pokemon: ['garchomp','flutter-mane','iron-hands','incineroar','rillaboom','tornadus'] },
  { id: 2, name: 'Sun Tailwind Balance', format: 'VGC',  uses: 387,  pokemon: ['torkoal','flutter-mane','landorus-therian','incineroar','urshifu-single-strike','rillaboom'] },
  { id: 3, name: 'TR Dragon',            format: 'OU',   uses: 341,  pokemon: ['garchomp','kingambit','iron-hands','dragapult','gholdengo','glimmora'] },
  { id: 4, name: 'Rain Offense',         format: 'OU',   uses: 298,  pokemon: ['pelipper','barraskewda','kingdra','urshifu-single-strike','iron-bundle','swampert'] },
];

const MOCK_STATS = [
  { label: 'Pokémon registrados', value: '1,025', icon: '🔴' },
  { label: 'Equipos creados',     value: '8,432', icon: '⚔️' },
  { label: 'Entrenadores',        value: '2,891', icon: '🧢' },
  { label: 'Partidas analizadas', value: '14.2K', icon: '📊' },
];

const TYPE_COLORS = {
  dragon: '#7038F8', fairy: '#EE99AC', ground: '#E0C068', flying: '#A890F0',
  fighting: '#C03028', electric: '#F8D030', dark: '#705848', steel: '#B8B8D0',
  fire: '#F08030', ghost: '#705898', psychic: '#F85888', grass: '#78C850',
};
const getBarColor = (types) => TYPE_COLORS[types?.[0]] ?? '#ef4444';

/* ── Pokemon sprite component ───────────────────────────────────────────── */
function PokemonUsageCard({ pokemon, rank }) {
  const [sprite, setSprite] = useState(null);

  useEffect(() => {
    fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.name}`)
      .then(r => r.json())
      .then(d => setSprite(d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default))
      .catch(() => {});
  }, [pokemon.name]);

  const color = getBarColor(pokemon.types);

  return (
    <div className="pk-card" style={{
      padding: '14px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: `${pokemon.usage}%`,
        background: `${color}10`,
        borderRight: `2px solid ${color}30`,
        transition: 'width .6s ease',
        pointerEvents: 'none',
      }} />

      <span style={{
        fontFamily: 'var(--font-heading)', fontWeight: 700,
        fontSize: '18px', color: rank <= 3 ? 'var(--color-pk-yellow)' : 'var(--color-pk-muted)',
        width: '24px', textAlign: 'center', flexShrink: 0, zIndex: 1,
      }}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank-1] : `#${rank}`}
      </span>

      <div style={{
        width: '48px', height: '48px', flexShrink: 0, zIndex: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {sprite
          ? <img src={sprite} alt={pokemon.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-pk-border)' }} />
        }
      </div>

      <div style={{ flex: 1, overflow: 'hidden', zIndex: 1 }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: '14px', textTransform: 'capitalize', letterSpacing: '0.04em',
          marginBottom: '4px',
        }}>
          {pokemon.name.replace(/-/g, ' ')}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {pokemon.types.map(t => <TypeBadge key={t} type={t} size="xs" />)}
        </div>
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0, zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', color }}>{pokemon.usage}%</div>
        <div style={{ fontSize: '10px', color: 'var(--color-pk-muted)' }}>de uso</div>
      </div>
    </div>
  );
}

/* ── Custom Recharts Tooltip ────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border-light)',
      borderRadius: '8px', padding: '8px 12px', fontSize: '12px',
    }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'capitalize' }}>
        {payload[0].payload.name.replace(/-/g, ' ')}
      </div>
      <div style={{ color: 'var(--color-pk-subtle)' }}>Uso: <strong>{payload[0].value}%</strong></div>
    </div>
  );
};

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function Home({ onNavigate }) {
  const { user } = useAuth();

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px 80px' }}>

      {/* ── Hero ── */}
      <div className="fade-up fade-up-1" style={{
        textAlign: 'center', padding: '48px 20px 40px',
        background: 'radial-gradient(ellipse at top, rgba(220,38,38,0.06) 0%, transparent 60%)',
        borderRadius: '20px', marginBottom: '40px',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '20px', padding: '5px 16px', marginBottom: '20px',
          fontSize: '11px', fontFamily: 'var(--font-heading)', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-pk-red-light)',
        }}>
          ● Temporada 2026 en curso
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: 'clamp(32px, 6vw, 64px)', letterSpacing: '0.06em',
          textTransform: 'uppercase', margin: '0 0 16px', lineHeight: 1.05,
        }}>
          Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>.pk
        </h1>

        <p style={{
          fontSize: 'clamp(14px, 2vw, 17px)', color: 'var(--color-pk-subtle)',
          maxWidth: '520px', margin: '0 auto 32px', lineHeight: 1.6,
        }}>
          Construye, analiza y domina con tus equipos competitivos de <strong style={{ color: 'var(--color-pk-text)' }}>Pokémon Champions</strong>.
          Sin registro, sin límites para explorar.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="pk-btn pk-btn-primary" onClick={() => onNavigate('builder')} style={{ padding: '13px 28px', fontSize: '15px' }}>
            ⚔️ Crear equipo ahora
          </button>
          {!user && (
            <button className="pk-btn pk-btn-secondary" onClick={() => onNavigate('auth')} style={{ padding: '13px 28px', fontSize: '15px' }}>
              ✨ Registrarse gratis
            </button>
          )}
        </div>

        {!user && (
          <p style={{ marginTop: '14px', fontSize: '12px', color: 'var(--color-pk-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <button onClick={() => onNavigate('auth')} style={{ background: 'none', border: 'none', color: 'var(--color-pk-red-light)', cursor: 'pointer', fontSize: '12px', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Inicia sesión
            </button>{' '}para guardar tus equipos y exportarlos.
          </p>
        )}
      </div>

      {/* ── Stats globales ── */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '14px', marginBottom: '48px' }}>
        {MOCK_STATS.map(s => (
          <div key={s.label} className="pk-card" style={{ padding: '18px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '26px', color: 'var(--color-pk-red)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1fr)', gap: '24px', alignItems: 'start' }}>

        {/* LEFT: Top Pokémon ── */}
        <div className="fade-up fade-up-3">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              🔥 Pokémon <span style={{ color: 'var(--color-pk-red)' }}>más usados</span>
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>VGC 2026 — Temporada activa</span>
          </div>

          {/* Bar chart */}
          <div className="pk-card" style={{ padding: '16px', marginBottom: '16px' }}>
            <div style={{ width: '100%', height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MOCK_TOP_POKEMON} layout="vertical" margin={{ top: 0, right: 40, left: 80, bottom: 0 }}>
                  <XAxis type="number" domain={[0, 45]} tick={{ fill: 'var(--color-pk-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-pk-subtle)', fontSize: 11, fontFamily: 'var(--font-body)' }} tickLine={false} axisLine={false} tickFormatter={n => n.replace(/-/g,' ').split(' ').map(w => w[0]?.toUpperCase()+w.slice(1)).join(' ')} width={78} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="usage" radius={[0, 4, 4, 0]} barSize={14}>
                    {MOCK_TOP_POKEMON.map((p) => (
                      <Cell key={p.name} fill={getBarColor(p.types)} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {MOCK_TOP_POKEMON.slice(0, 6).map((pk, i) => (
              <PokemonUsageCard key={pk.name} pokemon={pk} rank={i + 1} />
            ))}
          </div>
        </div>

        {/* RIGHT: Top Equipos ── */}
        <div className="fade-up fade-up-4">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              🏆 Equipos <span style={{ color: 'var(--color-pk-red)' }}>más usados</span>
            </h2>
            <span style={{ fontSize: '11px', color: 'var(--color-pk-muted)' }}>Global</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {MOCK_TOP_TEAMS.map((team, i) => (
              <div key={team.id} className="pk-card" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                      <span style={{
                        fontFamily: 'var(--font-heading)', fontWeight: 700,
                        fontSize: '16px', letterSpacing: '0.04em',
                      }}>
                        {i < 3 ? ['🥇','🥈','🥉'][i] : `#${i+1}`} {team.name}
                      </span>
                    </div>
                    <span style={{
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: '5px', padding: '2px 8px',
                      fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700,
                      letterSpacing: '0.08em', color: 'var(--color-pk-yellow)',
                    }}>
                      {team.format}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '18px', color: 'var(--color-pk-red)' }}>{team.uses}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-pk-muted)' }}>usos</div>
                  </div>
                </div>

                {/* Pokemon sprites row */}
                <TeamSprites pokemon={team.pokemon} />
              </div>
            ))}
          </div>

          {/* CTA sin login */}
          {!user && (
            <div style={{
              marginTop: '16px',
              background: 'linear-gradient(135deg, rgba(220,38,38,0.08), rgba(59,130,246,0.06))',
              border: '1px solid var(--color-pk-border-light)',
              borderRadius: '14px', padding: '20px', textAlign: 'center',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>🎮</div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '16px', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 8px' }}>
                ¿Listo para competir?
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--color-pk-muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
                Regístrate para guardar tus equipos y exportarlos en formato Showdown.
              </p>
              <button className="pk-btn pk-btn-primary" onClick={() => onNavigate('auth')} style={{ width: '100%', justifyContent: 'center', padding: '11px' }}>
                ✨ Crear cuenta gratis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Sprites mini del equipo ─────────────────────────────────────────────── */
function TeamSprites({ pokemon }) {
  const [sprites, setSprites] = useState({});

  useEffect(() => {
    pokemon.forEach(name => {
      fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
        .then(r => r.json())
        .then(d => setSprites(p => ({ ...p, [name]: d.sprites?.front_default })))
        .catch(() => {});
    });
  }, [pokemon]);

  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      {pokemon.map(name => (
        <div key={name} style={{
          width: '40px', height: '40px', borderRadius: '8px',
          background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {sprites[name]
            ? <img src={sprites[name]} alt={name} style={{ width: '36px', height: '36px', objectFit: 'contain' }} />
            : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--color-pk-border)' }} />
          }
        </div>
      ))}
    </div>
  );
}
