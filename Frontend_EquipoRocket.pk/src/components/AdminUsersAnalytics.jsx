import { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, ReferenceLine, ComposedChart, LabelList,
} from 'recharts';
import {
  getAdminUsersRegisteredByMonth,
  getUsersRetention,
  getUsersByRegion,
  getUsersAgeBuckets,
  getUserEngagementByRegion,
  getAIUsageByRegion,
  getAgeEngagement,
} from '../services/api';

/* ── Constants ────────────────────────────────────────────────────────────── */
const TICK = { fontSize: 11, fill: 'var(--color-pk-subtle)' };
const GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };
const BUCKET_COLORS = ['#6890F0', '#22c55e', '#f59e0b', '#f97316', '#ef4444', '#a855f7'];

const MONTHS = [
  { v: 1,  short: 'Ene', label: 'Enero' },
  { v: 2,  short: 'Feb', label: 'Febrero' },
  { v: 3,  short: 'Mar', label: 'Marzo' },
  { v: 4,  short: 'Abr', label: 'Abril' },
  { v: 5,  short: 'May', label: 'Mayo' },
  { v: 6,  short: 'Jun', label: 'Junio' },
  { v: 7,  short: 'Jul', label: 'Julio' },
  { v: 8,  short: 'Ago', label: 'Agosto' },
  { v: 9,  short: 'Sep', label: 'Septiembre' },
  { v: 10, short: 'Oct', label: 'Octubre' },
  { v: 11, short: 'Nov', label: 'Noviembre' },
  { v: 12, short: 'Dic', label: 'Diciembre' },
];

const SEL = {
  padding: '7px 10px', borderRadius: 8, fontSize: 12,
  background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
  color: 'var(--color-pk-text)', cursor: 'pointer', outline: 'none',
  transition: 'border-color 0.15s',
};
const LBL = {
  fontSize: 11, color: 'var(--color-pk-muted)', fontWeight: 700,
  fontFamily: 'var(--font-heading)', textTransform: 'uppercase', letterSpacing: '0.07em',
};

/* ── Sub-components ───────────────────────────────────────────────────────── */
function SectionCard({ title, sub, children }) {
  return (
    <div className="pk-card" style={{ padding: '22px 24px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-subtle)' }}>
          {title}
        </div>
        {sub && <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', marginTop: 3 }}>{sub}</div>}
      </div>
      {children}
    </div>
  );
}

function StatChip({ label, value, color, sub }) {
  return (
    <div style={{
      background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
      borderRadius: 10, padding: '11px 15px', flex: '1 1 110px', minWidth: 110,
    }}>
      <div style={{ fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-pk-muted)', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 21, fontWeight: 800, fontFamily: 'var(--font-heading)', color: color || 'var(--color-pk-text)', lineHeight: 1 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 5, color: 'var(--color-pk-text)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.color || p.fill, marginBottom: 2 }}>
          {p.name ?? p.dataKey}: <strong>{Number(p.value).toLocaleString()}</strong>
        </div>
      ))}
    </div>
  );
};

/* Date range filter bar */
function DateFilterBar({ fromYear, fromMonth, toYear, toMonth, setFromYear, setFromMonth, setToYear, setToMonth, availableYears }) {
  const hasFilter = !!(fromYear || toYear);
  const clear = () => { setFromYear(''); setFromMonth(''); setToYear(''); setToMonth(''); };

  const fromLabel = fromYear
    ? `${fromMonth ? MONTHS.find(m => m.v === Number(fromMonth))?.short + ' ' : ''}${fromYear}`
    : null;
  const toLabel = toYear
    ? `${toMonth ? MONTHS.find(m => m.v === Number(toMonth))?.short + ' ' : ''}${toYear}`
    : null;

  return (
    <div style={{
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--color-pk-border)',
      borderRadius: 12, padding: '13px 16px', marginBottom: 20,
      display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10,
    }}>
      {/* Desde */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={LBL}>Desde</span>
        <select
          aria-label="Año inicio"
          value={fromYear}
          onChange={e => { setFromYear(e.target.value); if (!e.target.value) setFromMonth(''); }}
          style={SEL}
        >
          <option value="">Año</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          aria-label="Mes inicio"
          value={fromMonth}
          onChange={e => setFromMonth(e.target.value)}
          style={{ ...SEL, opacity: fromYear ? 1 : 0.4, cursor: fromYear ? 'pointer' : 'default' }}
          disabled={!fromYear}
        >
          <option value="">Mes</option>
          {MONTHS.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
      </div>

      {/* Arrow separator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 24, height: 1, background: 'var(--color-pk-border)' }} />
        <span style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>→</span>
        <div style={{ width: 24, height: 1, background: 'var(--color-pk-border)' }} />
      </div>

      {/* Hasta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span style={LBL}>Hasta</span>
        <select
          aria-label="Año fin"
          value={toYear}
          onChange={e => { setToYear(e.target.value); if (!e.target.value) setToMonth(''); }}
          style={SEL}
        >
          <option value="">Año</option>
          {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select
          aria-label="Mes fin"
          value={toMonth}
          onChange={e => setToMonth(e.target.value)}
          style={{ ...SEL, opacity: toYear ? 1 : 0.4, cursor: toYear ? 'pointer' : 'default' }}
          disabled={!toYear}
        >
          <option value="">Mes</option>
          {MONTHS.map(m => <option key={m.v} value={m.v}>{m.label}</option>)}
        </select>
      </div>

      {/* Active summary chip + clear */}
      {hasFilter && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 4 }}>
          <span style={{
            fontSize: 11, padding: '4px 10px', borderRadius: 20,
            background: 'rgba(104,144,240,0.12)', border: '1px solid rgba(104,144,240,0.3)',
            color: '#6890F0', fontFamily: 'var(--font-heading)', fontWeight: 700,
          }}>
            {fromLabel ?? '—'} → {toLabel ?? 'hoy'}
          </span>
          <button
            onClick={clear}
            aria-label="Limpiar filtro"
            style={{
              padding: '4px 10px', borderRadius: 7, fontSize: 11, cursor: 'pointer',
              fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.05em',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
              color: '#fca5a5', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
          >
            × Limpiar
          </button>
        </div>
      )}
    </div>
  );
}

/* Retention funnel row with drop-off indicator */
function FunnelStep({ label, value, total, prevValue, color, isFirst }) {
  const pct     = total > 0 ? Math.round((value / total) * 100) : 0;
  const dropPct = prevValue != null && prevValue > 0
    ? Math.round(((prevValue - value) / prevValue) * 100)
    : null;

  return (
    <div>
      {/* Drop-off arrow */}
      {!isFirst && dropPct !== null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '6px 0', paddingLeft: 4 }}>
          <div style={{ width: 1, height: 14, background: 'var(--color-pk-border)', marginLeft: 14 }} />
          <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
            ↓ -{dropPct}% no continúan
          </span>
        </div>
      )}

      <div style={{ marginBottom: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 18, borderRadius: 2, background: color, flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: 'var(--color-pk-subtle)', fontWeight: 600 }}>{label}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontSize: 15, fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'var(--color-pk-text)' }}>
              {value != null ? Number(value).toLocaleString() : '—'}
            </span>
            <span style={{
              fontSize: 12, fontFamily: 'var(--font-heading)', fontWeight: 700,
              minWidth: 44, textAlign: 'right',
              color: pct >= 60 ? '#22c55e' : pct >= 30 ? '#f59e0b' : '#ef4444',
            }}>
              {pct}%
            </span>
          </div>
        </div>
        <div style={{ height: 9, background: 'rgba(255,255,255,0.05)', borderRadius: 5, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 5,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            transition: 'width 0.8s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>
    </div>
  );
}

/* "no aplica" footer notice */
function NoFilterNotice() {
  return (
    <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10, fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontSize: 13 }}>ⓘ</span>
      Filtro de período no aplica a este análisis — muestra el estado actual.
    </p>
  );
}

/* ── Main component ───────────────────────────────────────────────────────── */
export default function AdminUsersAnalytics({ users = [], from = '', to = '' }) {
  const [monthlyRaw,   setMonthlyRaw]   = useState([]);
  const [retention,    setRetention]    = useState(null);
  const [regionData,   setRegionData]   = useState([]);
  const [ageBuckets,   setAgeBuckets]   = useState([]);
  const [engagement,   setEngagement]   = useState([]);
  const [aiByRegion,   setAiByRegion]   = useState([]);
  const [ageEngage,    setAgeEngage]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  /* Local filters not date-related */
  const [selRegion,    setSelRegion]    = useState('');
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [monthlyRes, retentionRes, regionRes, bucketsRes, engageRes, aiRegionRes, ageEngRes] = await Promise.all([
          getAdminUsersRegisteredByMonth(),
          getUsersRetention(),
          getUsersByRegion(),
          getUsersAgeBuckets(),
          getUserEngagementByRegion(from, to),
          getAIUsageByRegion(from, to),
          getAgeEngagement(from, to),
        ]);
        if (!mounted) return;

        const monthly = (monthlyRes?.data || []).map(r => {
          const d = new Date(r.month_start);
          return {
            month:       d.toLocaleString('es-CL', { month: 'short', year: '2-digit' }),
            month_start: r.month_start,
            year:        d.getFullYear(),
            monthNum:    d.getMonth() + 1,
            users:       Number(r.users) || 0,
          };
        }).sort((a, b) => new Date(a.month_start) - new Date(b.month_start));

        setMonthlyRaw(monthly);
        setRetention(retentionRes?.data || null);
        setRegionData(regionRes?.data || []);
        setAgeBuckets(bucketsRes?.data || []);
        setEngagement(engageRes?.data || []);
        setAiByRegion(aiRegionRes?.data || []);
        setAgeEngage(ageEngRes?.data || []);
      } catch (e) {
        if (mounted) setError(e.message || 'Error cargando datos');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [from, to]);

  /* ── Derived ── */
  const monthlyFiltered = useMemo(() => {
    if (!from && !to) return monthlyRaw;
    return monthlyRaw.filter(d => {
      if (from) {
        const [fy, fm] = from.split('-').map(Number);
        if (d.year < fy || (d.year === fy && d.monthNum < (fm || 1))) return false;
      }
      if (to) {
        const [ty, tm] = to.split('-').map(Number);
        if (d.year > ty || (d.year === ty && d.monthNum > (tm || 12))) return false;
      }
      return true;
    });
  }, [monthlyRaw, from, to]);

  const hasDateFilter  = !!(from || to);
  const manyMonths     = monthlyFiltered.length > 14;

  const monthlyTotal   = monthlyFiltered.reduce((s, d) => s + d.users, 0);
  const monthlyAvg     = monthlyFiltered.length ? Math.round(monthlyTotal / monthlyFiltered.length) : 0;
  const peakMonth      = monthlyFiltered.reduce((best, d) => d.users > (best?.users ?? -1) ? d : best, null);
  const lastN          = monthlyFiltered.slice(-3);
  const prevN          = monthlyFiltered.slice(-6, -3);
  const lastSum        = lastN.reduce((s, d) => s + d.users, 0);
  const prevSum        = prevN.reduce((s, d) => s + d.users, 0);
  const growthPct      = prevSum > 0 ? Math.round(((lastSum - prevSum) / prevSum) * 100) : null;

  const ageRegions = useMemo(() => {
    const seen = new Set();
    return ageBuckets.reduce((acc, b) => {
      if (b.region && !seen.has(b.region)) { seen.add(b.region); acc.push({ id: b.region_id, name: b.region }); }
      return acc;
    }, []).sort((a, b) => a.name.localeCompare(b.name));
  }, [ageBuckets]);

  const bucketTotals = useMemo(() => {
    const src = selRegion
      ? ageBuckets.filter(b => String(b.region_id) === selRegion)
      : ageBuckets;
    const map = {};
    for (const b of src) map[b.bucket] = (map[b.bucket] || 0) + Number(b.users || 0);
    return Object.entries(map)
      .map(([bucket, users]) => ({ bucket, users }))
      .sort((a, b) => a.bucket.localeCompare(b.bucket));
  }, [ageBuckets, selRegion]);

  const topUsers = useMemo(() => {
    const list = showInactive ? users : users.filter(u => u.is_active !== false);
    return list.slice().sort((a, b) => (b.teams ?? 0) - (a.teams ?? 0)).slice(0, 10);
  }, [users, showInactive]);

  const maxTeams = topUsers[0]?.teams ?? 1;

  /* ── Loading / error states ── */
  if (loading) return (
    <div className="pk-card" style={{ padding: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, color: 'var(--color-pk-muted)', fontSize: 13, gap: 12 }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: '#6890F0', animation: 'spin .8s linear infinite' }} />
      Cargando análisis de usuarios...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div className="pk-card" style={{ padding: 20, color: '#fca5a5', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 14 }}>
      {error}
    </div>
  );

  const retTotal = Number(retention?.total) || 0;

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── 1. Registros por mes ── */}
      <SectionCard title="Registros por mes" sub="Nuevos usuarios registrados en el tiempo">

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
          <StatChip
            label={hasDateFilter ? 'Total (rango)' : 'Total histórico'}
            value={monthlyTotal.toLocaleString()}
            color="#6890F0"
            sub={`${monthlyFiltered.length} meses`}
          />
          <StatChip label="Promedio / mes" value={monthlyAvg.toLocaleString()} sub="usuarios" />
          <StatChip label="Mes pico" value={peakMonth?.month ?? '—'} color="#f59e0b" sub={peakMonth ? `${peakMonth.users} usuarios` : ''} />
          {growthPct !== null && (
            <StatChip
              label="Tendencia (3m)"
              value={`${growthPct >= 0 ? '+' : ''}${growthPct}%`}
              color={growthPct >= 0 ? '#22c55e' : '#ef4444'}
              sub="vs 3m anteriores"
            />
          )}
        </div>

        {monthlyFiltered.length === 0 ? (
          <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 13 }}>
            Sin datos para el período seleccionado
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={monthlyFiltered} margin={{ top: 24, right: 16, left: 0, bottom: manyMonths ? 44 : 8 }}>
              <defs>
                <linearGradient id="barGradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#6890F0" stopOpacity={1} />
                  <stop offset="100%" stopColor="#6890F0" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis
                dataKey="month"
                tick={{ ...TICK, fontSize: manyMonths ? 10 : 11 }}
                angle={manyMonths ? -40 : 0}
                textAnchor={manyMonths ? 'end' : 'middle'}
                interval={manyMonths ? 1 : 0}
              />
              <YAxis allowDecimals={false} domain={[0, 'auto']} tick={TICK} />
              <Tooltip content={<ChartTooltip />} />
              {monthlyAvg > 0 && (
                <ReferenceLine
                  y={monthlyAvg}
                  stroke="#f59e0b"
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{ value: `Prom. ${monthlyAvg}`, fill: '#f59e0b', fontSize: 10, position: 'insideTopRight', dy: -4 }}
                />
              )}
              <Bar dataKey="users" name="Usuarios" fill="url(#barGradBlue)" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                {!manyMonths && (
                  <LabelList
                    dataKey="users"
                    position="top"
                    style={{ fill: 'var(--color-pk-muted)', fontSize: 10, fontWeight: 700 }}
                  />
                )}
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── 2. Embudo de retención ── */}
      <SectionCard title="Embudo de retención" sub="Progresión desde registro hasta equipo completo — estado actual de todos los usuarios">
        {retTotal === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin datos disponibles.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 32, alignItems: 'start' }}>
            {/* Funnel steps */}
            <div style={{ maxWidth: 600 }}>
              {[
                { label: 'Usuarios registrados',    value: retention.total,          color: '#6890F0' },
                { label: 'Usuarios activos',         value: retention.active,         color: '#22c55e' },
                { label: 'Con al menos 1 equipo',    value: retention.with_teams,     color: '#f59e0b' },
                { label: 'Con 3+ equipos',           value: retention.with_3teams,    color: '#f97316' },
                { label: 'Equipo completo (6 Pkm)',  value: retention.with_full_team, color: '#ef4444' },
              ].map((step, i, arr) => (
                <FunnelStep
                  key={step.label}
                  label={step.label}
                  value={step.value}
                  total={retTotal}
                  prevValue={i > 0 ? arr[i - 1].value : null}
                  color={step.color}
                  isFirst={i === 0}
                />
              ))}
              <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 14 }}>
                % relativo al total de usuarios registrados. Drop-off relativo al paso anterior.
              </p>
              <NoFilterNotice />
            </div>

            {/* Summary stats panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 140 }}>
              {[
                { label: 'Registrados',  value: retention.total,          color: '#6890F0' },
                { label: 'Activos',      value: retention.active,         color: '#22c55e' },
                { label: 'Con equipos',  value: retention.with_teams,     color: '#f59e0b' },
                { label: 'Con 3+',       value: retention.with_3teams,    color: '#f97316' },
                { label: 'Completos',    value: retention.with_full_team, color: '#ef4444' },
              ].map(s => (
                <div key={s.label} style={{
                  background: 'var(--color-pk-surface)', border: `1px solid ${s.color}25`,
                  borderLeft: `3px solid ${s.color}`, borderRadius: 8, padding: '8px 12px',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'var(--font-heading)', color: s.color, lineHeight: 1.2, marginTop: 2 }}>
                    {s.value != null ? Number(s.value).toLocaleString() : '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── 3. Distribución geográfica ── */}
      <SectionCard title="Distribución geográfica" sub="Usuarios activos e inactivos por región — estado actual">
        {regionData.length === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin datos de región disponibles.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(200, regionData.length * 48)}>
              <BarChart
                data={regionData}
                layout="vertical"
                margin={{ top: 4, right: 60, left: 0, bottom: 4 }}
              >
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={TICK} />
                <YAxis dataKey="region" type="category" width={145} tick={{ ...TICK, fontSize: 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="active"   name="Activos"   stackId="s" fill="#22c55e" />
                <Bar dataKey="inactive" name="Inactivos" stackId="s" fill="#ef4444" radius={[0, 4, 4, 0]}>
                  <LabelList
                    valueAccessor={entry => Number(entry.active ?? 0) + Number(entry.inactive ?? 0)}
                    position="right"
                    style={{ fill: 'var(--color-pk-muted)', fontSize: 11, fontWeight: 700 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
              {[['#22c55e', 'Activos'], ['#ef4444', 'Inactivos']].map(([color, label]) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: 'inline-block' }} />
                  {label}
                </div>
              ))}
            </div>
            <NoFilterNotice />
          </>
        )}
      </SectionCard>

      {/* ── 4. Distribución por edad ── */}
      <SectionCard title="Distribución por edad" sub="Rango etario de usuarios registrados — estado actual">
        {/* Filter inline */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={LBL}>Región:</span>
          <select value={selRegion} onChange={e => setSelRegion(e.target.value)} style={SEL} aria-label="Filtrar por región">
            <option value="">Todas las regiones</option>
            {ageRegions.map(r => (
              <option key={r.id ?? r.name} value={String(r.id ?? r.name)}>{r.name}</option>
            ))}
          </select>
          {selRegion && (
            <button
              onClick={() => setSelRegion('')}
              style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-heading)', fontWeight: 700, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              × Limpiar
            </button>
          )}
        </div>

        {bucketTotals.length === 0 ? (
          <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>Sin datos de edad disponibles.</div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={bucketTotals} margin={{ top: 24, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid {...GRID} />
                <XAxis dataKey="bucket" tick={TICK} />
                <YAxis allowDecimals={false} domain={[0, 'auto']} tick={TICK} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="users" name="Usuarios" radius={[6, 6, 0, 0]} isAnimationActive={false}>
                  <LabelList
                    dataKey="users"
                    position="top"
                    style={{ fill: 'var(--color-pk-muted)', fontSize: 11, fontWeight: 700 }}
                  />
                  {bucketTotals.map((_, i) => (
                    <Cell key={i} fill={BUCKET_COLORS[i % BUCKET_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <NoFilterNotice />
          </>
        )}
      </SectionCard>

      {/* ── CROSS-ANALYSIS ── */}

      {/* ── 6. Engagement por región ── */}
      {engagement.length > 0 && (
        <SectionCard title="Engagement por región" sub="Promedio de equipos por usuario en cada región">
          <ResponsiveContainer width="100%" height={Math.max(180, engagement.length * 44)}>
            <BarChart
              data={engagement}
              layout="vertical"
              margin={{ top: 4, right: 80, left: 0, bottom: 4 }}
            >
              <defs>
                <linearGradient id="engGrad" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%"  stopColor="#22c55e" stopOpacity={1} />
                  <stop offset="100%" stopColor="#22c55e" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} horizontal={false} />
              <XAxis type="number" tick={TICK} tickFormatter={v => `${v}`} />
              <YAxis dataKey="region" type="category" width={145} tick={{ ...TICK, fontSize: 11 }} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = engagement.find(r => r.region === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 5 }}>{label}</div>
                      <div style={{ color: '#22c55e' }}>Promedio equipos/usuario: <strong>{d.avg_teams}</strong></div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>Usuarios totales: <strong>{d.total_users}</strong></div>
                      <div style={{ color: '#6890F0' }}>Tasa de actividad: <strong>{d.active_pct}%</strong></div>
                    </div>
                  );
                }}
              />
              <Bar dataKey="avg_teams" name="Promedio equipos" fill="url(#engGrad)" radius={[0, 4, 4, 0]}>
                <LabelList
                  dataKey="avg_teams"
                  position="right"
                  style={{ fill: 'var(--color-pk-muted)', fontSize: 11, fontWeight: 700 }}
                  formatter={v => `${v} eq.`}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 10 }}>
            Promedio de equipos activos por usuario en cada región. Regiones con mayor engagement son más propensas a usar la plataforma activamente.
          </p>
        </SectionCard>
      )}

      {/* ── 7. Uso de IA por región ── */}
      {aiByRegion.length > 0 && (
        <SectionCard title="Uso de IA por región" sub="Equipos creados con asistencia IA vs. manualmente, por región">
          <ResponsiveContainer width="100%" height={Math.max(180, aiByRegion.length * 44)}>
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
                      <div style={{ color: '#7c3aed' }}>IA: <strong>{d.ai_teams}</strong> equipos ({d.ai_pct}%)</div>
                      <div style={{ color: '#3b82f6' }}>Manual: <strong>{d.manual_teams}</strong> equipos</div>
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

      {/* ── 8. Edad vs Engagement ── */}
      {ageEngage.length > 0 && (
        <SectionCard title="Edad vs. engagement" sub="Promedio de equipos y preferencia IA por rango etario">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={ageEngage} margin={{ top: 24, right: 50, left: 0, bottom: 4 }}>
              <defs>
                <linearGradient id="ageGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#f59e0b" stopOpacity={1} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="bucket" tick={TICK} />
              <YAxis yAxisId="left"  allowDecimals={false} domain={[0, 'auto']} tick={TICK} label={{ value: 'prom. equipos', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: 'var(--color-pk-muted)' }, dx: -2 }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = ageEngage.find(r => r.bucket === label) || {};
                  return (
                    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 5 }}>Rango {label}</div>
                      <div style={{ color: '#f59e0b' }}>Prom. equipos: <strong>{d.avg_teams}</strong></div>
                      <div style={{ color: '#a855f7' }}>Prefiere IA: <strong>{d.prefers_ai_pct ?? 0}%</strong> de usuarios</div>
                      <div style={{ color: 'var(--color-pk-subtle)' }}>Usuarios: <strong>{d.total_users}</strong></div>
                    </div>
                  );
                }}
              />
              <Bar yAxisId="left" dataKey="avg_teams" name="Prom. equipos" fill="url(#ageGrad)" radius={[5, 5, 0, 0]} isAnimationActive={false}>
                <LabelList dataKey="avg_teams" position="top" style={{ fill: 'var(--color-pk-muted)', fontSize: 10, fontWeight: 700 }} />
              </Bar>
              <Bar yAxisId="right" dataKey="prefers_ai_pct" name="Prefiere IA (%)" fill="#a855f7" fillOpacity={0.7} radius={[3, 3, 0, 0]} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: 18, marginTop: 8 }}>
            {[['#f59e0b', 'Promedio equipos (eje izq.)'], ['#a855f7', '% prefiere IA (eje der.)']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--color-pk-subtle)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: 'inline-block' }} />
                {l}
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── 5. Top usuarios ── */}
      {users.length > 0 && (
        <SectionCard title="Usuarios más activos" sub="Top 10 por número de equipos creados — estado actual">
          {/* Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={LBL}>Mostrar:</span>
            <div style={{ display: 'flex', background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)', borderRadius: 8, overflow: 'hidden' }}>
              {[
                { val: false, label: 'Solo activos' },
                { val: true,  label: 'Todos' },
              ].map(opt => (
                <button
                  key={String(opt.val)}
                  onClick={() => setShowInactive(opt.val)}
                  style={{
                    padding: '6px 14px', fontSize: 12, cursor: 'pointer', border: 'none',
                    fontFamily: 'var(--font-heading)', fontWeight: 700, transition: 'all 0.12s',
                    background: showInactive === opt.val ? '#6890F0' : 'transparent',
                    color:      showInactive === opt.val ? '#fff'    : 'var(--color-pk-muted)',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <span style={{ fontSize: 12, color: 'var(--color-pk-muted)' }}>
              {topUsers.length} usuarios
            </span>
          </div>

          {topUsers.length === 0 ? (
            <div style={{ color: 'var(--color-pk-muted)', fontSize: 13 }}>No hay usuarios para mostrar.</div>
          ) : (
            <div>
              {topUsers.map((u, i) => (
                <div
                  key={u.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '10px 8px',
                    borderBottom: '1px solid var(--color-pk-border)', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  {/* Rank */}
                  <div style={{
                    width: 28, textAlign: 'center', flexShrink: 0, fontSize: i < 3 ? 16 : 13,
                    fontWeight: 800, fontFamily: 'var(--font-heading)',
                    color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--color-pk-muted)',
                  }}>
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: u.is_admin
                      ? 'linear-gradient(135deg,#f59e0b,#dc2626)'
                      : 'linear-gradient(135deg,#ef4444,#6890F0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 800, color: '#fff', fontFamily: 'var(--font-heading)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}>
                    {u.username.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info + mini bar */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {u.username}
                      </span>
                      {u.is_admin && (
                        <span style={{ fontSize: 9, fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 20, padding: '2px 6px', flexShrink: 0 }}>
                          Admin
                        </span>
                      )}
                    </div>
                    {/* Relative progress bar */}
                    <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${maxTeams > 0 ? ((u.teams ?? 0) / maxTeams) * 100 : 0}%`,
                        background: i === 0 ? '#f59e0b' : '#6890F0',
                        borderRadius: 2, transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>

                  {/* Teams count */}
                  <div style={{ textAlign: 'right', flexShrink: 0, marginRight: 10 }}>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--color-pk-text)', lineHeight: 1 }}>
                      {u.teams ?? 0}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--color-pk-muted)' }}>equipos</div>
                  </div>

                  {/* Status badge */}
                  <span style={{
                    fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', flexShrink: 0,
                    background: u.is_active !== false ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    border:     u.is_active !== false ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(239,68,68,0.3)',
                    color:      u.is_active !== false ? '#4ade80' : '#fca5a5',
                    borderRadius: 20, padding: '3px 9px', whiteSpace: 'nowrap',
                  }}>
                    {u.is_active !== false ? '● Activo' : '○ Inact.'}
                  </span>
                </div>
              ))}
            </div>
          )}
          <NoFilterNotice />
        </SectionCard>
      )}
    </div>
  );
}
