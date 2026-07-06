// src/pages/TeamBuilder.jsx
import { useState, useCallback, useEffect } from 'react';
import PokemonSlot           from '../components/PokemonSlot';
import SearchModal           from '../components/SearchModal';
import AuthPromptModal       from '../components/AuthPromptModal';
import { TeamWeaknessChart, TypeCoverageGrid, PokemonStatsRadar } from '../components/TypeCoverageChart';
import TypeBadge             from '../components/TypeBadge';
import { useAuth }           from '../context/AuthContext';
import { STAT_LABELS, STAT_COLORS } from '../utils/typeColors';
import { exportTeamToShowdown, downloadTxt } from '../utils/showdownExport';
import { FaFileAlt, FaTrash, FaSave, FaChartBar, FaCheck } from 'react-icons/fa';
import AssistedBuilderModal from '../components/AssistedBuilderModal';
import { getPokemon, getBackendPokemon, getMovesList, getAbilitiesList, getItemsList, getSpreadsList, updateTeam, createSpread } from '../services/api';
import SpreadModal from '../components/SpreadModal';

const TEAM_SIZE = 6;

export default function TeamBuilder({ initialTeam, onSave, onNavigate }) {
  const { user } = useAuth();

  const [team,        setTeam]        = useState(Array(TEAM_SIZE).fill(null));
  const [teamName,    setTeamName]    = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [targetSlot,  setTargetSlot]  = useState(null);
  const [selectedPk,  setSelectedPk]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [createdBy,   setCreatedBy]   = useState('manual');
  const [activeTab,   setActiveTab]   = useState('weakness');
  const [authPrompt,  setAuthPrompt]  = useState(null); // null | 'guardar' | 'exportar'
  const [assistOpen, setAssistOpen] = useState(false);
  const [movesOptions, setMovesOptions] = useState([]);
  const [abilitiesOptions, setAbilitiesOptions] = useState([]);
  const [itemsOptions, setItemsOptions] = useState([]);
  const [spreadsOptions, setSpreadsOptions] = useState([]);
  const [spreadModalOpen, setSpreadModalOpen] = useState(false);
  const [computedStats, setComputedStats] = useState(null);

  const filledCount    = team.filter(Boolean).length;
  const totalBaseStats = team.filter(Boolean).reduce((a, pk) => a + (pk?.stats?.reduce((s, st) => s + st.base_stat, 0) || 0), 0);

  const openSearch = useCallback((i) => { setTargetSlot(i); setSearchOpen(true); setCreatedBy('manual'); }, []);

  const handleSelect = useCallback(async (pokemon) => {
    if (targetSlot === null || !pokemon) return;
    let pk = pokemon;
    // If sprites are missing (e.g. stale-closure fallback passed incomplete data), fetch from PokeAPI
    if (!pk.sprites?.front_default && !pk.sprites?.other?.['official-artwork']?.front_default) {
      try {
        const api = await getPokemon(String(pk.name).toLowerCase());
        if (api) {
          pk = { ...pk, sprites: api.sprites, types: api.types?.length ? api.types : pk.types, stats: api.stats?.length ? api.stats : pk.stats };
        }
      } catch { /* keep pokemon as-is */ }
    }
    setTeam(prev => {
      const n = [...prev];
      const dupIdx = n.findIndex((p, idx) => idx !== targetSlot && p?.name === pk.name);
      if (dupIdx !== -1) n[dupIdx] = null;
      n[targetSlot] = { ...pk, ability: prev[targetSlot]?.ability || null, item: prev[targetSlot]?.item || null, moves: prev[targetSlot]?.moves || [] };
      return n;
    });
    setSearchOpen(false); setSelectedPk(pk);
    setCreatedBy('manual');
  }, [targetSlot]);

  const handleRemove = useCallback((i) => {
    setTeam(prev => { const n = [...prev]; n[i] = null; return n; });
    setSelectedPk(prev => prev?.name === team[i]?.name ? null : prev);
    setCreatedBy('manual');
  }, [team]);

  // Load initialTeam if editing
  useEffect(() => {
    if (!initialTeam) return;
    (async () => {
      try {
        setTeam(Array(TEAM_SIZE).fill(null));
        setTeamName(initialTeam.name || '');
        setCreatedBy(initialTeam.created_by || 'manual');
        // fetch full pokemon details for each slot
        const arr = Array(TEAM_SIZE).fill(null);
        for (const pk of (initialTeam.pokemon || [])) {
          try {
            const name = pk.name || pk.pokemon_id;
            const backend = await getBackendPokemon(name);
            const api = await getPokemon(String(name).toLowerCase());
            const full = backend?.data?.pokemon || backend || { name };
            if (api) { full.sprites = api.sprites; full.types = api.types; full.stats = api.stats; }
            // attach ability/item/moves from team payload
              full.ability = pk.ability || pk.ability_name || null;
              full.item = pk.item || pk.item_name || null;
              full.moves = (pk.moves || []).map(m => (m?.name || m));
            full.spread_id = pk.spread_id || null;
            full.team_pokemon_id = pk.team_pokemon_id || pk.id || null;
            arr[(pk.slot || 1) - 1] = full;
          } catch (e) {
            // ignore per-pokemon failures
          }
        }
        setTeam(arr);
      } catch (e) {
        console.error('Error loading initial team', e.message || e);
      }
    })();
  }, [initialTeam]);

  // load moves/items/abilities lists
  useEffect(() => {
    (async () => {
      try {
        // items are global
        const it = await getItemsList();
        setItemsOptions(it?.data?.items || []);
        // spreads list (global catalog)
        try {
          const sp = await getSpreadsList();
          setSpreadsOptions(sp?.data?.spreads || []);
        } catch (e) { console.debug('getSpreadsList failed', e.message || e); }
      } catch (e) { console.debug('getItemsList failed', e.message || e); }
    })();
  }, []);

  // When a different pokemon is selected for editing, reload its ability/move/spread options
  useEffect(() => {
    const name = selectedPk?.name;
    if (!name) return;
    // Pre-populate abilities immediately from already-loaded pokemon data (avoids blank dropdown flash)
    if (selectedPk?.abilities?.length) {
      const aopts = selectedPk.abilities
        .map(a => ({ id: a.ability?.id || null, name: a.ability?.name || a.ability || '' }))
        .filter(a => a.name);
      if (aopts.length) setAbilitiesOptions(aopts);
    }
    (async () => {
      try {
        const resp = await getBackendPokemon(name);
        const pk = resp?.data?.pokemon || resp || null;
        if (!pk) return;
        const aopts = (pk.abilities || []).map(a => ({ id: a.ability?.id || null, name: a.ability?.name || a.ability }));
        const mopts = (pk.moves || []).map(m => ({ id: m.id, name: m.name }));
        setAbilitiesOptions(aopts);
        setMovesOptions(mopts);
        try {
          const spRes = await getSpreadsList(name);
          setSpreadsOptions(spRes?.data?.spreads || []);
        } catch (e) { console.debug('getSpreadsList(pokemon) failed', e.message || e); }
      } catch (e) {
        console.debug('failed to load pokemon-specific data', e.message || e);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPk?.name]);

  // Clear spreads when no pokemon selected
  useEffect(() => {
    if (!selectedPk) setSpreadsOptions([]);
  }, [selectedPk]);

  // Compute displayed stats incorporating spread EVs and nature
  useEffect(() => {
    if (!selectedPk) { setComputedStats(null); return; }
    // find spread object
    const sp = spreadsOptions.find(s => s.id === selectedPk.spread_id) || null;
    // base stats from selectedPk.stats (array of { stat: {name}, base_stat })
    if (!selectedPk.stats) { setComputedStats(null); return; }
    const statMapName = {
      hp: 'hp', attack: 'attack', defense: 'defense', 'special-attack': 'sp_attack', 'special-defense': 'sp_defense', speed: 'speed'
    };
    // convert spreads ev fields to numbers
    const evs = sp ? {
      hp: Number(sp.hp_evs||0), attack: Number(sp.attack_evs||0), defense: Number(sp.defense_evs||0), sp_attack: Number(sp.sp_attack_evs||0), sp_defense: Number(sp.sp_defense_evs||0), speed: Number(sp.speed_evs||0)
    } : null;
    const increased = sp?.increased_stat || null;
    const decreased = sp?.decreased_stat || null;
    const normalize = (s) => (s || '').toString().replace('_', '-');
    const newStats = selectedPk.stats.map(s => {
      const key = s.stat.name;
      const mapped = statMapName[key] || key;
      let val = s.base_stat || 0;
      if (evs && evs[mapped] !== undefined) {
        val = val + Math.floor(evs[mapped] / 4);
      }
      // apply nature modifier (+10% / -10%) to non-HP stats
      if (mapped !== 'hp') {
        const incNorm = normalize(increased);
        const decNorm = normalize(decreased);
        if (incNorm && (incNorm === key || incNorm === mapped)) val = Math.round(val * 1.1);
        if (decNorm && (decNorm === key || decNorm === mapped)) val = Math.round(val * 0.9);
      }
      return { ...s, base_stat: val };
    });
    setComputedStats(newStats);
  }, [selectedPk, spreadsOptions]);

  /* ── Guardar (solo usuarios registrados) ── */
  const handleSave = async () => {
    if (!user) { setAuthPrompt('guardar'); return; }
    if (!teamName.trim()) { alert('Por favor ingresa un nombre para el equipo.'); return; }
    if (filledCount === 0) { alert('Tu equipo está vacío.'); return; }
    setSaving(true);
    try {
      // prepare pokemon payload including ability/item/moves (names or ids)
      const payloadPokemons = team.filter(Boolean).map((pk, idx) => ({
        id: pk.id || pk.pokemon_id,
        name: pk.name,
        slot: idx+1,
        ability: pk.ability || null,
        item: pk.item || null,
        spread_id: pk.spread_id || null,
        moves: Array.isArray(pk.moves) ? pk.moves.map(m => (typeof m === 'object' ? (m.id || m.name) : m)) : [],
      }));
      await onSave?.({ name: teamName, created_by: createdBy, pokemon: payloadPokemons });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('No se pudo guardar el equipo.');
    } finally { setSaving(false); }
  };

  /* ── Exportar Showdown (solo usuarios registrados) ── */
  const handleExport = () => {
    if (!user) { setAuthPrompt('exportar'); return; }
    if (filledCount === 0) { alert('Tu equipo está vacío.'); return; }
    // build enriched team: resolve spread_id -> spread object and normalize moves/ability/item
    const enrichedTeam = team.filter(Boolean).map((pk) => {
      const spread = pk.spread || (pk.spread_id ? spreadsOptions.find(s => s.id === pk.spread_id) : null);
      return {
        name: pk.name,
        item: (pk.item && typeof pk.item === 'object' ? (pk.item.name || '') : (pk.item || '')),
        ability: (pk.ability && typeof pk.ability === 'object' ? (pk.ability.name || '') : (pk.ability || '')),
        level: pk.level || 100,
        nature: pk.nature || (spread ? spread.nature : undefined),
        evs: pk.evs || undefined,
        spread: spread ? { ...spread } : undefined,
        ivs: pk.ivs || undefined,
        moves: Array.isArray(pk.moves) ? pk.moves.map(m => (typeof m === 'string' ? m : (m?.name || m?.move || ''))).filter(Boolean) : [],
        shiny: !!pk.shiny,
        gender: pk.gender || '',
        nickname: pk.nickname || pk.nick || '',
      };
    });
    const content  = exportTeamToShowdown(enrichedTeam, { name: teamName || 'Mi Equipo' });
    const filename = `${(teamName || 'equipo').replace(/\s+/g, '_').toLowerCase()}_showdown.txt`;
    downloadTxt(content, filename);
  };

  const handleAuthPromptLogin    = () => { setAuthPrompt(null); onNavigate?.('auth'); };
  const handleAuthPromptRegister = () => { setAuthPrompt(null); onNavigate?.('auth'); };


  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '24px 24px 60px' }}>

      {/* Saved toast */}
      {saved && (
        <div style={{ position:'fixed', top:'80px', right:'24px', zIndex:50, background:'rgba(34,197,94,0.12)', border:'1px solid rgba(34,197,94,0.3)', borderRadius:'10px', padding:'12px 18px', color:'#4ade80', fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'13px', letterSpacing:'0.06em', animation:'fadeIn .2s ease' }}>
          <FaCheck style={{ marginRight: 8 }} /> Equipo guardado correctamente
          <style>{`@keyframes fadeIn{from{opacity:0}to{opacity:1}}`}</style>
        </div>
      )}

      {/* Header */}
      <div className="fade-up fade-up-1" style={{ marginBottom:'28px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'clamp(24px,4vw,36px)', letterSpacing:'0.06em', textTransform:'uppercase', margin:'0 0 4px', lineHeight:1.1 }}>
              Constructor de <span style={{ color:'var(--color-pk-red)' }}>Equipo</span>
            </h1>
            <p style={{ color:'var(--color-pk-muted)', fontSize:'14px', margin:0 }}>
              {user
                ? <>Bienvenido, <strong style={{ color:'var(--color-pk-subtle)' }}>{user.username}</strong> — tus equipos se guardarán en tu perfil.</>
                : <>Modo visitante — <button onClick={() => onNavigate?.('auth')} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-pk-red-light)', fontSize:'14px', fontWeight:600, textDecoration:'underline', textUnderlineOffset:'2px', padding:0 }}>Inicia sesión</button> para guardar y exportar.</>
              }
            </p>
          </div>

          <div style={{ display:'flex', gap:'10px', alignItems:'center', flexWrap:'wrap' }}>
            <button className="pk-btn pk-btn-secondary" onClick={() => setAssistOpen(true)} style={{ fontSize:'13px', padding:'9px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>Constructor Asistido por IA</button>
            {/* Export Showdown */}
              <button
              onClick={handleExport}
              disabled={filledCount === 0}
              style={{
                padding:'9px 16px', borderRadius:'10px', cursor: filledCount > 0 ? 'pointer' : 'not-allowed',
                border:'1px solid rgba(59,130,246,0.3)', background:'rgba(59,130,246,0.08)',
                color: filledCount > 0 ? 'var(--color-pk-blue)' : 'var(--color-pk-muted)',
                fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'13px',
                letterSpacing:'0.06em', textTransform:'uppercase', transition:'all .15s ease',
                display:'flex', alignItems:'center', gap:'7px', opacity: filledCount > 0 ? 1 : .5,
              }}
              onMouseEnter={e => { if (filledCount > 0) { e.currentTarget.style.background='rgba(59,130,246,0.15)'; }}}
              onMouseLeave={e => { e.currentTarget.style.background='rgba(59,130,246,0.08)'; }}
              title={user ? 'Descargar en formato Showdown' : 'Inicia sesión para exportar'}
              >
              <FaFileAlt style={{ marginRight: 8 }} /> {user ? 'Exportar Showdown' : 'Exportar (requiere sesión)'}
            </button>

            <button className="pk-btn pk-btn-secondary" onClick={() => { if (window.confirm('¿Limpiar el equipo?')) { setTeam(Array(TEAM_SIZE).fill(null)); setSelectedPk(null); }}} style={{ fontSize:'13px', padding:'9px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FaTrash /> Limpiar
            </button>

            <button
              className="pk-btn pk-btn-primary"
              onClick={handleSave}
              disabled={saving || filledCount === 0}
              style={{ fontSize:'14px', padding:'9px 22px', opacity: (saving || filledCount === 0) ? .7 : 1 }}
            >
              {saved ? '✓ Guardado!' : saving ? 'Guardando...' : user ? (<><FaSave /> Guardar</>) : (<><FaSave /> Guardar (requiere sesión)</>)}
            </button>
          </div>
        </div>
      </div>

      {/* Config row */}
      <div className="fade-up fade-up-2" style={{ display:'flex', gap:'12px', marginBottom:'24px', flexWrap:'wrap', alignItems:'center', padding:'16px 20px', background:'var(--color-pk-surface)', border:'1px solid var(--color-pk-border)', borderRadius:'14px' }}>
        <div style={{ flex:'1 1 240px', display:'flex', flexDirection:'column', gap:'4px' }}>
          <label style={{ fontSize:'10px', fontFamily:'var(--font-heading)', fontWeight:700, color:'var(--color-pk-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Nombre del equipo</label>
          <input className="pk-input" type="text" placeholder="Ej: Dragon Storm..." value={teamName} onChange={e => setTeamName(e.target.value)} maxLength={50} style={{ padding:'9px 13px', fontSize:'14px' }} />
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', marginLeft:'auto' }}>
          <label style={{ fontSize:'10px', fontFamily:'var(--font-heading)', fontWeight:700, color:'var(--color-pk-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Progreso</label>
          <div style={{ display:'flex', gap:'5px', alignItems:'center' }}>
            {Array(TEAM_SIZE).fill(null).map((_,i) => (
              <div key={i} style={{ width:'12px', height:'12px', borderRadius:'50%', background: team[i] ? 'var(--color-pk-red)' : 'var(--color-pk-border)', border:`1px solid ${team[i] ? 'var(--color-pk-red-light)' : 'var(--color-pk-border-light)'}`, transition:'all .2s ease', boxShadow: team[i] ? '0 0 6px rgba(220,38,38,0.5)' : 'none' }} />
            ))}
            <span style={{ fontSize:'12px', color:'var(--color-pk-subtle)', fontFamily:'var(--font-heading)', fontWeight:600, marginLeft:'4px' }}>{filledCount}/{TEAM_SIZE}</span>
          </div>
        </div>
        {filledCount > 0 && (
          <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
            <label style={{ fontSize:'10px', fontFamily:'var(--font-heading)', fontWeight:700, color:'var(--color-pk-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>BST Total</label>
            <span style={{ fontSize:'18px', fontFamily:'var(--font-heading)', fontWeight:700, color:'var(--color-pk-yellow)' }}>{totalBaseStats.toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,1fr) 320px', gap:'20px', alignItems:'start' }}>
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:'16px' }}>
            {team.map((pokemon, i) => (
              <PokemonSlot key={i} pokemon={pokemon} slotNumber={i+1}
                onAdd={() => openSearch(i)}
                onRemove={() => handleRemove(i)}
                onEdit={() => {
                  if (pokemon) { setSelectedPk(pokemon); setTargetSlot(i); }
                }}
              />
            ))}
          </div>
        </div>

        {/* Analysis panel */}
        <div style={{ display:'flex', flexDirection:'column', gap:'16px', position:'sticky', top:'84px' }}>
          {selectedPk && (
            <div className="pk-card fade-up" style={{ padding:'20px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'16px' }}>
                {selectedPk.sprites?.other?.['official-artwork']?.front_default && (
                  <img src={selectedPk.sprites.other['official-artwork'].front_default} alt={selectedPk.name} style={{ width:'72px', height:'72px', objectFit:'contain' }} />
                )}
                <div>
                  <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'18px', textTransform:'capitalize', letterSpacing:'0.04em' }}>{selectedPk.name}</div>
                  <div style={{ display:'flex', gap:'5px', marginTop:'4px' }}>
                    {(selectedPk.types || []).map((t, idx) => <TypeBadge key={t?.type?.name || t?.name || idx} type={t?.type?.name || t?.name || ''} size="sm" />)}
                  </div>
                </div>
              </div>
              <PokemonStatsRadar pokemon={computedStats ? { ...selectedPk, stats: computedStats } : selectedPk} />
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'8px' }}>
                {(() => {
                  const statsToShow = computedStats || selectedPk.stats || [];
                  return statsToShow.map((s, idx) => (
                    <div key={s?.stat?.name || idx} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                      <span style={{ color: STAT_COLORS[s?.stat?.name]||'var(--color-pk-subtle)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{STAT_LABELS[s?.stat?.name]||s?.stat?.name}</span>
                      <span style={{ color:'var(--color-pk-text)', fontFamily:'var(--font-heading)', fontWeight:600 }}>{s?.base_stat ?? '-'}</span>
                    </div>
                  ));
                })()}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', borderTop:'1px solid var(--color-pk-border)', paddingTop:'6px', marginTop:'2px' }}>
                  <span style={{ color:'var(--color-pk-muted)', fontFamily:'var(--font-heading)', fontWeight:700 }}>BST</span>
                  <span style={{ color:'var(--color-pk-yellow)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{(() => { const arr = computedStats || selectedPk.stats || []; return arr.reduce((a,s) => a + (s?.base_stat || 0), 0); })()}</span>
                </div>
              </div>
              {/* Editable fields: ability, item, moves */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Habilidad</label>
                <select value={selectedPk.ability || ''} onChange={(e) => {
                  const v = e.target.value || null; setSelectedPk(prev => ({ ...prev, ability: v })); setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], ability: v }; return n; });
                }} className="pk-input">
                  <option value="">(ninguna)</option>
                  {selectedPk.ability && !abilitiesOptions.find(a => a.name === selectedPk.ability) && (
                    <option value={selectedPk.ability}>{selectedPk.ability}</option>
                  )}
                  {abilitiesOptions.map(a => (<option key={a.id} value={a.name}>{a.name}</option>))}
                </select>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Objeto</label>
                <select value={selectedPk.item || ''} onChange={(e) => {
                  const v = e.target.value || null; setSelectedPk(prev => ({ ...prev, item: v })); setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], item: v }; return n; });
                }} className="pk-input">
                  <option value="">(ninguno)</option>
                  {itemsOptions.map(it => (<option key={it.id} value={it.name}>{it.name}</option>))}
                </select>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Spread</label>
                <select value={selectedPk.spread_id || ''} onChange={(e) => {
                  const v = e.target.value ? Number(e.target.value) : null;
                  setSelectedPk(prev => ({ ...prev, spread_id: v }));
                  setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], spread_id: v }; return n; });
                }} className="pk-input">
                  <option value="">(ninguno)</option>
                  {spreadsOptions.map(s => {
                    const evs = [s.hp_evs, s.attack_evs, s.defense_evs, s.sp_attack_evs, s.sp_defense_evs, s.speed_evs].map(n => n??0).join('/')
                    return (<option key={s.id} value={s.id}>{s.nature ? `${s.nature} (${evs})` : `Spread ${s.id} (${evs})`}</option>)
                  })}
                </select>
                {spreadsOptions.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--color-pk-muted)', marginTop: 6 }}>No hay spreads cargados en la base de datos.</div>
                )}
                <div style={{ display:'flex', gap:8, marginTop:8 }}>
                  <button className="pk-btn" onClick={async () => {
                    if (!initialTeam?.id) return alert('Guarda el equipo completo primero antes de asignar atributos.');
                    try {
                      const payloadPokemons = team.filter(Boolean).map((pk, idx) => ({
                        id: pk.id || pk.pokemon_id,
                        name: pk.name,
                        slot: idx + 1,
                        ability: pk.ability || null,
                        item: pk.item || null,
                        spread_id: pk.spread_id || null,
                        moves: Array.isArray(pk.moves) ? pk.moves.map(m => (typeof m === 'object' ? (m.id || m.name) : m)) : [],
                      }));
                      await updateTeam(initialTeam.id, { name: teamName, pokemon: payloadPokemons });
                      alert('Atributos guardados correctamente.');
                    } catch (e) { alert('Error guardando atributos: ' + (e.message || e)); }
                  }} style={{ padding:'6px 10px', fontSize:12 }}>Asignar ahora</button>
                </div>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Moves (máx.4)</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {Array.from({ length: 4 }).map((_, mi) => (
                    <select key={mi} value={(selectedPk.moves && selectedPk.moves[mi]) || ''} onChange={(e) => {
                      const v = e.target.value || '';
                      setSelectedPk(prev => ({ ...prev, moves: Object.assign([], (prev.moves||[]), { [mi]: v }) }));
                      setTeam(prev => { const n = [...prev]; if (targetSlot !== null) {
                        const arr = n[targetSlot] ? [...(n[targetSlot].moves||[])] : [];
                        arr[mi] = v; n[targetSlot] = { ...n[targetSlot], moves: arr };
                      } return n; });
                    }} className="pk-input">
                      <option value="">(vacío)</option>
                      {selectedPk.moves?.[mi] && !movesOptions.find(m => m.name === selectedPk.moves[mi]) && (
                        <option value={selectedPk.moves[mi]}>{selectedPk.moves[mi]}</option>
                      )}
                      {movesOptions.map(m => (<option key={m.id} value={m.name}>{m.name}</option>))}
                    </select>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pk-card" style={{ padding:'20px' }}>
            <h3 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'14px', letterSpacing:'0.08em', textTransform:'uppercase', margin:'0 0 14px', display:'flex', alignItems:'center', gap:'8px' }}>
              <FaChartBar style={{ color:'var(--color-pk-red)' }} /> Análisis del Equipo
            </h3>
            <div style={{ display:'flex', gap:'4px', marginBottom:'16px' }}>
              {[{ id:'weakness', label:'Debilidades' },{ id:'coverage', label:'Cobertura' }].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  flex:1, padding:'7px 10px', borderRadius:'7px',
                  border: activeTab===tab.id ? '1px solid rgba(220,38,38,0.3)' : '1px solid var(--color-pk-border)',
                  background: activeTab===tab.id ? 'rgba(220,38,38,0.1)' : 'var(--color-pk-surface)',
                  color: activeTab===tab.id ? 'var(--color-pk-red-light)' : 'var(--color-pk-muted)',
                  cursor:'pointer', fontFamily:'var(--font-heading)', fontWeight:600,
                  fontSize:'11px', letterSpacing:'0.06em', textTransform:'uppercase', transition:'all .15s ease',
                }}>{tab.label}</button>
              ))}
            </div>
            {activeTab==='weakness' && <><p style={{ fontSize:'11px', color:'var(--color-pk-muted)', marginBottom:'10px' }}>Tipos que causan mayor daño defensivo</p><TeamWeaknessChart team={team} /></>}
            {activeTab==='coverage' && <><p style={{ fontSize:'11px', color:'var(--color-pk-muted)', marginBottom:'10px' }}>Tipos STAB representados en el equipo</p><TypeCoverageGrid team={team} /></>}
          </div>

          
        </div>
      </div>

      {searchOpen && (
        <SearchModal onSelect={handleSelect} onClose={() => { setSearchOpen(false); setTargetSlot(null); }} selectedPokemon={team} />
      )}
      {assistOpen && (
        <AssistedBuilderModal
          open={assistOpen}
          onClose={() => setAssistOpen(false)}
          onApply={async (newTeam) => {
            // Fetch full details for each name from backend and PokeAPI (for sprites) before applying
            const filled = await Promise.all(newTeam.slice(0,6).map(async (name) => {
              try {
                const [resBackend, resApi] = await Promise.allSettled([getBackendPokemon(name), getPokemon(name.toLowerCase())]);
                const backendPk = resBackend.status === 'fulfilled' ? (resBackend.value?.data?.pokemon || { name }) : { name };
                const apiPk = resApi.status === 'fulfilled' ? resApi.value : null;
                if (apiPk) {
                  backendPk.sprites = apiPk.sprites;
                  backendPk.types = apiPk.types;
                  backendPk.stats = apiPk.stats || backendPk.stats;
                }
                // Normalize moves to strings — ms_pokemon returns [{id, name}] objects
                if (Array.isArray(backendPk.moves)) {
                  backendPk.moves = backendPk.moves.map(m => (typeof m === 'string' ? m : m?.name)).filter(Boolean);
                }
                return backendPk;
              } catch (e) {
                return { name };
              }
            }));
            const arr = Array(6).fill(null);
            filled.forEach((pk, idx) => { arr[idx] = pk; });
            setTeam(arr);
            setAssistOpen(false);
            setCreatedBy('ai');
          }}
        />
      )}

      {authPrompt && (
        <AuthPromptModal
          action={authPrompt}
          onLogin={handleAuthPromptLogin}
          onRegister={handleAuthPromptRegister}
          onClose={() => setAuthPrompt(null)}
        />
      )}
      <SpreadModal
        open={spreadModalOpen}
        onClose={() => setSpreadModalOpen(false)}
        onCreate={async ({ nature, ev }) => {
          try {
            const resp = await createSpread({ nature, ev });
            const newSpread = resp?.data?.spread;
            if (newSpread) {
              // attach nature name for display
              newSpread.nature = newSpread.nature || nature;
              setSpreadsOptions(prev => [ ...prev, newSpread ]);
              // select it for the current pokemon
              setSelectedPk(prev => ({ ...prev, spread_id: newSpread.id }));
              setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], spread_id: newSpread.id }; return n; });
              setSpreadModalOpen(false);
              alert('Spread creado y seleccionado.');
            }
          } catch (e) { alert('Error creando spread: '+(e.message||e)); }
        }}
      />
    </div>
  );
}