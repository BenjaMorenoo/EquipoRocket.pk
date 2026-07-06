// src/pages/Simulations.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeams, getPublicTeams, getBackendPokemon, getPokemon, simulateBattle, updateTeam } from '../services/api';
import { postTeamFeedback } from '../services/api';
import { FaPlay, FaVial, FaChartLine } from 'react-icons/fa';

export default function Simulations({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [rivalTeams, setRivalTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opponentTeam, setOpponentTeam] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);
  const [bestTeamSprites, setBestTeamSprites] = useState({});

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (user) {
          const [teamsData, publicData] = await Promise.all([getTeams(), getPublicTeams()]);
          // normalize response: accept several backend shapes:
          // - Array of teams
          // - { teams: [...] }
          // - { data: { teams: [...] } }
          // - { data: [...] }
          let normalized = [];
          if (Array.isArray(teamsData)) normalized = teamsData;
          else if (teamsData?.teams && Array.isArray(teamsData.teams)) normalized = teamsData.teams;
          else if (teamsData?.data?.teams && Array.isArray(teamsData.data.teams)) normalized = teamsData.data.teams;
          else if (teamsData?.data && Array.isArray(teamsData.data)) normalized = teamsData.data;
          else normalized = [];
          if (mounted) setTeams(normalized);
          // normalize public teams
          let pnorm = [];
          if (Array.isArray(publicData)) pnorm = publicData;
          else if (publicData?.data && Array.isArray(publicData.data)) pnorm = publicData.data;
          else if (publicData?.data?.teams && Array.isArray(publicData.data.teams)) pnorm = publicData.data.teams;
          else if (publicData?.teams && Array.isArray(publicData.teams)) pnorm = publicData.teams;
          if (mounted) setRivalTeams(pnorm);
        }
      } catch (e) {
        console.error('Error cargando equipos', e.message);
        if (mounted) setTeams([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user]);

  useEffect(() => {
    const entries = simulationResult?.best_team;
    if (!entries?.length) return;
    const toApiName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, '-');
    let cancelled = false;
    (async () => {
      const map = {};
      await Promise.all(entries.map(async (p) => {
        const apiName = toApiName(p?.name || p?.pokemon || '');
        if (!apiName) return;
        try {
          const poke = await getPokemon(apiName);
          const url = poke?.sprites?.other?.['official-artwork']?.front_default || poke?.sprites?.front_default || null;
          if (url) map[apiName] = url;
        } catch { /* ignore missing sprites */ }
      }));
      if (!cancelled) setBestTeamSprites(map);
    })();
    return () => { cancelled = true; };
  }, [simulationResult?.best_team]);

  const handleSimulate = async () => {
    if (!selectedTeam || !opponentTeam) {
      alert('Selecciona ambos equipos antes de simular');
      return;
    }

    setSimulating(true);
    try {
      // Call montecarlo microservice
      const payload = {
        user_id: user?.id || null,
        team: (selectedTeam.pokemon || []).map(p => p.name || p.pokemon?.name || p),
        opponent: (opponentTeam.pokemon || []).map(p => p.name || p.pokemon?.name || p),
        team_a_id: selectedTeam?.id || null,
        team_b_id: opponentTeam?.id || null,
        api_url: import.meta.env.VITE_MONTECARLO_API_URL || undefined,
        iterations: 100,
        sims: 500,
      };
      const res = await simulateBattle(payload);
      console.debug('simulate response', res);
      // Accept responses that explicitly include success=true or at least return win_rate
      if (res && (res.success === true || typeof res.win_rate !== 'undefined')) {
        const r = res;
        const pct = Math.round(r.win_rate || 0);
        const oppPct = Math.round(r.opponent_win_rate != null ? r.opponent_win_rate : (100 - pct));
        setSimulationResult({ winRate: pct, oppWinRate: oppPct, summary: `Win rate ${pct}%`, best_team: r.best_team, sims: payload.sims || 500 });
      } else {
        throw new Error('Simulation failed');
      }
    } catch (e) {
      console.error('Error simulando batalla', e.message);
      alert('Error al simular la batalla: ' + e.message);
    } finally {
      setSimulating(false);
    }
  };

  const enrichTeam = async (team) => {
    if (!team) return null;
    const pokemons = team.pokemon || [];
    const enriched = await Promise.all(pokemons.map(async (p) => {
      const name = p.name || p.id || p;
      try {
        // try backend first
        const b = await getBackendPokemon(name);
        if (b && (b.sprites || b.sprites?.front_default)) {
          return { ...p, sprites: b.sprites || b };
        }
      } catch (e) {
        // ignore and fallback to pokeapi
      }
      try {
        const poke = await getPokemon(name);
        return { ...p, sprites: poke?.sprites || null, types: poke?.types || [], stats: poke?.stats || [] };
      } catch (e) {
        return { ...p, sprites: null };
      }
    }));
    return { ...team, pokemon: enriched };
  };

  if (!user) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <FaVial style={{ fontSize: 56, marginBottom: 20 }} />
        <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 32, margin: '0 0 12px' }}>
          Simulaciones
        </h1>
        <p style={{ color: 'var(--color-pk-muted)', marginBottom: 24 }}>
          Necesitas iniciar sesión para usar el simulador
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <div style={{ display: 'inline-block', width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-pk-border)', borderTopColor: 'var(--color-pk-red)', animation: 'spin .8s linear infinite' }} />
      </div>
    );
  }

  const fullTeams = teams.filter(t => (t.pokemon?.length || 0) === 6);
  const fullRivalTeams = rivalTeams.filter(t => (t.pokemon?.length || 0) === 6);

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <FaVial style={{ fontSize: 28, color: 'var(--color-pk-red)' }} />
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 32, margin: 0 }}>Simulaciones</h1>
        </div>
        <p style={{ color: 'var(--color-pk-muted)', margin: 0 }}>Compara tus equipos contra otros y obtén predicciones de win rate.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Panel izquierdo: Tu equipo */}
        <div className="pk-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Tu Equipo
          </h2>

          {fullTeams.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-pk-muted)' }}>
              <p>No tienes equipos con 6 Pokémon.</p>
              <button
                onClick={() => onNavigate('builder')}
                className="pk-btn pk-btn-primary"
                style={{ padding: '8px 16px', fontSize: 13, marginTop: 12 }}
              >
                Crear Equipo
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {fullTeams.map((team) => (
                <button
                  key={team.id}
                  onClick={async () => {
                    const enriched = await enrichTeam(team);
                    setSelectedTeam(enriched || team);
                  }}
                  className={selectedTeam?.id === team.id ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'}
                  style={{
                    padding: 12,
                    textAlign: 'left',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 14,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontWeight: 700 }}>{team.name}</div>
                      {team.created_by === 'ai' ? (
                        <div style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', color: 'var(--color-pk-blue)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>IA</div>
                      ) : (
                        <div style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--color-pk-muted)', borderRadius: 6, padding: '2px 6px', fontSize: 11, fontWeight: 700 }}>Manual</div>
                      )}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {team.pokemon?.length || 0} Pokémon
                    </div>
                  </div>
                    {selectedTeam?.id === team.id && (
                    <div style={{ fontSize: 12, fontWeight: 700 }}>✓ SELECCIONADO</div>
                  )}
                    {/* Feedback buttons removed from Simulations page — present only in Mis Equipos */}
                </button>
              ))}
            </div>
          )}
          {selectedTeam && (
            <div style={{ marginTop: 16, padding: 12, background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: 8 }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedTeam.name}</div>
              <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 8 }}>Synergy: {selectedTeam.synergy_score ?? selectedTeam.synergy ?? '—'}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(selectedTeam.pokemon || []).map((p, i) => (
                  <div key={i} style={{ width: 56, textAlign: 'center' }}>
                    <img src={p.sprites?.front_default || p.sprites?.front_shiny || '/placeholder.png'} alt={p.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                    <div style={{ fontSize: 11, marginTop: 4 }}>{p.name}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Panel derecho: Equipo contrario */}
        <div className="pk-card" style={{ padding: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 16, margin: '0 0 16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Equipo Contrario
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                Selecciona un equipo rival:
              </label>
              <select
                value={opponentTeam?.id || ''}
                onChange={async (e) => {
                  const teamId = e.target.value;
                  if (teamId) {
                    if (teamId === 'random') { setOpponentTeam({ id: 'random', name: 'Equipo Aleatorio' }); return; }
                    // search among own teams and rival teams
                    let found = teams.find(t => String(t.id) === String(teamId));
                    if (!found) found = rivalTeams.find(t => String(t.id) === String(teamId));
                    if (found) {
                      const enriched = await enrichTeam(found);
                      // preserve owner info if present on the original
                      const final = { ...(found.owner_username ? { owner_username: found.owner_username, owner_id: found.owner_id } : {}), ...(enriched || found) };
                      setOpponentTeam(final);
                    } else {
                      setOpponentTeam({ id: Number(teamId), name: `Equipo ${teamId}` });
                    }
                  } else {
                    setOpponentTeam(null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'var(--color-pk-surface)',
                  border: '1px solid var(--color-pk-border)',
                  color: 'var(--color-pk-text)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <option value="">-- Selecciona un equipo --</option>
                <optgroup label="Mis equipos">
                  {fullTeams.map((team) => (
                    <option key={`mine-${team.id}`} value={team.id}>
                      {team.name} (6 Pokémon)
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Equipos rivales">
                  {fullRivalTeams.map((team) => (
                    <option key={`r-${team.id}`} value={team.id}>
                      {team.name} — {team.owner_username || team.owner_id || 'Usuario'} (6 Pokémon)
                    </option>
                  ))}
                </optgroup>
                <option value="random">-- Equipo Aleatorio (próximamente) --</option>
              </select>
            </div>

            {opponentTeam && (
              <div
                style={{
                  padding: 12,
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: 8,
                  fontSize: 13,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Equipo seleccionado:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div>{opponentTeam.name}</div>
                    <div style={{ marginLeft: 'auto', fontSize: 12, opacity: 0.8 }}>Synergy: {opponentTeam.synergy_score ?? opponentTeam.synergy ?? '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {(opponentTeam.pokemon || []).map((p, i) => (
                      <div key={i} style={{ width: 56, textAlign: 'center' }}>
                        <img src={p.sprites?.front_default || p.sprites?.front_shiny || '/placeholder.png'} alt={p.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                        <div style={{ fontSize: 11, marginTop: 4 }}>{p.name}</div>
                      </div>
                    ))}
                  </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón simular */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <button
          onClick={handleSimulate}
          disabled={!selectedTeam || !opponentTeam || simulating}
          className="pk-btn pk-btn-primary"
          style={{
            padding: '12px 32px',
            fontSize: 15,
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            opacity: (!selectedTeam || !opponentTeam || simulating) ? 0.5 : 1,
            cursor: (!selectedTeam || !opponentTeam || simulating) ? 'not-allowed' : 'pointer',
          }}
        >
          <FaPlay /> {simulating ? 'Simulando...' : 'Simular Batalla'}
        </button>
      </div>

      {/* Resultados */}
      {simulationResult && (() => {
        const wr = simulationResult.winRate;
        const oppWr = simulationResult.oppWinRate ?? (100 - wr);
        const fmtName = (s) => (s || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const diff = wr - oppWr;
        const verdict = diff >= 15 ? '¡Victoria clara!' : diff >= 5 ? 'Ligera ventaja' : diff >= -5 ? 'Combate parejo' : diff >= -15 ? 'Ligera desventaja' : 'Desfavorable';
        const verdictColor = diff >= 5 ? '#22c55e' : diff >= -5 ? '#f59e0b' : '#ef4444';

        return (
          <div className="pk-card fade-up" style={{ overflow: 'hidden', border: '1px solid var(--color-pk-border)' }}>

            {/* Header strip */}
            <div style={{
              padding: '16px 28px',
              background: 'linear-gradient(90deg, rgba(34,197,94,0.12), rgba(59,130,246,0.12))',
              borderBottom: '1px solid var(--color-pk-border)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}>
              <FaChartLine style={{ color: verdictColor, fontSize: 20 }} />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Resultado de Simulación
              </span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14, color: verdictColor }}>
                {verdict}
              </span>
            </div>

            {/* VS matchup row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 0, padding: '28px 28px 0' }}>
              {/* Team A */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-heading)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: 6 }}>Tu Equipo</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--color-pk-text)' }}>{selectedTeam?.name || '—'}</div>
                <div style={{
                  fontSize: 64,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  lineHeight: 1,
                  background: wr >= 50 ? 'linear-gradient(135deg, #22c55e, #86efac)' : 'linear-gradient(135deg, #ef4444, #fca5a5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{wr}%</div>
                <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 4, fontFamily: 'var(--font-heading)', letterSpacing: '0.06em' }}>WIN RATE</div>
              </div>

              {/* VS badge */}
              <div style={{ padding: '0 20px', textAlign: 'center' }}>
                <div style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: 'var(--color-pk-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  fontSize: 16,
                  color: '#fff',
                  letterSpacing: '0.04em',
                  boxShadow: '0 4px 16px rgba(220,38,38,0.35)',
                }}>VS</div>
              </div>

              {/* Team B */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, fontFamily: 'var(--font-heading)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: 6 }}>Equipo Rival</div>
                <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--color-pk-text)' }}>{opponentTeam?.name || '—'}</div>
                <div style={{
                  fontSize: 64,
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 900,
                  lineHeight: 1,
                  background: oppWr >= 50 ? 'linear-gradient(135deg, #22c55e, #86efac)' : 'linear-gradient(135deg, #ef4444, #fca5a5)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>{oppWr}%</div>
                <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', marginTop: 4, fontFamily: 'var(--font-heading)', letterSpacing: '0.06em' }}>WIN RATE</div>
              </div>
            </div>

            {/* Probability bar */}
            <div style={{ padding: '20px 28px 28px' }}>
              <div style={{ position: 'relative', height: 14, borderRadius: 99, overflow: 'hidden', background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${Math.round(wr / (wr + oppWr) * 100)}%`,
                  background: diff >= 0 ? 'linear-gradient(90deg, #16a34a, #22c55e)' : 'linear-gradient(90deg, #dc2626, #ef4444)',
                  transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                  borderRadius: 99,
                }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                <span style={{ color: wr >= 50 ? '#22c55e' : '#ef4444' }}>{selectedTeam?.name} {wr}%</span>
                <span style={{ color: oppWr >= 50 ? '#22c55e' : '#ef4444' }}>{oppWr}% {opponentTeam?.name}</span>
              </div>
            </div>

            {/* Best team config */}
            {simulationResult.best_team && Array.isArray(simulationResult.best_team) && simulationResult.best_team.length > 0 && (
              <div style={{ padding: '0 28px 28px' }}>
                <div style={{
                  borderTop: '1px solid var(--color-pk-border)',
                  paddingTop: 24,
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Mejor Configuración Sugerida
                  </div>
                  {selectedTeam?.id && (
                    <button
                      className="pk-btn pk-btn-primary"
                      onClick={async () => {
                        const ok = window.confirm('¿Deseas traspasar la configuración (moves/ability/item) al equipo seleccionado? Esto sobrescribirá los datos actuales.');
                        if (!ok) return;
                        try {
                          const normalize = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, '-');
                          const bestByName = {};
                          for (const b of (simulationResult.best_team || [])) {
                            bestByName[normalize(b.name)] = b;
                          }
                          const updatedPokemons = (selectedTeam.pokemon || []).map((pk, idx) => {
                            const best = bestByName[normalize(pk.name)];
                            return {
                              id: pk.pokemon_id || pk.id,
                              name: pk.name,
                              slot: pk.slot || idx + 1,
                              ability: best?.ability || pk.ability || null,
                              item: best?.item || pk.item || null,
                              spread_id: pk.spread_id || null,
                              moves: best?.moves?.length ? best.moves : (pk.moves?.map(m => (typeof m === 'object' ? m.name : m)) || []),
                            };
                          });
                          await updateTeam(selectedTeam.id, { name: selectedTeam.name, pokemon: updatedPokemons });
                          alert('Movimientos traspasados correctamente al equipo.');
                        } catch (e) {
                          console.error('Persist error', e.message || e);
                          alert('No se pudo traspasar: ' + (e.message || e));
                        }
                      }}
                      style={{ padding: '8px 18px', fontSize: 13 }}
                    >
                      Traspasar al Equipo →
                    </button>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                  {simulationResult.best_team.map((p, idx) => {
                    const name = p?.name || p?.pokemon || `#${idx + 1}`;
                    const toApiName = (s) => (s || '').toLowerCase().trim().replace(/\s+/g, '-');
                    const sprite = bestTeamSprites[toApiName(name)] || p?.sprites?.other?.['official-artwork']?.front_default || p?.sprites?.front_default || null;
                    const ability = typeof p?.ability === 'string' ? p.ability : (p?.ability?.ability || p?.ability?.name || null);
                    const item = typeof p?.item === 'string' ? p.item : (p?.item?.item || p?.item?.name || null);
                    const moves = (Array.isArray(p?.moves) ? p.moves : [])
                      .map(m => (typeof m === 'string' ? m : (m?.move || m?.name || null)))
                      .filter(Boolean);

                    return (
                      <div key={idx} style={{
                        background: 'var(--color-pk-surface)',
                        border: '1px solid var(--color-pk-border)',
                        borderRadius: 12,
                        padding: '14px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        transition: 'border-color 0.15s',
                      }}>
                        {/* Sprite */}
                        <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-pk-card)', borderRadius: 10 }}>
                          {sprite
                            ? <img src={sprite} alt={name} style={{ width: 64, height: 64, objectFit: 'contain' }} />
                            : <span style={{ fontSize: 28, fontFamily: 'var(--font-heading)', fontWeight: 900, color: 'var(--color-pk-muted)', textTransform: 'uppercase' }}>{name.charAt(0)}</span>
                          }
                        </div>

                        {/* Name */}
                        <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 13, textAlign: 'center', color: 'var(--color-pk-text)', textTransform: 'capitalize' }}>
                          {fmtName(name)}
                        </div>

                        {/* Ability & Item badges */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%' }}>
                          {ability && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 6, padding: '3px 7px' }}>
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#60a5fa', letterSpacing: '0.06em', textTransform: 'uppercase' }}>HAB</span>
                              <span style={{ fontSize: 11, color: 'var(--color-pk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ability}</span>
                            </div>
                          )}
                          {item && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 6, padding: '3px 7px' }}>
                              <span style={{ fontSize: 9, fontFamily: 'var(--font-heading)', fontWeight: 700, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>OBJ</span>
                              <span style={{ fontSize: 11, color: 'var(--color-pk-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item}</span>
                            </div>
                          )}
                        </div>

                        {/* Move chips */}
                        {moves.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center', width: '100%' }}>
                            {moves.map((mv, mi) => (
                              <span key={mi} style={{
                                background: 'rgba(220,38,38,0.08)',
                                border: '1px solid rgba(220,38,38,0.18)',
                                color: 'var(--color-pk-text)',
                                borderRadius: 5,
                                padding: '2px 6px',
                                fontSize: 10,
                                fontFamily: 'var(--font-heading)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                maxWidth: '100%',
                                textOverflow: 'ellipsis',
                              }}>{mv}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-up { animation: fadeUp 0.3s ease; }
      `}</style>
    </div>
  );
}
