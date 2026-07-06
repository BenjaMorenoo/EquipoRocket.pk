import { useEffect, useState } from 'react';
import { getTeamsStatsByRegion, getAIUsageByRegion } from '../services/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, LabelList, ComposedChart, Line, ReferenceLine,
} from 'recharts';

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

export default function AdminTeamsCrossAnalysis({ from = '', to = '' }) {
  const [regionStats, setRegionStats] = useState([]);
  const [aiByRegion,  setAiByRegion]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([getTeamsStatsByRegion(from, to), getAIUsageByRegion(from, to)])
      .then(([statsRes, aiRes]) => {
        if (!mounted) return;
        setRegionStats(statsRes?.data || []);
        setAiByRegion(aiRes?.data || []);
      })
      .catch(e => { if (mounted) setError(e.message || 'Error cargando datos'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [from, to]);

  if (loading) return (
    <div className="pk-card" style={{ padding: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 13, gap: 10 }}>
      <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: '#f59e0b', animation: 'spin .8s linear infinite' }} />
      Cargando análisis de equipos...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div className="pk-card" style={{ padding: 20, color: '#fca5a5', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14 }}>
      {error}
    </div>
  );

  if (!regionStats.length && !aiByRegion.length) return (
    <div className="pk-card" style={{ padding: 24, color: 'var(--color-pk-muted)', fontSize: 13 }}>
      Sin datos suficientes para el análisis cruzado de equipos.
    </div>
  );

  const avgCompletePct = regionStats.length
    ? Math.round(regionStats.reduce((s, r) => s + Number(r.complete_pct || 0), 0) / regionStats.length)
    : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── Estadísticas por región ── */}
      {regionStats.length > 0 && (
        <SectionCard
          title="Métricas de equipos por región"
          sub="Volumen, completitud y tamaño promedio de equipos en cada región"
        >
          {/* Summary chips */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total equipos',   value: regionStats.reduce((s, r) => s + Number(r.total_teams || 0), 0), color: '#f59e0b' },
              { label: 'Regiones',        value: regionStats.length, color: 'var(--color-pk-blue)' },
              { label: '% completos prom.', value: avgCompletePct != null ? `${avgCompletePct}%` : '—', color: '#22c55e', sub: 'equipos con 6 Pkm' },
            ].map(c => (
              <div key={c.label} style={{ background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '11px 15px' }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-pk-muted)', marginBottom: 5 }}>{c.label}</div>
                <div style={{ fontSize: 21, fontWeight: 800, fontFamily: 'var(--font-heading)', color: c.color, lineHeight: 1 }}>{c.value}</div>
                {c.sub && <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', marginTop: 3 }}>{c.sub}</div>}
              </div>
            ))}
          </div>

          {/* Dual chart: total teams (bars) + complete% (line) */}
          <ResponsiveContainer width="100%" height={Math.max(220, regionStats.length * 44)}>
            <ComposedChart
              data={regionStats}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="teamsGrad" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%"  stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" tick={TICK} yAxisId={undefined} />
              <YAxis dataKey="region" type="category" width={145} tick={{ ...TICK, fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = regionStats.find(r => r.region === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 5 }}>{label}</div>
                      <div style={{ color: '#f59e0b' }}>Total equipos: <strong>{d.total_teams}</strong></div>
                      <div style={{ color: '#22c55e' }}>Equipos completos: <strong>{d.complete_pct}%</strong></div>
                      <div style={{ color: '#7c3aed' }}>Uso de IA: <strong>{d.ai_pct}%</strong></div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>Tamaño promedio: <strong>{d.avg_size} Pkm</strong></div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="total_teams" name="Equipos totales" fill="url(#teamsGrad)" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="total_teams"
                  position="right"
                  style={{ fill: 'var(--color-pk-muted)', fontSize: 11, fontWeight: 700 }}
                />
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>

          {/* Table with all metrics */}
          <div style={{ marginTop: 20, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-pk-border)' }}>
                  {['Región', 'Equipos', 'Uso IA', '% Completos', 'Prom. Pkm/equipo'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Región' ? 'left' : 'right', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 10, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {regionStats.map(r => (
                  <tr
                    key={r.region}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 700, color: 'var(--color-pk-text)' }}>{r.region}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#f59e0b' }}>{r.total_teams}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: Number(r.ai_pct) >= 50 ? '#7c3aed' : 'var(--color-pk-subtle)' }}>
                        {r.ai_pct ?? 0}%
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>
                      <span style={{ fontWeight: 700, color: Number(r.complete_pct) >= 50 ? '#22c55e' : Number(r.complete_pct) >= 25 ? '#f59e0b' : '#ef4444' }}>
                        {r.complete_pct ?? 0}%
                      </span>
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: 'var(--color-pk-subtle)' }}>{r.avg_size ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── IA vs Manual por región ── */}
      {aiByRegion.length > 0 && (
        <SectionCard
          title="IA vs. manual por región"
          sub="Comparativa de estrategia de creación de equipos en cada región"
        >
          <ResponsiveContainer width="100%" height={Math.max(200, aiByRegion.length * 44)}>
            <BarChart
              data={aiByRegion}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 0, bottom: 4 }}
            >
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={TICK} />
              <YAxis dataKey="region" type="category" width={145} tick={{ ...TICK, fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = aiByRegion.find(r => r.region === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 5 }}>{label}</div>
                      <div style={{ color: '#7c3aed' }}>IA: <strong>{d.ai_teams}</strong> ({d.ai_pct}%)</div>
                      <div style={{ color: '#3b82f6' }}>Manual: <strong>{d.manual_teams}</strong></div>
                      <div style={{ color: 'var(--color-pk-muted)', marginTop: 3 }}>Total: {d.total_teams}</div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="ai_teams"     name="IA"     stackId="s" fill="#7c3aed" />
              <Bar dataKey="manual_teams" name="Manual" stackId="s" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                <LabelList
                  valueAccessor={entry => `${entry.ai_pct ?? 0}% IA`}
                  position="right"
                  style={{ fill: 'var(--color-pk-muted)', fontSize: 11, fontWeight: 700 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
            {[['#7c3aed', 'IA (asistido)'], ['#3b82f6', 'Manual']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {l}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Completitud vs IA ── */}
      {regionStats.length > 0 && (
        <SectionCard
          title="Completitud de equipos vs. uso de IA"
          sub="¿Las regiones que usan más IA completan más sus equipos?"
        >
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart
              data={regionStats}
              margin={{ top: 20, right: 50, left: 0, bottom: 50 }}
            >
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="region"
                tick={{ ...TICK, fontSize: 10 }}
                angle={-35}
                textAnchor="end"
                interval={0}
              />
              <YAxis yAxisId="left"  domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
              <ReferenceLine yAxisId="left" y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 3" />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = regionStats.find(r => r.region === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 5 }}>{label}</div>
                      <div style={{ color: '#22c55e' }}>% Equipos completos: <strong>{d.complete_pct}%</strong></div>
                      <div style={{ color: '#7c3aed' }}>% Uso IA: <strong>{d.ai_pct}%</strong></div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="left" dataKey="complete_pct" name="% Completos" fill="#22c55e" fillOpacity={0.75} radius={[4, 4, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="complete_pct" position="top" style={{ fontSize: 10, fill: 'var(--color-pk-muted)', fontWeight: 700 }} formatter={v => `${v}%`} />
              </Bar>
              <Line yAxisId="right" type="monotone" dataKey="ai_pct" name="% IA" stroke="#7c3aed" strokeWidth={2} dot={{ fill: '#7c3aed', r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            {[['#22c55e', '% Equipos completos (6 Pkm)'], ['#7c3aed', '% Creados con IA']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {l}
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
