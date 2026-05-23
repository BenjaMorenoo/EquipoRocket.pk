import { useEffect, useState } from 'react';
import { getAdminTeamPerformance } from '../services/api';
import { ComposedChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line } from 'recharts';

export default function AdminPerformance() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getAdminTeamPerformance();
        if (!mounted) return;
        setData(res?.data || []);
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
  if (!data || !data.length) return <div className="pk-card" style={{ padding: 20 }}>No hay métricas disponibles.</div>;

  // normalize rows for chart (created_by values might be 'manual' or 'ai')
  const chartData = data.map(r => ({
    type: r.created_by || 'manual',
    total_created: Number(r.total_created || 0),
    feedback_wins: Number(r.feedback_wins || 0),
    feedback_loses: Number(r.feedback_loses || 0),
    sim_success_pct: r.sim_success_pct === null ? null : Number(r.sim_success_pct),
    combined_confidence_pct: r.combined_confidence_pct === null ? null : Number(r.combined_confidence_pct),
  }));

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
      <div className="pk-card" style={{ padding: 12 }}>
        <details>
          <summary style={{ cursor: 'pointer', fontWeight: 700, marginBottom: 8 }}>¿Cómo funciona este análisis?</summary>
          <div style={{ marginTop: 8, color: 'var(--color-pk-muted)', fontSize: 13, lineHeight: 1.45 }}>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              <li><strong>Total Created</strong>: número de equipos creados por origen (`manual` o `ai`).</li>
              <li><strong>Feedback + / -</strong>: conteos públicos dejados por usuarios (positivo / negativo).</li>
              <li><strong>Éxito simulación (%)</strong>: tasa de éxito reportada por las simulaciones Monte Carlo asociadas al equipo (resultado técnico, no editable por usuarios).</li>
              <li><strong>Confianza combinada (%)</strong>: métrica interna agregada que pondera simulaciones y feedback para ofrecer una estimación de calidad.</li>
              <li>El gráfico apila feedback positivo/negativo y muestra la tasa de simulación como línea para comparar señales humanas vs técnicas.</li>
              <li>Nota: la fuente primaria de datos es la base de datos; la API externa (PokeAPI) solo se usa para sprites.</li>
            </ul>
          </div>
        </details>
      </div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {chartData.map(d => (
          <div key={d.type} className="pk-card" style={{ padding: 14, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 6 }}>{d.type === 'ai' ? 'AI (Generados)' : 'Manual'}</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{d.total_created}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 10 }}>
              <div style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>Feedback +: <strong style={{ color: '#16a34a' }}>{d.feedback_wins}</strong></div>
              <div style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>Feedback -: <strong style={{ color: '#ef4444' }}>{d.feedback_loses}</strong></div>
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--color-pk-subtle)' }}>Éxito (simulación): <strong>{d.sim_success_pct ?? '—'}%</strong></div>
            <div style={{ marginTop: 6, fontSize: 12, color: 'var(--color-pk-subtle)' }}>Confianza combinada: <strong>{d.combined_confidence_pct ?? '—'}%</strong></div>
          </div>
        ))}
      </div>

      <div className="pk-card" style={{ padding: 12 }}>
        <h3 style={{ margin: '0 0 8px 0', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Resumen (Feedback vs Simulaciones)</h3>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <XAxis dataKey="type" tickFormatter={t => t === 'ai' ? 'AI' : 'Manual'} />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="feedback_wins" stackId="a" fill="#16a34a" name="Feedback +" />
              <Bar yAxisId="left" dataKey="feedback_loses" stackId="a" fill="#ef4444" name="Feedback -" />
              <Line yAxisId="right" type="monotone" dataKey="sim_success_pct" stroke="#2563eb" strokeWidth={2} name="Éxito sim (%)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
