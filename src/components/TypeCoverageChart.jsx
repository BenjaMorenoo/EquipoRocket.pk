// src/components/TypeCoverageChart.jsx
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Cell,
} from 'recharts';
import { calculateTeamWeaknesses, getTypeColor, ALL_TYPES } from '../utils/typeColors';

/* ── Radar: individual Pokemon stats ─────────────────────────────────────── */
export function PokemonStatsRadar({ pokemon }) {
  if (!pokemon) return null;

  const statMap = {
    hp: 'HP', attack: 'Atk', defense: 'Def',
    'special-attack': 'SpA', 'special-defense': 'SpD', speed: 'Vel',
  };

  const data = pokemon.stats.map((s) => ({
    stat: statMap[s.stat.name] || s.stat.name,
    value: s.base_stat,
    fullMark: 255,
  }));

  return (
    <div style={{ width: '100%', height: '200px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="var(--color-pk-border)" />
          <PolarAngleAxis dataKey="stat" tick={{ fill: 'var(--color-pk-subtle)', fontSize: 11, fontFamily: 'var(--font-body)' }} />
          <PolarRadiusAxis domain={[0, 255]} tick={false} axisLine={false} />
          <Radar
            dataKey="value"
            stroke="var(--color-pk-red)"
            fill="var(--color-pk-red)"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-pk-card)',
              border: '1px solid var(--color-pk-border-light)',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-pk-text)',
            }}
            formatter={(v) => [v, 'Base']}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Bar: team weakness analysis ─────────────────────────────────────────── */
export function TeamWeaknessChart({ team }) {
  const filledTeam = team.filter(Boolean);
  if (filledTeam.length === 0) return (
    <div style={{
      height: '180px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '8px',
      color: 'var(--color-pk-muted)',
    }}>
      <span style={{ fontSize: '28px' }}>📊</span>
      <span style={{ fontSize: '12px', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Agrega Pokémon para ver el análisis
      </span>
    </div>
  );

  const weaknesses = calculateTeamWeaknesses(filledTeam);

  const data = ALL_TYPES.map((type) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    rawType: type,
    score: weaknesses[type] || 0,
  })).sort((a, b) => b.score - a.score).slice(0, 12);

  const CustomBar = (props) => {
    const { x, y, width, height, rawType } = props;
    const colors = getTypeColor(rawType);
    return (
      <rect
        x={x} y={y} width={width} height={height}
        fill={colors.bg}
        rx={3} ry={3}
        opacity={0.85}
      />
    );
  };

  return (
    <div style={{ width: '100%', height: '180px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 20 }}>
          <XAxis
            dataKey="type"
            tick={{ fill: 'var(--color-pk-subtle)', fontSize: 9, fontFamily: 'var(--font-body)' }}
            angle={-40}
            textAnchor="end"
            interval={0}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-pk-border)' }}
          />
          <YAxis
            tick={{ fill: 'var(--color-pk-muted)', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            tickCount={4}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-pk-card)',
              border: '1px solid var(--color-pk-border-light)',
              borderRadius: '8px',
              fontSize: '12px',
              fontFamily: 'var(--font-body)',
              color: 'var(--color-pk-text)',
            }}
            formatter={(v, _n, props) => {
              const label = v > 0 ? `${v} debilidad(es)` : v < 0 ? `${Math.abs(v)} resist.` : 'Neutro';
              return [label, props.payload.type];
            }}
            cursor={{ fill: 'rgba(255,255,255,0.03)' }}
          />
          <Bar dataKey="score" shape={<CustomBar />}>
            {data.map((entry) => (
              <Cell key={entry.rawType} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ── Type coverage grid ──────────────────────────────────────────────────── */
export function TypeCoverageGrid({ team }) {
  const filledTeam = team.filter(Boolean);

  return (
    <div style={{
      display: 'flex',
      flexWrap: 'wrap',
      gap: '5px',
    }}>
      {ALL_TYPES.map((type) => {
        // Check if any team member has this type as STABs
        const covered = filledTeam.some((pk) =>
          pk?.types?.some((t) => t.type.name === type)
        );
        const colors = getTypeColor(type);

        return (
          <div
            key={type}
            style={{
              padding: '3px 10px',
              borderRadius: '6px',
              background: covered ? colors.light : 'var(--color-pk-surface)',
              border: `1px solid ${covered ? colors.border : 'var(--color-pk-border)'}`,
              color: covered ? colors.bg : 'var(--color-pk-muted)',
              fontSize: '10px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              transition: 'all 0.2s ease',
            }}
          >
            {type}
          </div>
        );
      })}
    </div>
  );
}
