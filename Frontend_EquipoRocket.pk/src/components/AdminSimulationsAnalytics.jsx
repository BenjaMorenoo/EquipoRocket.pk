import { useEffect, useState } from 'react';
import { getAdminTeamPerformance, getPerformanceThroughput, getPerformanceLatency, getTypeWinRates } from '../services/api';
import {
  ResponsiveContainer, ComposedChart, Bar, XAxis, YAxis, Tooltip,
  Legend, Line, CartesianGrid, AreaChart, Area, Cell, ReferenceLine, LabelList,
} from 'recharts';

const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
  grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
  ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
  rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
  steel: '#B8B8D0', fairy: '#EE99AC',
};
const typeColor = t => TYPE_COLORS[t?.toLowerCase()] || '#6b7280';

const TICK  = { fontSize: 11, fill: 'var(--color-pk-subtle)' };
const GRID  = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };

function MetricCard({ label, value, color = 'var(--color-pk-text)', sub }) {
  return (
    <div style={{
      background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
      borderRadius: 12, padding: '14px 16px', minWidth: 120,
    }}>
      <div style={{ fontSize: 11, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-pk-muted)', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-heading)', color, lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--color-pk-text)', textTransform: 'uppercase' }}>
        {label === 'ai' ? 'IA (Asistido)' : 'Manual'}
      </div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value ?? '—'}{p.name.includes('%') ? '%' : ''}</strong>
        </div>
      ))}
    </div>
  );
};

function NoFilterNotice({ text }) {
  return (
    <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>ⓘ</span>
      {text || 'Filtro de período no aplica a este análisis — muestra el estado actual.'}
    </p>
  );
}

export default function AdminSimulationsAnalytics({ from = '', to = '' }) {
  const [data,       setData]       = useState([]);
  const [throughput, setThroughput] = useState([]);
  const [latency,    setLatency]    = useState(null);
  const [typeRates,  setTypeRates]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    Promise.all([
      getAdminTeamPerformance(),
      getPerformanceThroughput(),
      getPerformanceLatency(),
      getTypeWinRates(from, to),
    ])
      .then(([perfRes, throughputRes, latencyRes, typeRatesRes]) => {
        if (!mounted) return;
        setData(perfRes?.data || []);
        const raw = (throughputRes?.data || []).slice(0, 24).reverse();
        setThroughput(raw.map(r => ({
          hour: new Date(r.hour).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false }),
          simulaciones: Number(r.simulations_count) || 0,
        })));
        setLatency(latencyRes?.data || null);
        setTypeRates(typeRatesRes?.data || []);
      })
      .catch(e => { if (mounted) setError(e.message || 'Error cargando métricas'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [from, to]);

  if (loading) return (
    <div className="pk-card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--color-pk-muted)', fontSize: 13 }}>
      Cargando métricas de simulaciones...
    </div>
  );
  if (error) return (
    <div className="pk-card" style={{ padding: 20, color: '#fca5a5', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14 }}>
      {error}
    </div>
  );
  if (!data.length) return (
    <div className="pk-card" style={{ padding: 24, color: 'var(--color-pk-muted)', fontSize: 13 }}>
      No hay métricas de simulaciones disponibles aún.
    </div>
  );

  const chartData = data.map(r => ({
    type:                   r.created_by || 'manual',
    'Equipos creados':      Number(r.total_created || 0),
    'Feedback +':           Number(r.feedback_wins || 0),
    'Feedback -':           Number(r.feedback_loses || 0),
    'Éxito sim (%)':        r.sim_success_pct    != null ? Number(r.sim_success_pct)    : null,
    'Confianza (%)':        r.combined_confidence_pct != null ? Number(r.combined_confidence_pct) : null,
  }));

  const totalCreated = data.reduce((s, r) => s + Number(r.total_created || 0), 0);
  const totalFbWins  = data.reduce((s, r) => s + Number(r.feedback_wins || 0), 0);
  const totalFbLoses = data.reduce((s, r) => s + Number(r.feedback_loses || 0), 0);
  const fbSuccessPct = totalFbWins + totalFbLoses > 0
    ? Math.round((totalFbWins / (totalFbWins + totalFbLoses)) * 100)
    : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
        <MetricCard label="Equipos totales" value={totalCreated} color="var(--color-pk-blue)" />
        <MetricCard label="Feedback positivo" value={totalFbWins} color="#22c55e" sub={`de ${totalFbWins + totalFbLoses} totales`} />
        <MetricCard label="Feedback negativo" value={totalFbLoses} color="#ef4444" />
        <MetricCard label="Tasa de éxito" value={fbSuccessPct != null ? `${fbSuccessPct}%` : '—'} color={fbSuccessPct >= 50 ? '#22c55e' : '#f59e0b'} sub="feedback positivo" />
      </div>

      {/* Manual vs IA cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {data.map(d => {
          const isAI = d.created_by === 'ai';
          const accent = isAI ? '#7c3aed' : '#3b82f6';
          return (
            <div key={d.created_by} style={{
              background: 'var(--color-pk-surface)',
              border: `1px solid ${accent}30`,
              borderRadius: 12, padding: '16px 18px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: accent }} />
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.07em', color: accent }}>
                  {isAI ? 'IA — Asistido' : 'Manual'}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Creados</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)' }}>{d.total_created}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Éxito sim.</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-heading)', color: d.sim_success_pct != null ? '#22c55e' : 'var(--color-pk-muted)' }}>
                    {d.sim_success_pct != null ? `${d.sim_success_pct}%` : '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, borderTop: '1px solid var(--color-pk-border)', paddingTop: 10 }}>
                <div style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                  <span style={{ color: '#22c55e', fontWeight: 700 }}>+{d.feedback_wins}</span> / <span style={{ color: '#ef4444', fontWeight: 700 }}>-{d.feedback_loses}</span>
                  <span style={{ color: 'var(--color-pk-muted)', marginLeft: 4 }}>feedback</span>
                </div>
                {d.combined_confidence_pct != null && (
                  <div style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>
                    Conf. <strong style={{ color: 'var(--color-pk-subtle)' }}>{d.combined_confidence_pct}%</strong>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Composed chart */}
      <div className="pk-card" style={{ padding: '20px 24px' }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)', marginBottom: 16 }}>
          Comparativa Manual vs IA
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="type" tickFormatter={t => t === 'ai' ? 'IA' : 'Manual'} tick={TICK} />
            <YAxis yAxisId="left"  tick={TICK} domain={[0, 'auto']} />
            <YAxis yAxisId="right" orientation="right" tick={TICK} domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <Tooltip content={<CUSTOM_TOOLTIP />} />
            <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
            <Bar yAxisId="left" dataKey="Feedback +"  stackId="fb" fill="#22c55e" radius={[0,0,0,0]} isAnimationActive={false} />
            <Bar yAxisId="left" dataKey="Feedback -"  stackId="fb" fill="#ef4444" radius={[4,4,0,0]} isAnimationActive={false} />
            <Line yAxisId="right" type="monotone" dataKey="Éxito sim (%)"  stroke="#6890F0" strokeWidth={2} dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="Confianza (%)"  stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--color-pk-muted)', userSelect: 'none' }}>
            ¿Cómo leer este gráfico?
          </summary>
          <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12, color: 'var(--color-pk-muted)', lineHeight: 1.7 }}>
            <li><strong style={{ color: 'var(--color-pk-subtle)' }}>Barras apiladas</strong>: votos positivos (verde) y negativos (rojo) por tipo de equipo.</li>
            <li><strong style={{ color: '#6890F0' }}>Éxito sim. (%)</strong>: tasa de victorias en simulaciones Monte Carlo.</li>
            <li><strong style={{ color: '#f59e0b' }}>Confianza (%)</strong>: métrica combinada (80% simulación + 20% feedback).</li>
          </ul>
        </details>
        <NoFilterNotice text="Comparativa Manual vs IA muestra totales históricos — filtro de período no aplica." />
      </div>

      {/* ── Throughput (last 24h) ── */}
      {throughput.length > 0 && (
        <div className="pk-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)', marginBottom: 16 }}>
            Actividad simulaciones (últimas 24h)
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={throughput} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="simGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6890F0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6890F0" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="hour" tick={TICK} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={TICK} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '8px 12px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 3 }}>{label}</div>
                      <div style={{ color: '#6890F0' }}>Simulaciones: <strong>{payload[0].value}</strong></div>
                    </div>
                  );
                }}
              />
              <Area type="monotone" dataKey="simulaciones" stroke="#6890F0" strokeWidth={2} fill="url(#simGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <NoFilterNotice text="Muestra siempre las últimas 24h — el filtro de período no aplica a este gráfico." />
        </div>
      )}

      {/* ── Latency stats ── */}
      {latency && Object.keys(latency).length > 0 && (
        <div className="pk-card" style={{ padding: '20px 24px' }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)', marginBottom: 14 }}>
            Estadísticas de latencia
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
            {[
              { key: 'avg_duration_ms',    label: 'Promedio',   unit: 'ms' },
              { key: 'min_duration_ms',    label: 'Mínimo',     unit: 'ms' },
              { key: 'max_duration_ms',    label: 'Máximo',     unit: 'ms' },
              { key: 'p95_duration_ms',    label: 'P95',        unit: 'ms' },
              { key: 'total_simulations',  label: 'Total sims', unit: '' },
            ].filter(s => latency[s.key] != null).map(s => (
              <MetricCard
                key={s.key}
                label={s.label}
                value={`${Math.round(Number(latency[s.key]))}${s.unit}`}
                color={s.key.includes('max') || s.key.includes('p95') ? '#f59e0b' : 'var(--color-pk-blue)'}
              />
            ))}
          </div>
          <NoFilterNotice text="Estadísticas de latencia muestran el histórico total — filtro de período no aplica." />
        </div>
      )}

      {/* ── Win rate por tipo (cross-analysis) ── */}
      {typeRates.length > 0 && (
        <div className="pk-card" style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)' }}>
              Win rate por tipo de Pokémon
            </div>
            <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', marginTop: 3 }}>
              Tipos con mayor tasa de victoria en simulaciones Monte Carlo
            </div>
          </div>
          <ResponsiveContainer width="100%" height={Math.max(220, typeRates.length * 34)}>
            <ComposedChart
              data={typeRates}
              layout="vertical"
              margin={{ top: 4, right: 70, left: 0, bottom: 4 }}
            >
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
              <YAxis
                dataKey="type"
                type="category"
                width={80}
                tick={{ ...TICK, fontSize: 11 }}
                tickFormatter={t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t}
              />
              <ReferenceLine x={50} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3"
                label={{ value: '50%', fill: 'rgba(255,255,255,0.3)', fontSize: 10, position: 'insideTop' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = typeRates.find(r => r.type === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: typeColor(label), marginBottom: 5 }}>
                        {label?.charAt(0).toUpperCase() + label?.slice(1)}
                      </div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>
                        Win rate: <strong style={{ color: Number(d.win_rate) >= 50 ? '#22c55e' : '#ef4444' }}>{d.win_rate}%</strong>
                      </div>
                      <div style={{ color: 'var(--color-pk-muted)' }}>
                        {d.wins} victorias / {d.participations} participaciones
                      </div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="win_rate" name="Win rate (%)" radius={[0, 4, 4, 0]} isAnimationActive={false}>
                {typeRates.map(entry => (
                  <Cell key={entry.type} fill={typeColor(entry.type)} fillOpacity={0.85} />
                ))}
                <LabelList
                  dataKey="win_rate"
                  position="right"
                  style={{ fontSize: 11, fontWeight: 700, fill: 'var(--color-pk-muted)' }}
                  formatter={v => `${v}%`}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10 }}>
            Cada tipo agrupa las participaciones de equipos que incluyen al menos un Pokémon de ese tipo. Win rate = victorias / total participaciones.
          </p>
        </div>
      )}
    </div>
  );
}
