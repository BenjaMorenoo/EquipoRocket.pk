import { useEffect, useState } from 'react';
import { getAdminTeamPerformance, getPerformanceLatency, getPerformanceThroughput, getPerformanceErrors } from '../services/api';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export default function AdminPerformance() {
  const [teamPerf, setTeamPerf] = useState([]);
  const [latency, setLatency] = useState(null);
  const [throughput, setThroughput] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [tpRes, latRes, thRes, errRes] = await Promise.all([
          getAdminTeamPerformance(),
          getPerformanceLatency(),
          getPerformanceThroughput(),
          getPerformanceErrors(),
        ]);
        if (!mounted) return;
        setTeamPerf(tpRes?.data || []);
        setLatency(latRes?.data || null);
        setThroughput((thRes?.data || []).map(r => ({ hour: r.hour, count: Number(r.simulations_count) })).reverse());
        setErrors(errRes?.data || []);
      } catch (e) {
        console.error('admin perf error', e.message || e);
        setError(e.message || 'Error fetching metrics');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return <div className="pk-card" style={{ padding: 20 }}>Cargando métricas...</div>;
  if (error) return <div className="pk-card" style={{ padding: 20, color: '#ef4444' }}>Error: {error}</div>;

  const p50 = latency?.p50_duration_ms ?? null;
  const p95 = latency?.p95_duration_ms ?? null;
  const p99 = latency?.p99_duration_ms ?? null;
  const avg = latency?.avg_duration_ms ?? null;
  const totalSims = latency?.total_simulations ?? null;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
        <div className="pk-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700 }}>Simulaciones totales</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{totalSims ?? '—'}</div>
        </div>
        <div className="pk-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700 }}>Duración media (ms)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{avg ? Math.round(avg) : '—'}</div>
        </div>
        <div className="pk-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700 }}>P50 (ms)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p50 ? Math.round(p50) : '—'}</div>
        </div>
        <div className="pk-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700 }}>P95 (ms)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p95 ? Math.round(p95) : '—'}</div>
        </div>
        <div className="pk-card" style={{ padding: 14 }}>
          <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700 }}>P99 (ms)</div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{p99 ? Math.round(p99) : '—'}</div>
        </div>
      </div>

      <div className="pk-card" style={{ padding: 12 }}>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Rendimiento (últimas horas)</h3>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={throughput}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tickFormatter={(t) => t ? new Date(t).toLocaleString() : ''} />
              <YAxis />
              <Tooltip labelFormatter={l => l ? new Date(l).toLocaleString() : ''} />
              <Line type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="pk-card" style={{ padding: 12 }}>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Errores / Fallos recientes</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {errors.length === 0 ? <div style={{ color: 'var(--color-pk-muted)' }}>No hay errores reportados.</div> : errors.map((e, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ fontSize: 13 }}>{e.error_type || e.status}</div>
              <div style={{ fontWeight: 700 }}>{e.occurrences}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
