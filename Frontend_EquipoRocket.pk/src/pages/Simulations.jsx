// src/pages/Simulations.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getTeams } from '../services/api';
import { FaPlay, FaVial, FaChartLine } from 'react-icons/fa';

export default function Simulations({ onNavigate }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [opponentTeam, setOpponentTeam] = useState(null);
  const [simulationResult, setSimulationResult] = useState(null);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        if (user) {
          const teamsData = await getTeams();
          // normalize response: accept either an array or an object with `teams` key
          let normalized = [];
          if (Array.isArray(teamsData)) normalized = teamsData;
          else if (teamsData && Array.isArray(teamsData.teams)) normalized = teamsData.teams;
          else if (teamsData && Array.isArray(teamsData.data)) normalized = teamsData.data;
          else normalized = [];
          if (mounted) setTeams(normalized);
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

  const handleSimulate = async () => {
    if (!selectedTeam || !opponentTeam) {
      alert('Selecciona ambos equipos antes de simular');
      return;
    }

    setSimulating(true);
    try {
      // TODO: Llamar al backend de simulaciones cuando esté implementado
      // const result = await simulateBattle(selectedTeam.id, opponentTeam.id);
      
      // Por ahora: simular resultado aleatorio
      const winRate = Math.round(Math.random() * 100);
      const result = {
        winRate,
        matchups: [],
        summary: `Tu equipo tiene un ${winRate}% de probabilidad de ganar`
      };
      
      setSimulationResult(result);
    } catch (e) {
      console.error('Error simulando batalla', e.message);
      alert('Error al simular la batalla: ' + e.message);
    } finally {
      setSimulating(false);
    }
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

          {teams.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-pk-muted)' }}>
              <p>No tienes equipos creados.</p>
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
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => setSelectedTeam(team)}
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
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{team.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      {team.pokemons?.length || 0} Pokémon
                    </div>
                  </div>
                  {selectedTeam?.id === team.id && (
                    <div style={{ fontSize: 12, fontWeight: 700 }}>✓ SELECCIONADO</div>
                  )}
                </button>
              ))}
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
                onChange={(e) => {
                  const teamId = e.target.value;
                  if (teamId) {
                    setOpponentTeam({ id: teamId, name: `Equipo ${teamId}` });
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
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} ({team.pokemons?.length || 0} Pokémon)
                  </option>
                ))}
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
                <div>{opponentTeam.name}</div>
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
      {simulationResult && (
        <div
          className="pk-card fade-up"
          style={{
            padding: 32,
            background: 'linear-gradient(135deg, rgba(34,197,94,0.05), rgba(59,130,246,0.05))',
            border: '1px solid rgba(34,197,94,0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
            <FaChartLine style={{ fontSize: 28, color: 'var(--color-pk-green)' }} />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 20, margin: 0 }}>
              Resultado de la Simulación
            </h3>
          </div>

          {/* Win Rate grande */}
          <div
            style={{
              textAlign: 'center',
              padding: '24px',
              background: 'var(--color-pk-surface)',
              borderRadius: '12px',
              marginBottom: 24,
              border: '1px solid var(--color-pk-border)',
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--color-pk-muted)', marginBottom: 8 }}>Win Rate Estimado</div>
            <div
              style={{
                fontSize: 56,
                fontFamily: 'var(--font-heading)',
                fontWeight: 800,
                background: simulationResult.winRate >= 50 ? 'linear-gradient(135deg, #22c55e, #84cc16)' : 'linear-gradient(135deg, #ef4444, #f97316)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {simulationResult.winRate}%
            </div>
          </div>

          {/* Resumen */}
          <div
            style={{
              padding: 16,
              background: 'var(--color-pk-surface)',
              borderRadius: '8px',
              border: '1px solid var(--color-pk-border)',
              marginBottom: 16,
            }}
          >
            <p style={{ margin: 0, color: 'var(--color-pk-text)', fontSize: 14 }}>
              {simulationResult.summary}
            </p>
          </div>

          {/* Placeholder para detalles de matchups */}
          <div style={{ fontSize: 13, color: 'var(--color-pk-muted)' }}>
            <strong>Análisis detallado:</strong> Los matchups específicos Pokémon vs Pokémon se mostrarán aquí cuando el motor esté implementado.
          </div>
        </div>
      )}

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
