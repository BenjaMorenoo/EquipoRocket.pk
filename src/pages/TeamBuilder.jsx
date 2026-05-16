// src/pages/TeamBuilder.jsx
import { useState, useCallback } from 'react';
import PokemonSlot from '../components/PokemonSlot';
import SearchModal from '../components/SearchModal';
import { TeamWeaknessChart, TypeCoverageGrid, PokemonStatsRadar } from '../components/TypeCoverageChart';
import TypeBadge from '../components/TypeBadge';
import { STAT_LABELS, STAT_COLORS } from '../utils/typeColors';

const TEAM_SIZE = 6;

const FORMATS = ['OU', 'Ubers', 'UU', 'RU', 'NU', 'PU', 'VGC', 'BSS', 'Doubles'];

export default function TeamBuilder({ onSave }) {
  const [team,          setTeam]          = useState(Array(TEAM_SIZE).fill(null));
  const [teamName,      setTeamName]      = useState('');
  const [format,        setFormat]        = useState('OU');
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [targetSlot,    setTargetSlot]    = useState(null);
  const [selectedPk,    setSelectedPk]    = useState(null); // for right panel detail
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [activeTab,     setActiveTab]     = useState('weakness'); // weakness | coverage | stats

  const openSearch = useCallback((slotIndex) => {
    setTargetSlot(slotIndex);
    setSearchOpen(true);
  }, []);

  const handleSelect = useCallback((pokemon) => {
    if (targetSlot === null) return;
    setTeam((prev) => {
      const next = [...prev];
      next[targetSlot] = pokemon;
      return next;
    });
    setSearchOpen(false);
    setTargetSlot(null);
    setSelectedPk(pokemon);
  }, [targetSlot]);

  const handleRemove = useCallback((slotIndex) => {
    setTeam((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      return next;
    });
    setSelectedPk((prev) => prev?.name === team[slotIndex]?.name ? null : prev);
  }, [team]);

  const handleSlotClick = useCallback((pokemon) => {
    if (pokemon) setSelectedPk(pokemon);
  }, []);

  const filledCount = team.filter(Boolean).length;
  const totalBaseStats = team.filter(Boolean).reduce((acc, pk) => {
    return acc + (pk?.stats?.reduce((s, st) => s + st.base_stat, 0) || 0);
  }, 0);

  const handleSave = async () => {
    if (!teamName.trim()) {
      alert('Por favor ingresa un nombre para el equipo.');
      return;
    }
    if (filledCount === 0) {
      alert('Tu equipo está vacío. Agrega al menos un Pokémon.');
      return;
    }
    setSaving(true);
    try {
      const teamData = {
        name: teamName,
        format,
        pokemon: team.filter(Boolean).map((pk) => ({
          id: pk.id,
          name: pk.name,
          types: pk.types.map((t) => t.type.name),
        })),
      };
      if (onSave) await onSave(teamData);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving team:', err);
      alert('No se pudo guardar el equipo (backend no conectado aún).');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    if (!window.confirm('¿Seguro que quieres limpiar el equipo?')) return;
    setTeam(Array(TEAM_SIZE).fill(null));
    setSelectedPk(null);
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="fade-up fade-up-1" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: 'clamp(24px, 4vw, 36px)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: '0 0 4px',
              lineHeight: 1.1,
            }}>
              Constructor de <span style={{ color: 'var(--color-pk-red)' }}>Equipo</span>
            </h1>
            <p style={{ color: 'var(--color-pk-muted)', fontSize: '14px', margin: 0 }}>
              Arma tu equipo competitivo para <strong style={{ color: 'var(--color-pk-subtle)' }}>Pokémon Champions</strong>
            </p>
          </div>

          {/* Save button */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button className="pk-btn pk-btn-secondary" onClick={handleClear} style={{ fontSize: '13px', padding: '10px 18px' }}>
              🗑️ Limpiar
            </button>
            <button
              className="pk-btn pk-btn-primary"
              onClick={handleSave}
              disabled={saving}
              style={{ fontSize: '14px', padding: '10px 24px', opacity: saving ? 0.7 : 1 }}
            >
              {saved ? '✓ Guardado!' : saving ? 'Guardando...' : '💾 Guardar Equipo'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Team config row ──────────────────────────────────────────────── */}
      <div className="fade-up fade-up-2" style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '16px 20px',
        background: 'var(--color-pk-surface)',
        border: '1px solid var(--color-pk-border)',
        borderRadius: '14px',
      }}>
        {/* Team name */}
        <div style={{ flex: '1 1 240px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-pk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Nombre del equipo
          </label>
          <input
            className="pk-input"
            type="text"
            placeholder="Ej: Equipo Fuego y Acero..."
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            maxLength={50}
            style={{ padding: '9px 13px', fontSize: '14px' }}
          />
        </div>

        {/* Format selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-pk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Formato
          </label>
          <select
            className="pk-input"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            style={{ padding: '9px 13px', fontSize: '14px', cursor: 'pointer' }}
          >
            {FORMATS.map((f) => (
              <option key={f} value={f} style={{ background: 'var(--color-pk-card)' }}>{f}</option>
            ))}
          </select>
        </div>

        {/* Progress indicator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: 'auto' }}>
          <label style={{ fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-pk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Progreso
          </label>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            {Array(TEAM_SIZE).fill(null).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: team[i] ? 'var(--color-pk-red)' : 'var(--color-pk-border)',
                  border: `1px solid ${team[i] ? 'var(--color-pk-red-light)' : 'var(--color-pk-border-light)'}`,
                  transition: 'all 0.2s ease',
                  boxShadow: team[i] ? '0 0 6px rgba(220,38,38,0.5)' : 'none',
                }}
              />
            ))}
            <span style={{ fontSize: '12px', color: 'var(--color-pk-subtle)', fontFamily: 'var(--font-heading)', fontWeight: 600, marginLeft: '4px' }}>
              {filledCount}/{TEAM_SIZE}
            </span>
          </div>
        </div>

        {/* Total BST */}
        {filledCount > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '10px', fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-pk-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              BST Total
            </label>
            <span style={{
              fontSize: '18px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              color: 'var(--color-pk-yellow)',
            }}>
              {totalBaseStats.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* ── Main content: slots + analysis panel ────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0,1fr) 320px',
        gap: '20px',
        alignItems: 'start',
      }}>

        {/* LEFT: Pokemon grid */}
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '16px',
          }}>
            {team.map((pokemon, i) => (
              <PokemonSlot
                key={i}
                pokemon={pokemon}
                slotNumber={i + 1}
                onAdd={() => openSearch(i)}
                onRemove={() => handleRemove(i)}
                onEdit={() => handleSlotClick(pokemon)}
              />
            ))}
          </div>
        </div>

        {/* RIGHT: Analysis panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', position: 'sticky', top: '84px' }}>

          {/* Selected Pokemon detail */}
          {selectedPk && (
            <div className="pk-card fade-up" style={{ padding: '20px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
              }}>
                {selectedPk.sprites?.other?.['official-artwork']?.front_default && (
                  <img
                    src={selectedPk.sprites.other['official-artwork'].front_default}
                    alt={selectedPk.name}
                    style={{ width: '72px', height: '72px', objectFit: 'contain' }}
                  />
                )}
                <div>
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 700,
                    fontSize: '18px',
                    textTransform: 'capitalize',
                    letterSpacing: '0.04em',
                  }}>
                    {selectedPk.name}
                  </div>
                  <div style={{ display: 'flex', gap: '5px', marginTop: '4px' }}>
                    {selectedPk.types.map((t) => (
                      <TypeBadge key={t.type.name} type={t.type.name} size="sm" />
                    ))}
                  </div>
                </div>
              </div>

              {/* Stats radar */}
              <PokemonStatsRadar pokemon={selectedPk} />

              {/* Base stats text list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {selectedPk.stats.map((s) => (
                  <div key={s.stat.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: STAT_COLORS[s.stat.name] || 'var(--color-pk-subtle)', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.04em' }}>
                      {STAT_LABELS[s.stat.name] || s.stat.name}
                    </span>
                    <span style={{ color: 'var(--color-pk-text)', fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                      {s.base_stat}
                    </span>
                  </div>
                ))}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  borderTop: '1px solid var(--color-pk-border)',
                  paddingTop: '6px',
                  marginTop: '2px',
                }}>
                  <span style={{ color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.04em' }}>BST</span>
                  <span style={{ color: 'var(--color-pk-yellow)', fontFamily: 'var(--font-heading)', fontWeight: 700 }}>
                    {selectedPk.stats.reduce((a, s) => a + s.base_stat, 0)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Team analysis card */}
          <div className="pk-card" style={{ padding: '20px' }}>
            <h3 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-pk-text)',
              margin: '0 0 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ color: 'var(--color-pk-red)' }}>📊</span>
              Análisis del Equipo
            </h3>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
              {[
                { id: 'weakness', label: 'Debilidades' },
                { id: 'coverage', label: 'Cobertura' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '7px',
                    border: activeTab === tab.id
                      ? '1px solid rgba(220,38,38,0.3)'
                      : '1px solid var(--color-pk-border)',
                    background: activeTab === tab.id
                      ? 'rgba(220,38,38,0.1)'
                      : 'var(--color-pk-surface)',
                    color: activeTab === tab.id
                      ? 'var(--color-pk-red-light)'
                      : 'var(--color-pk-muted)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    fontSize: '11px',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'weakness' && (
              <>
                <p style={{ fontSize: '11px', color: 'var(--color-pk-muted)', marginBottom: '10px' }}>
                  Tipos que causan mayor daño defensivo al equipo
                </p>
                <TeamWeaknessChart team={team} />
              </>
            )}

            {activeTab === 'coverage' && (
              <>
                <p style={{ fontSize: '11px', color: 'var(--color-pk-muted)', marginBottom: '10px' }}>
                  Tipos representados en el equipo (STAB)
                </p>
                <TypeCoverageGrid team={team} />
              </>
            )}
          </div>

          {/* Quick tips */}
          {filledCount < TEAM_SIZE && (
            <div style={{
              background: 'rgba(59,130,246,0.06)',
              border: '1px solid rgba(59,130,246,0.2)',
              borderRadius: '12px',
              padding: '14px 16px',
            }}>
              <p style={{ fontSize: '12px', color: 'var(--color-pk-blue)', fontFamily: 'var(--font-heading)', fontWeight: 600, margin: '0 0 6px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                💡 Consejo
              </p>
              <p style={{ fontSize: '12px', color: 'var(--color-pk-subtle)', margin: 0, lineHeight: 1.5 }}>
                {filledCount === 0
                  ? 'Haz clic en cualquier espacio vacío para añadir tu primer Pokémon.'
                  : filledCount <= 2
                  ? 'Intenta incluir tipos diferentes para una mejor cobertura ofensiva y defensiva.'
                  : 'Revisa la pestaña de Debilidades para identificar tipos problemáticos.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Search Modal ─────────────────────────────────────────────────── */}
      {searchOpen && (
        <SearchModal
          onSelect={handleSelect}
          onClose={() => { setSearchOpen(false); setTargetSlot(null); }}
          selectedPokemon={team}
        />
      )}
    </div>
  );
}
