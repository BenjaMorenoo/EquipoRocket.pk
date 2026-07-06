import { useEffect, useState } from 'react';
import { getTypeWinRates, getPokemonUsageVsWins } from '../services/api';
import PokemonSprite from './PokemonSprite';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, ReferenceLine, LabelList, ComposedChart, Line,
} from 'recharts';

const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};
const typeColor = t => TYPE_COLORS[t?.toLowerCase()] || '#6b7280';

const TICK = { fontSize: 11, fill: 'var(--color-pk-subtle)' };
const GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };

function SectionCard({ title, sub, children }) {
  return (
    <div className="pk-card" style={{ padding: '22px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const formatName = n => (n || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function AdminPokemonCrossAnalysis({ from = '', to = '' }) {
  const [typeRates,  setTypeRates]  = useState([]);
  const [usageWins,  setUsageWins]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getTypeWinRates(from, to), getPokemonUsageVsWins(from, to)])
      .then(([typeRes, usageRes]) => {
        if (!mounted) return;
        setTypeRates(typeRes?.data || []);
        setUsageWins(usageRes?.data || []);
      })
      .catch(e => { if (mounted) setError(e.message || 'Error cargando datos'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [from, to]);

  if (loading) return (
    <div className="pk-card" style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 13, gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: '#ef4444', animation: 'spin .8s linear infinite' }} />
      Cargando análisis cruzado...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div className="pk-card" style={{ padding: 20, color: '#fca5a5', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14 }}>
      {error}
    </div>
  );

  const noSimData = typeRates.length === 0 && usageWins.filter(p => p.sim_participations > 0).length === 0;

  /* Only pokémon with at least 1 simulation participation for the win-rate chart */
  const usageWithSims = usageWins.filter(p => Number(p.sim_participations) > 0);

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {noSimData && (
        <div className="pk-card" style={{ padding: '20px 24px', color: 'var(--color-pk-muted)', fontSize: 13 }}>
          No hay datos de simulaciones disponibles aún para calcular tasas de victoria.
          Ejecuta simulaciones para ver el análisis cruzado.
        </div>
      )}

      {/* ── Win rate por tipo ── */}
      {typeRates.length > 0 && (
        <SectionCard
          title="Win rate por tipo de Pokémon"
          sub="Tipos de Pokémon con mayor tasa de victoria en simulaciones Monte Carlo"
        >
          <ResponsiveContainer width="100%" height={Math.max(220, typeRates.length * 34)}>
            <BarChart
              data={typeRates}
              layout="vertical"
              margin={{ top: 4, right: 70, left: 0, bottom: 4 }}
            >
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={TICK}
                tickFormatter={v => `${v}%`}
              />
              <YAxis
                dataKey="type"
                type="category"
                width={80}
                tick={{ ...TICK, fontSize: 11 }}
                tickFormatter={t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t}
              />
              <ReferenceLine x={50} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" label={{ value: '50%', fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideTop' }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = typeRates.find(r => r.type === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: typeColor(label), marginBottom: 5 }}>
                        {label?.charAt(0).toUpperCase() + label?.slice(1)}
                      </div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>Win rate: <strong style={{ color: Number(d.win_rate) >= 50 ? '#22c55e' : '#ef4444' }}>{d.win_rate}%</strong></div>
                      <div style={{ color: 'var(--color-pk-muted)' }}>Victorias: {d.wins} / {d.participations} participaciones</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="win_rate" name="Win rate (%)" radius={[0, 4, 4, 0]}>
                {typeRates.map(entry => (
                  <Cell
                    key={entry.type}
                    fill={typeColor(entry.type)}
                    fillOpacity={0.85}
                  />
                ))}
                <LabelList
                  dataKey="win_rate"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: 'var(--color-pk-muted)' }}
                  formatter={v => `${v}%`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10 }}>
            Calculado sobre equipos que participaron en simulaciones. Un tipo "gana" cuando su equipo vence al oponente.
          </p>
        </SectionCard>
      )}

      {/* ── Pokémon: uso vs victoria ── */}
      {usageWithSims.length > 0 && (
        <SectionCard
          title="Pokémon más usados vs. tasa de victoria"
          sub="Popularidad en equipos y rendimiento en simulaciones (top 20 por uso)"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={usageWithSims.slice(0, 20)}
              margin={{ top: 20, right: 50, left: 0, bottom: 50 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="pokemon_name"
                tick={{ ...TICK, fontSize: 10 }}
                angle={-40}
                textAnchor="end"
                interval={0}
                tickFormatter={formatName}
              />
              <YAxis yAxisId="left"  allowDecimals={false} domain={[0, 'auto']} tick={TICK} label={{ value: 'usos', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'var(--color-pk-muted)' }, dx: -2 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
              <ReferenceLine yAxisId="right" y={50} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 3" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = usageWithSims.find(r => r.pokemon_name === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: typeColor(d.type1), marginBottom: 5 }}>{formatName(label)}</div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>Equipos: <strong>{d.teams_used}</strong></div>
                      <div style={{ color: '#f59e0b' }}>Win rate: <strong>{d.win_rate ?? 'N/A'}%</strong></div>
                      <div style={{ color: 'var(--color-pk-muted)' }}>Sims: {d.sim_participations} ({d.sim_wins} victorias)</div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="left" dataKey="teams_used" name="Equipos" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                {usageWithSims.slice(0, 20).map(entry => (
                  <Cell key={entry.pokemon_id} fill={typeColor(entry.type1)} fillOpacity={0.7} />
                ))}
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="win_rate"
                name="Win rate (%)"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={{ fill: '#f59e0b', r: 3 }}
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 6 }}>
            Barras (eje izq.): número de equipos activos que incluyen al Pokémon. Línea dorada (eje der.): win rate en simulaciones.
          </p>
        </SectionCard>
      )}

      {/* ── All pokémon usage list with win rate ── */}
      {usageWins.length > 0 && (
        <SectionCard
          title="Ranking: uso vs victorias"
          sub="Todos los Pokémon usados, ordenados por popularidad"
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-pk-border)' }}>
                  {['#', 'Pokémon', 'Tipo', 'Equipos', 'Sims', 'Victorias', 'Win rate'].map(h => (
                    <th key={h} style={{ padding: '8px 10px', textAlign: h === '#' || h === 'Equipos' || h === 'Sims' || h === 'Victorias' || h === 'Win rate' ? 'right' : 'left', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usageWins.map((p, i) => (
                  <tr
                    key={p.pokemon_id}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--color-pk-muted)', fontWeight: 700, fontFamily: 'var(--font-heading)', fontSize: 11 }}>{i + 1}</td>
                    <td style={{ padding: '9px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <PokemonSprite name={p.pokemon_name} size={32} alt={formatName(p.pokemon_name)} />
                      <span style={{ fontWeight: 700, color: 'var(--color-pk-text)' }}>{formatName(p.pokemon_name)}</span>
                    </td>
                    <td style={{ padding: '9px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, background: typeColor(p.type1) + '28', border: `1px solid ${typeColor(p.type1)}60`, color: typeColor(p.type1), borderRadius: 20, padding: '2px 7px' }}>
                        {p.type1 || '—'}
                      </span>
                    </td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: 'var(--color-pk-text)' }}>{p.teams_used}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--color-pk-muted)' }}>{p.sim_participations}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right', color: '#22c55e' }}>{p.sim_wins}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      {p.win_rate != null ? (
                        <span style={{ fontWeight: 700, fontFamily: 'var(--font-heading)', color: Number(p.win_rate) >= 50 ? '#22c55e' : Number(p.win_rate) >= 40 ? '#f59e0b' : '#ef4444' }}>
                          {p.win_rate}%
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-pk-muted)', fontSize: 11 }}>Sin sims</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
