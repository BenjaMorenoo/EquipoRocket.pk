import { useEffect, useState } from 'react';
import { getMostUsedPokemon } from '../services/api';
import PokemonSprite from './PokemonSprite';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};
const typeColor = (t) => TYPE_COLORS[t?.toLowerCase()] || '#6b7280';

const formatName = (name) =>
  (name || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function TypePill({ type }) {
  if (!type) return null;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-heading)',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      background: typeColor(type) + '28',
      border: `1px solid ${typeColor(type)}60`,
      color: typeColor(type),
      borderRadius: 20, padding: '2px 7px', lineHeight: 1.5,
    }}>
      {type}
    </span>
  );
}

function SkeletonRow() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-pk-border)' }}>
      <div style={{ width: 28, height: 14, background: 'var(--color-pk-surface)', borderRadius: 4 }} />
      <div style={{ width: 40, height: 40, background: 'var(--color-pk-surface)', borderRadius: 8 }} />
      <div style={{ flex: 1 }}>
        <div style={{ width: '60%', height: 12, background: 'var(--color-pk-surface)', borderRadius: 4, marginBottom: 8 }} />
        <div style={{ width: '100%', height: 6, background: 'var(--color-pk-surface)', borderRadius: 3 }} />
      </div>
      <div style={{ width: 36, height: 18, background: 'var(--color-pk-surface)', borderRadius: 4 }} />
    </div>
  );
}

function PokemonRow({ rank, poke, maxUses, totalUses }) {
  const barPct = Math.round((Number(poke.uses) / maxUses) * 100);
  const sharePct = ((Number(poke.uses) / totalUses) * 100).toFixed(1);
  const color = typeColor(poke.type1);

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 4px', borderBottom: '1px solid var(--color-pk-border)',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Rank */}
      <div style={{
        width: 26, textAlign: 'right', flexShrink: 0,
        fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-heading)',
        color: rank === 1 ? '#f59e0b' : rank === 2 ? '#94a3b8' : rank === 3 ? '#b45309' : 'var(--color-pk-muted)',
      }}>
        {rank}
      </div>

      {/* Sprite */}
      <PokemonSprite name={poke.pokemon_name} size={40} alt={formatName(poke.pokemon_name)} />

      {/* Name + types + bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)' }}>
            {formatName(poke.pokemon_name)}
          </span>
          <TypePill type={poke.type1} />
          {poke.type2 && poke.type2 !== poke.type1 && <TypePill type={poke.type2} />}
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${barPct}%`,
            background: `linear-gradient(90deg, ${color}cc, ${color})`,
            borderRadius: 3, transition: 'width 0.7s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      {/* Count */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 48 }}>
        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)' }}>
          {poke.uses}
        </div>
        <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', marginTop: 1 }}>{sharePct}%</div>
      </div>
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)',
      borderRadius: 10, padding: '10px 14px', fontSize: 13,
    }}>
      <div style={{ fontWeight: 700, color: typeColor(d.name), marginBottom: 4 }}>
        {d.name?.charAt(0).toUpperCase() + d.name?.slice(1)}
      </div>
      <div style={{ color: 'var(--color-pk-subtle)' }}>{d.value} usos en equipos</div>
    </div>
  );
};

const TOP_OPTIONS = [10, 15, 20];

const SEL = {
  padding: '6px 10px', borderRadius: 8, fontSize: 12,
  background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
  color: 'var(--color-pk-text)', cursor: 'pointer', outline: 'none',
};

export default function AdminPokemonMostUsed({ from = '', to = '' }) {
  const [data,     setData]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [topN,     setTopN]     = useState(15);
  const [selType,  setSelType]  = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    getMostUsedPokemon(topN, from, to)
      .then(res => { if (mounted) setData(res?.data || []); })
      .catch(e => { if (mounted) setError(e.message || 'Error cargando datos'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [topN, from, to]);

  /* Available types for filter (from all fetched data) */
  const typeOptions = [...new Set(data.flatMap(d => [d.type1, d.type2].filter(Boolean)))].sort();

  /* Filtered list */
  const filtered = selType
    ? data.filter(d => d.type1 === selType || d.type2 === selType)
    : data;

  const maxUses   = Number(filtered[0]?.uses) || 1;
  const totalUses = filtered.reduce((s, d) => s + Number(d.uses), 0);

  /* Type distribution for donut (always from full data so donut stays informative) */
  const typeDist = {};
  for (const d of filtered) {
    const t = d.type1 || 'unknown';
    typeDist[t] = (typeDist[t] || 0) + Number(d.uses);
  }
  const pieData = Object.entries(typeDist)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="pk-card" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Pokémon más usados en equipos
          </h3>
          {!loading && !error && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-pk-muted)' }}>
              {filtered.length} Pokémon · {totalUses} apariciones{selType ? ` de tipo ${selType}` : ' totales'}
            </p>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Type filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label htmlFor="pk-type-filter" style={{ fontSize: 11, color: 'var(--color-pk-muted)', fontWeight: 700, fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Tipo:</label>
            <select
              id="pk-type-filter"
              value={selType}
              onChange={e => setSelType(e.target.value)}
              style={{ ...SEL, minWidth: 100 }}
            >
              <option value="">Todos</option>
              {typeOptions.map(t => (
                <option key={t} value={t} style={{ color: typeColor(t) }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Top N selector */}
          <div style={{ display: 'flex', gap: 6 }} role="group" aria-label="Número de Pokémon a mostrar">
            {TOP_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                aria-pressed={topN === n}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12, cursor: 'pointer',
                  fontFamily: 'var(--font-heading)', fontWeight: 700,
                  border: topN === n ? '1px solid rgba(220,38,38,0.5)' : '1px solid var(--color-pk-border)',
                  background: topN === n ? 'rgba(220,38,38,0.12)' : 'var(--color-pk-surface)',
                  color: topN === n ? 'var(--color-pk-red)' : 'var(--color-pk-muted)',
                  transition: 'all 0.15s',
                }}
              >
                Top {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#fca5a5', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!error && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 24, alignItems: 'start' }}>

          {/* Left: ranked list */}
          <div>
            {loading
              ? Array.from({ length: topN }, (_, i) => <SkeletonRow key={i} />)
              : filtered.length === 0
                ? <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin Pokémon del tipo seleccionado.</div>
                : filtered.map((poke, i) => (
                    <PokemonRow
                      key={poke.pokemon_id}
                      rank={i + 1}
                      poke={poke}
                      maxUses={maxUses}
                      totalUses={totalUses}
                    />
                  ))
            }
          </div>

          {/* Right: type distribution donut */}
          <div style={{ position: 'sticky', top: 20 }}>
            <div style={{
              background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
              borderRadius: 14, padding: '16px 12px',
            }}>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: 12 }}>
                Distribución por tipo
              </div>

              {loading ? (
                <div style={{ height: 200, background: 'rgba(255,255,255,0.04)', borderRadius: 8 }} />
              ) : pieData.length === 0 ? (
                <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 13 }}>
                  Sin datos
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={52} outerRadius={82}
                      paddingAngle={2}
                    >
                      {pieData.map(entry => (
                        <Cell key={entry.name} fill={typeColor(entry.name)} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip content={<CUSTOM_TOOLTIP />} />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {/* Type legend */}
              {!loading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
                  {pieData.slice(0, 7).map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 3, background: typeColor(d.name), flexShrink: 0, display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: 'var(--color-pk-subtle)', fontWeight: 600 }}>
                          {d.name?.charAt(0).toUpperCase() + d.name?.slice(1)}
                        </span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                        {d.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
