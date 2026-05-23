import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { getAdminUsersRegisteredByMonth } from '../services/api';

export default function AdminUsersByMonth({ className, height = 220 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // mark as mounted to avoid measuring container before layout
    setMounted(true);
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await getAdminUsersRegisteredByMonth();
        const rows = res?.data || [];
        // normalize and format label
        const mapped = rows.map(r => ({
          month: new Date(r.month_start).toLocaleString(undefined, { month: 'short', year: 'numeric' }),
          month_start: r.month_start,
          users: Number(r.users) || 0,
        })).sort((a,b) => new Date(a.month_start) - new Date(b.month_start));
        if (mounted) setData(mapped);
      } catch (e) {
        if (mounted) setError(e.message || String(e));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) return (
    <div className={className} style={{ padding: 12, borderRadius: 12, background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)' }}>Cargando registro mensual...</div>
  );
  if (error) return (
    <div className={className} style={{ padding: 12, borderRadius: 12, background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.12)', color: '#ef4444' }}>Error: {error}</div>
  );

  return (
    <div className={className} style={{ padding: 12, borderRadius: 12, background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>Usuarios registrados (mensual)</div>
        <div style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>{data.length} meses</div>
      </div>
      <div style={{ width: '100%', minWidth: 0, minHeight: 0 }}>
        {(!mounted || data.length === 0) ? (
          <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)' }}>
            {data.length === 0 ? 'Sin datos mensuales' : 'Preparando gráfico...'}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-pk-subtle)' }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-pk-subtle)' }} />
            <Tooltip />
            <Bar dataKey="users" fill="#ef4444" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
