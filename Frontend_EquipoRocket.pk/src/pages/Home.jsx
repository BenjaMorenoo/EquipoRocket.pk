// src/pages/Home.jsx
// Página pública — visible sin iniciar sesión.
// Muestra estadísticas globales: Pokémon y equipos más usados.

import { useState, useEffect } from 'react';
import { FaDatabase, FaLayerGroup, FaUser, FaFire, FaPlus, FaUserPlus, FaGamepad } from 'react-icons/fa';
import { getBackendPokemons, getBackendPokemon, getPokemon as getPokeApiPokemon } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth }       from '../context/AuthContext';
import TypeBadge         from '../components/TypeBadge';
import logo from '../assets/logo.png';

/* ── Mock data (reemplazar con llamadas al backend cuando esté listo) ────── */
// will be loaded from backend (ms_pokemon)

const MOCK_STATS = [
  { label: 'Pokémon registrados', value: '1,025', icon: <FaDatabase /> },
  { label: 'Equipos creados',     value: '8,432', icon: <FaLayerGroup /> },
  { label: 'Entrenadores',        value: '2,891', icon: <FaUser /> },
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
    // load sprite from public PokeAPI only (DB provides metadata)
    let mounted = true;
    (async () => {
      try {
        const d = await getPokeApiPokemon(pokemon.name);
        if (!mounted) return;
        setSprite(d.sprites?.other?.['official-artwork']?.front_default || d.sprites?.front_default || null);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
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
        {Array.isArray(pokemon.types) && pokemon.types.map(t => {
          const tn = typeof t === 'string' ? t : (t.type?.name || t.name);
          return <TypeBadge key={tn} type={tn} size="xs" />;
        })}
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
  const [topPokemons, setTopPokemons] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const listRes = await getBackendPokemons(12, 0);
        const list = listRes.data?.pokemons || [];
        const details = await Promise.all(list.map(p => getBackendPokemon(p.name).then(r => r.data?.pokemon).catch(() => null)));
        if (!mounted) return;
        const enriched = details.filter(Boolean).map(p => {
          const total = (p.hp||0)+(p.attack||0)+(p.defense||0)+(p.sp_attack||0)+(p.sp_defense||0)+(p.speed||0);
          const usage = Math.min(45, Math.round(total / 30));
          return { ...p, usage };
        });
        setTopPokemons(enriched);
      } catch (e) {
        console.warn('Failed to load backend pokemons', e);
      }
    })();
    return () => { mounted = false; };
  }, []);
  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: 'clamp(20px, 3vw, 32px) clamp(12px, 3vw, 24px) clamp(40px, 8vw, 80px)' }}>

      {/* ── Hero ── */}
      <div className="fade-up fade-up-1" style={{
        textAlign: 'center', padding: 'clamp(24px, 6vw, 48px) 20px clamp(20px, 5vw, 40px)',
        background: 'radial-gradient(ellipse at top, rgba(220,38,38,0.06) 0%, transparent 60%)',
        borderRadius: '20px', marginBottom: 'clamp(24px, 5vw, 40px)',
      }}>
        <div style={{ marginBottom: '8px' }}>
          <img src={logo} alt="EquipoRocket" style={{ width: 'clamp(100px, 20vw, 260px)', height: 'auto', display: 'block', margin: '0 auto' }} />
        </div>

        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: 'clamp(24px, 6vw, 44px)', letterSpacing: '0.06em',
          textTransform: 'uppercase', margin: '4px 0 10px', lineHeight: 1.05, color: 'var(--color-pk-text)'
        }}>
          Equipo<span style={{ color: 'var(--color-pk-red)' }}>Rocket</span>.pk
        </h1>

        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
          borderRadius: '20px', padding: '5px 16px', marginBottom: '20px',
          fontSize: 'clamp(10px, 2vw, 11px)', fontFamily: 'var(--font-heading)', fontWeight: 700,
          letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--color-pk-red-light)',
        }}>
          ● Temporada 2026 en curso
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="pk-btn pk-btn-primary" onClick={() => onNavigate('builder')} style={{ padding: 'clamp(10px, 2vw, 13px) clamp(16px, 4vw, 28px)', fontSize: 'clamp(13px, 2vw, 15px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaPlus /> Crear equipo
          </button>
          {!user && (
            <button className="pk-btn pk-btn-secondary" onClick={() => onNavigate('auth')} style={{ padding: 'clamp(10px, 2vw, 13px) clamp(16px, 4vw, 28px)', fontSize: 'clamp(13px, 2vw, 15px)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <FaUserPlus /> Registrarse
            </button>
          )}
        </div>

        {!user && (
          <p style={{ marginTop: '14px', fontSize: 'clamp(11px, 2vw, 12px)', color: 'var(--color-pk-muted)' }}>
            ¿Ya tienes cuenta?{' '}
            <button onClick={() => onNavigate('auth')} style={{ background: 'none', border: 'none', color: 'var(--color-pk-red-light)', cursor: 'pointer', fontSize: 'clamp(11px, 2vw, 12px)', fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              Inicia sesión
            </button>
          </p>
        )}
      </div>

      {/* ── Stats globales ── */}
      <div className="fade-up fade-up-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 'clamp(12px, 2vw, 14px)', marginBottom: 'clamp(32px, 6vw, 48px)' }}>
        {MOCK_STATS.map(s => (
          <div key={s.label} className="pk-card" style={{ padding: 'clamp(12px, 3vw, 18px)', textAlign: 'center' }}>
            <div style={{ fontSize: 'clamp(24px, 5vw, 28px)', marginBottom: '6px' }}>{s.icon}</div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 26px)', color: 'var(--color-pk-red)', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Main content grid ── */}
      <div className="fade-up fade-up-3">
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 'clamp(16px, 3.5vw, 18px)', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
              <FaFire style={{ marginRight: 8 }} /> Pokémon <span style={{ color: 'var(--color-pk-red)' }}>más usados</span>
            </h2>
            <span style={{ fontSize: 'clamp(10px, 1.5vw, 11px)', color: 'var(--color-pk-muted)' }}>VGC 2026 — Temporada activa</span>
          </div>

          {/* Bar chart */}
          <div className="pk-card" style={{ padding: 'clamp(12px, 2vw, 16px)', marginBottom: '16px', overflowX: 'auto' }}>
            <div style={{ width: '100%', minHeight: '200px', height: 'clamp(160px, 40vw, 280px)' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topPokemons} layout="vertical" margin={{ top: 0, right: 40, left: 'auto', bottom: 0 }}>
                  <XAxis type="number" domain={[0, 45]} tick={{ fill: 'var(--color-pk-muted)', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="name" tick={{ fill: 'var(--color-pk-subtle)', fontSize: 10, fontFamily: 'var(--font-body)' }} tickLine={false} axisLine={false} tickFormatter={n => n.replace(/-/g,' ').split(' ').map(w => w[0]?.toUpperCase()+w.slice(1)).join(' ')} width={60} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="usage" radius={[0, 4, 4, 0]} barSize={14}>
                    {topPokemons.map((p) => (
                      <Cell key={p.name} fill={getBarColor(p.types?.map(t => (typeof t==='string'?t:(t.type?.name||t.name))))} opacity={0.85} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {topPokemons.slice(0, 6).map((pk, i) => (
              <PokemonUsageCard key={pk.name} pokemon={pk} rank={i + 1} />
            ))}
          </div>
      </div>
    </div>
  );
}


