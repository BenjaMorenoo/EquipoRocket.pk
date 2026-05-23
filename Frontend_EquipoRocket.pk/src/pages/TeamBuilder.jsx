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
import { getPokemon, getBackendPokemon, getMovesList, getAbilitiesList, getItemsList } from '../services/api';

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

  const filledCount    = team.filter(Boolean).length;
  const totalBaseStats = team.filter(Boolean).reduce((a, pk) => a + (pk?.stats?.reduce((s, st) => s + st.base_stat, 0) || 0), 0);

  const openSearch = useCallback((i) => { setTargetSlot(i); setSearchOpen(true); setCreatedBy('manual'); }, []);

  const handleSelect = useCallback((pokemon) => {
    if (targetSlot === null) return;
    // preserve custom fields if replacing
    setTeam(prev => { const n = [...prev]; n[targetSlot] = { ...pokemon, ability: prev[targetSlot]?.ability || null, item: prev[targetSlot]?.item || null, moves: prev[targetSlot]?.moves || [] }; return n; });
    setSearchOpen(false); setTargetSlot(null); setSelectedPk(pokemon);
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
      } catch (e) { console.debug('getItemsList failed', e.message || e); }
    })();
  }, []);

  // When a pokemon is selected for editing, load its specific abilities and moves
  useEffect(() => {
    if (!selectedPk?.name) return;
    (async () => {
      try {
        const resp = await getBackendPokemon(selectedPk.name);
        const pk = resp?.data?.pokemon || resp || null;
        if (!pk) return;
        // map abilities and moves to options
        const aopts = (pk.abilities || []).map(a => ({ id: a.ability?.id || null, name: a.ability?.name || a.ability }));
        const mopts = (pk.moves || []).map(m => ({ id: m.id, name: m.name }));
        setAbilitiesOptions(aopts);
        setMovesOptions(mopts);
      } catch (e) {
        console.debug('failed to load pokemon-specific data', e.message || e);
      }
    })();
  }, [selectedPk]);

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
    const content  = exportTeamToShowdown(team, { name: teamName || 'Mi Equipo' });
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
              <PokemonStatsRadar pokemon={selectedPk} />
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'8px' }}>
                {(selectedPk.stats || []).map((s, idx) => (
                  <div key={s?.stat?.name || idx} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                    <span style={{ color: STAT_COLORS[s?.stat?.name]||'var(--color-pk-subtle)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{STAT_LABELS[s?.stat?.name]||s?.stat?.name}</span>
                    <span style={{ color:'var(--color-pk-text)', fontFamily:'var(--font-heading)', fontWeight:600 }}>{s?.base_stat ?? '-'}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', borderTop:'1px solid var(--color-pk-border)', paddingTop:'6px', marginTop:'2px' }}>
                  <span style={{ color:'var(--color-pk-muted)', fontFamily:'var(--font-heading)', fontWeight:700 }}>BST</span>
                  <span style={{ color:'var(--color-pk-yellow)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{(selectedPk.stats || []).reduce((a,s) => a + (s?.base_stat || 0), 0)}</span>
                </div>
              </div>
              {/* Editable fields: ability, item, moves */}
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 700 }}>Habilidad</label>
                <select value={selectedPk.ability || ''} onChange={(e) => {
                  const v = e.target.value || null; setSelectedPk(prev => ({ ...prev, ability: v })); setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], ability: v }; return n; });
                }} className="pk-input">
                  <option value="">(ninguna)</option>
                  {abilitiesOptions.map(a => (<option key={a.id} value={a.name}>{a.name}</option>))}
                </select>

                <label style={{ fontSize: 12, fontWeight: 700 }}>Objeto</label>
                <select value={selectedPk.item || ''} onChange={(e) => {
                  const v = e.target.value || null; setSelectedPk(prev => ({ ...prev, item: v })); setTeam(prev => { const n = [...prev]; if (targetSlot !== null) n[targetSlot] = { ...n[targetSlot], item: v }; return n; });
                }} className="pk-input">
                  <option value="">(ninguno)</option>
                  {itemsOptions.map(it => (<option key={it.id} value={it.name}>{it.name}</option>))}
                </select>

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
    </div>
  );
}