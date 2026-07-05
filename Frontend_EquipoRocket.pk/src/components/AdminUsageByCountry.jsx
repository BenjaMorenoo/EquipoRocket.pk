import { useEffect, useState } from 'react';
import { getTypesByCountry, getUsersAgeBuckets } from '../services/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell,
} from 'recharts';

const TYPE_COLORS = [
  '#6890F0', '#F08030', '#78C850', '#F8D030', '#A040A0',
  '#7038F8', '#98D8D8', '#C03028', '#A890F0', '#F85888',
  '#A8B820', '#B8A038', '#705898', '#E0C068', '#B8B8D0', '#EE99AC',
];

const TICK = { fontSize: 11, fill: 'var(--color-pk-subtle)' };
const GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };

const CardTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, color: 'var(--color-pk-text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill }}>{p.name ?? p.dataKey}: <strong>{p.value}</strong></div>
      ))}
    </div>
  );
};

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--color-pk-subtle)', marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function NoFilterNotice() {
  return (
    <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>ⓘ</span>
      Filtro de período no aplica a este análisis — muestra el estado actual de todos los equipos.
    </p>
  );
}

export default function AdminUsageByCountry({ from = '', to = '' }) {
  const [typesData,   setTypesData]   = useState([]);
  const [ageBuckets,  setAgeBuckets]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [selCountry,  setSelCountry]  = useState(null);
  const [selBucket,   setSelBucket]   = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [typesRes, bucketsRes] = await Promise.all([getTypesByCountry(), getUsersAgeBuckets()]);
        if (!mounted) return;
        setTypesData(typesRes?.data || []);
        setAgeBuckets(bucketsRes?.data || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  /* ── Types by country ── */
  const byCountry = {};
  for (const r of typesData) {
    const c = r.country || 'Sin país';
    if (!byCountry[c]) byCountry[c] = [];
    byCountry[c].push({ type: r.type, uses: Number(r.uses || 0) });
  }
  const countriesList = Object.keys(byCountry).sort((a, b) => a.localeCompare(b));

  useEffect(() => {
    if (!selCountry && countriesList.length) setSelCountry(countriesList[0]);
  }, [typesData]);

  const selTypes = (byCountry[selCountry] || []).slice().sort((a, b) => b.uses - a.uses);
  const pieData  = selTypes.map(t => ({ name: t.type, value: t.uses }));
  const topType  = selTypes[0]?.type || null;

  const countryComparison = Object.entries(byCountry)
    .map(([country, types]) => ({ country, uses: types.find(t => t.type === topType)?.uses || 0 }))
    .sort((a, b) => b.uses - a.uses)
    .slice(0, 15);

  /* ── Age buckets ── */
  const bucketTotals = {};
  for (const b of ageBuckets) {
    bucketTotals[b.bucket] = (bucketTotals[b.bucket] || 0) + Number(b.users || 0);
  }
  const bucketsChartData = Object.entries(bucketTotals)
    .map(([bucket, users]) => ({ bucket, users }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));

  const countriesInBucket = ageBuckets
    .filter(b => b.bucket === selBucket)
    .sort((a, b) => b.users - a.users);

  if (loading) return (
    <div className="pk-card" style={{ padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200, color: 'var(--color-pk-muted)', fontSize: 13 }}>
      Cargando datos...
    </div>
  );

  if (error) return (
    <div className="pk-card" style={{ padding: 20, color: '#fca5a5', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14 }}>
      {error}
    </div>
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── Tipos por país ── */}
      <div className="pk-card" style={{ padding: '20px 24px' }}>
        <SectionTitle>Tipos más usados por país</SectionTitle>
        <NoFilterNotice />

        {countriesList.length === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin datos disponibles.</div>
        ) : (
          <>
            {/* Country selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
              <label htmlFor="country-select" style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-subtle)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                País:
              </label>
              <select
                id="country-select"
                value={selCountry || ''}
                onChange={e => setSelCountry(e.target.value)}
                style={{
                  padding: '7px 10px', borderRadius: 8, fontSize: 13,
                  background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
                  color: 'var(--color-pk-text)', cursor: 'pointer', outline: 'none',
                }}
              >
                {countriesList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'start' }}>
              {/* Donut */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-pk-subtle)', marginBottom: 10 }}>{selCountry}</div>
                {pieData.length === 0 ? (
                  <div style={{ color: 'var(--color-pk-muted)', fontSize: 12 }}>Sin datos para este país.</div>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2}>
                        {pieData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} stroke="transparent" />)}
                      </Pie>
                      <Tooltip content={<CardTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                  {selTypes.slice(0, 6).map((t, i) => (
                    <div key={t.type} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 10, height: 10, borderRadius: 2, background: TYPE_COLORS[i % TYPE_COLORS.length], display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>{t.type}</span>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-pk-muted)' }}>{t.uses}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bar chart: comparison across countries for top type */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-pk-subtle)', marginBottom: 10 }}>
                  Países — tipo "{topType || '—'}"
                </div>
                {topType ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={countryComparison} layout="vertical" margin={{ left: 0, right: 12 }}>
                      <CartesianGrid {...GRID} horizontal={false} />
                      <XAxis type="number" tick={TICK} />
                      <YAxis dataKey="country" type="category" width={110} tick={{ ...TICK, fontSize: 11 }} />
                      <Tooltip content={<CardTooltip />} />
                      <Bar dataKey="uses" fill="#6890F0" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ color: 'var(--color-pk-muted)', fontSize: 12 }}>Selecciona un país para ver la comparativa.</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Distribución de edad ── */}
      <div className="pk-card" style={{ padding: '20px 24px' }}>
        <SectionTitle>Distribución de usuarios por edad</SectionTitle>
        <NoFilterNotice />

        {bucketsChartData.length === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin datos de edad disponibles.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={bucketsChartData}
                margin={{ top: 4, right: 12, left: 0, bottom: 4 }}
                onClick={e => e?.activeLabel && setSelBucket(b => b === e.activeLabel ? null : e.activeLabel)}
              >
                <CartesianGrid {...GRID} />
                <XAxis dataKey="bucket" tick={TICK} />
                <YAxis allowDecimals={false} tick={TICK} />
                <Tooltip content={<CardTooltip />} />
                <Bar
                  dataKey="users" name="Usuarios" radius={[6, 6, 0, 0]}
                >
                  {bucketsChartData.map((entry) => (
                    <Cell
                      key={entry.bucket}
                      fill={entry.bucket === selBucket ? '#f59e0b' : '#6890F0'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 6 }}>
              Haz clic en una barra para ver el desglose por país.
            </p>

            {selBucket && (
              <div style={{ marginTop: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: '#fcd34d' }}>Rango {selBucket}</span>
                  <button
                    onClick={() => setSelBucket(null)}
                    aria-label="Cerrar desglose"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-pk-muted)', fontSize: 16, lineHeight: 1 }}
                  >
                    ×
                  </button>
                </div>
                {countriesInBucket.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>Sin países con datos en este rango.</div>
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {countriesInBucket.slice(0, 20).map(r => (
                      <div key={`${r.country}-${r.region}`} style={{
                        background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-pk-border)',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
                      }}>
                        <span style={{ color: 'var(--color-pk-subtle)' }}>{r.country || '—'}</span>
                        <span style={{ fontWeight: 700, color: 'var(--color-pk-text)' }}>{r.users}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
