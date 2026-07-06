import { useEffect, useState } from 'react';
import {
  getMostUsedPokemon, getUsersByRegion, getAIUsageByRegion, getTypeWinRates,
} from '../services/api';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';

const TICK = { fontSize: 11, fill: 'var(--color-pk-subtle)' };
const GRID = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' };

const TYPE_COLORS = {
  normal:'#A8A878', fire:'#F08030', water:'#6890F0', electric:'#F8D030',
  grass:'#78C850', ice:'#98D8D8', fighting:'#C03028', poison:'#A040A0',
  ground:'#E0C068', flying:'#A890F0', psychic:'#F85888', bug:'#A8B820',
  rock:'#B8A038', ghost:'#705898', dragon:'#7038F8', dark:'#705848',
  steel:'#B8B8D0', fairy:'#EE99AC',
};
const PALETTE = ['#6890F0','#f59e0b','#22c55e','#ef4444','#a855f7','#ec4899','#14b8a6','#f97316','#84cc16','#06b6d4'];
const typeColor = t => TYPE_COLORS[t?.toLowerCase()] || '#6b7280';
const formatName = n => (n || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function MiniCard({ title, sub, children, accent = '#f59e0b', loading, empty, emptyMsg = 'Sin datos', onClick }) {
  return (
    <div
      className="pk-card"
      onClick={onClick}
      style={{
        padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: 320,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = `${accent}50`; e.currentTarget.style.background = `${accent}06`; } }}
      onMouseLeave={e => { if (onClick) { e.currentTarget.style.borderColor = ''; e.currentTarget.style.background = ''; } }}
    >
      <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12,
            letterSpacing: '0.08em', textTransform: 'uppercase', color: accent,
          }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {onClick && <span style={{ fontSize: 12, color: `${accent}80`, flexShrink: 0, marginLeft: 8 }}>→</span>}
      </div>
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 12, gap: 8 }}>
          <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: accent, display: 'inline-block', animation: 'spin .8s linear infinite' }} />
          Cargando...
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      ) : empty ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-pk-muted)', fontSize: 12 }}>{emptyMsg}</div>
      ) : children}
    </div>
  );
}

/* ── Tooltip genérico ── */
function CardTip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 9, padding: '9px 13px', fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: 'var(--color-pk-text)', marginBottom: 4 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ color: p.fill || p.color || 'var(--color-pk-subtle)' }}>
          {p.name ?? p.dataKey}: <strong>{formatter ? formatter(p.value) : p.value}</strong>
        </div>
      ))}
    </div>
  );
}

/* ── 1. Pokémon más usados (top 6) ── */
function TopPokemonChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={TICK} />
        <YAxis
          dataKey="pokemon_name" type="category" width={100}
          tick={{ ...TICK, fontSize: 11 }}
          tickFormatter={formatName}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = data.find(r => r.pokemon_name === label) || {};
            return (
              <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 9, padding: '9px 13px', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: typeColor(d.type1), marginBottom: 4 }}>{formatName(label)}</div>
                <div style={{ color: 'var(--color-pk-subtle)' }}>Equipos: <strong>{d.uses}</strong></div>
                {d.type1 && <div style={{ color: 'var(--color-pk-muted)', fontSize: 11 }}>Tipo: {d.type1}</div>}
              </div>
            );
          }}
        />
        <Bar dataKey="uses" name="Equipos" radius={[0, 5, 5, 0]} isAnimationActive={false}>
          {data.map((entry, i) => (
            <Cell key={entry.pokemon_name ?? i} fill={typeColor(entry.type1) || PALETTE[i % PALETTE.length]} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── 2. Usuarios por región ── */
function ByRegionChart({ data }) {
  const total = data.reduce((s, d) => s + Number(d.total ?? 0), 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px', gap: 12, alignItems: 'center' }}>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={TICK} />
          <YAxis
            dataKey="region" type="category" width={95}
            tick={{ ...TICK, fontSize: 10 }}
          />
          <Tooltip content={<CardTip />} />
          <Bar dataKey="total" name="Usuarios" radius={[0, 5, 5, 0]} isAnimationActive={false}>
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        {data.slice(0, 8).map((d, i) => {
          const v = Number(d.total ?? 0);
          const pct = total ? Math.round(v / total * 100) : 0;
          return (
            <div key={d.region} style={{ fontSize: 11 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                <span style={{ color: 'var(--color-pk-muted)', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.region}</span>
                <span style={{ fontWeight: 700, color: PALETTE[i % PALETTE.length] }}>{pct}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 2, background: 'var(--color-pk-border)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: PALETTE[i % PALETTE.length] }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── 3. IA vs Manual (donut global) ── */
function AIvsManualChart({ data }) {
  const totalAI     = data.reduce((s, r) => s + Number(r.ai_teams     ?? 0), 0);
  const totalManual = data.reduce((s, r) => s + Number(r.manual_teams ?? 0), 0);
  const total       = totalAI + totalManual;
  const aiPct       = total ? Math.round(totalAI / total * 100) : 0;
  const manPct      = 100 - aiPct;

  const pieData = [
    { name: 'IA',     value: totalAI,     fill: '#7c3aed' },
    { name: 'Manual', value: totalManual, fill: '#3b82f6' },
  ].filter(d => d.value > 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'center' }}>
      <div style={{ position: 'relative' }}>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={45} outerRadius={68} paddingAngle={3}>
              {pieData.map(d => <Cell key={d.name} fill={d.fill} stroke="transparent" />)}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const p = payload[0];
                const pct = total ? Math.round(p.value / total * 100) : 0;
                return (
                  <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 9, padding: '8px 12px', fontSize: 12 }}>
                    <span style={{ color: p.payload.fill, fontWeight: 700 }}>{p.name}: {p.value} ({pct}%)</span>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20, color: '#7c3aed', lineHeight: 1 }}>{aiPct}%</div>
          <div style={{ fontSize: 9, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>IA</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { label: 'Asistidos por IA', value: totalAI,     pct: aiPct,  color: '#7c3aed' },
          { label: 'Creados manual',   value: totalManual, pct: manPct, color: '#3b82f6' },
          { label: 'Total equipos',    value: total,       pct: null,   color: 'var(--color-pk-muted)' },
        ].map(r => (
          <div key={r.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>{r.label}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-heading)', color: r.color }}>
                {r.value}{r.pct !== null ? ` (${r.pct}%)` : ''}
              </span>
            </div>
            {r.pct !== null && (
              <div style={{ height: 4, borderRadius: 2, background: 'var(--color-pk-border)' }}>
                <div style={{ height: '100%', borderRadius: 2, width: `${r.pct}%`, background: r.color }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 4. Win rate por tipo (top 8) ── */
function TypeWinRateChart({ data }) {
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 55, left: 0, bottom: 0 }}>
        <CartesianGrid {...GRID} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={TICK} tickFormatter={v => `${v}%`} />
        <YAxis
          dataKey="type" type="category" width={72}
          tick={{ ...TICK, fontSize: 11 }}
          tickFormatter={t => t ? t.charAt(0).toUpperCase() + t.slice(1) : t}
        />
        <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const d = top.find(r => r.type === label) || {};
            return (
              <div style={{ background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)', borderRadius: 9, padding: '9px 13px', fontSize: 12 }}>
                <div style={{ fontWeight: 700, color: typeColor(label), marginBottom: 3 }}>{label?.charAt(0).toUpperCase() + label?.slice(1)}</div>
                <div style={{ color: 'var(--color-pk-subtle)' }}>Win rate: <strong style={{ color: Number(d.win_rate) >= 50 ? '#22c55e' : '#ef4444' }}>{d.win_rate}%</strong></div>
                <div style={{ color: 'var(--color-pk-muted)', fontSize: 11 }}>{d.wins} victorias / {d.participations} partidas</div>
              </div>
            );
          }}
        />
        <Bar dataKey="win_rate" name="Win rate" radius={[0, 5, 5, 0]} isAnimationActive={false}>
          {top.map(entry => (
            <Cell key={entry.type} fill={typeColor(entry.type)} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/* ── Main component ── */
export default function AdminDashboardCharts({ onSection }) {
  const [pokemon,  setPokemon]  = useState([]);
  const [regions,  setRegions]  = useState([]);
  const [aiData,   setAiData]   = useState([]);
  const [winRates, setWinRates] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      getMostUsedPokemon(6),
      getUsersByRegion(),
      getAIUsageByRegion(),
      getTypeWinRates(),
    ]).then(([pkm, reg, ai, wr]) => {
      if (!mounted) return;
      setPokemon(pkm.status === 'fulfilled' ? (pkm.value?.data ?? []) : []);
      setRegions(reg.status === 'fulfilled' ? (reg.value?.data ?? []) : []);
      setAiData(ai.status  === 'fulfilled' ? (ai.value?.data  ?? []) : []);
      setWinRates(wr.status === 'fulfilled' ? (wr.value?.data  ?? []) : []);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16, marginBottom: 28 }}>

      <MiniCard
        title="Pokémon más usados"
        sub="Top 6 en equipos activos"
        accent="#ef4444"
        loading={loading}
        empty={!loading && pokemon.length === 0}
        emptyMsg="Sin datos de Pokémon"
        onClick={onSection ? () => onSection('analysis-pokemon') : undefined}
      >
        <TopPokemonChart data={pokemon} />
      </MiniCard>

      <MiniCard
        title="Usuarios por región"
        sub="Distribución geográfica actual"
        accent="#6890F0"
        loading={loading}
        empty={!loading && regions.length === 0}
        emptyMsg="Sin datos de regiones"
        onClick={onSection ? () => onSection('analysis-users') : undefined}
      >
        <ByRegionChart data={regions} />
      </MiniCard>

      <MiniCard
        title="IA vs. Manual"
        sub="Método de creación de equipos (global)"
        accent="#7c3aed"
        loading={loading}
        empty={!loading && aiData.length === 0}
        emptyMsg="Sin datos de equipos"
        onClick={onSection ? () => onSection('analysis-teams') : undefined}
      >
        <AIvsManualChart data={aiData} />
      </MiniCard>

      <MiniCard
        title="Win rate por tipo"
        sub="Top 8 tipos en simulaciones Monte Carlo"
        accent="#22c55e"
        loading={loading}
        empty={!loading && winRates.length === 0}
        emptyMsg="Sin simulaciones registradas aún"
        onClick={onSection ? () => onSection('analysis-simulations') : undefined}
      >
        <TypeWinRateChart data={winRates} />
      </MiniCard>

    </div>
  );
}
