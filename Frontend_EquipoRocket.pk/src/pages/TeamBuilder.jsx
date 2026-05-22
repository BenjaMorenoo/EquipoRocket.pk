// src/pages/TeamBuilder.jsx
import { useState, useCallback } from 'react';
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

const TEAM_SIZE = 6;
const FORMATS   = ['OU','Ubers','UU','RU','NU','PU','VGC','BSS','Doubles'];

export default function TeamBuilder({ onSave, onNavigate }) {
  const { user } = useAuth();

  const [team,        setTeam]        = useState(Array(TEAM_SIZE).fill(null));
  const [teamName,    setTeamName]    = useState('');
  const [format,      setFormat]      = useState('OU');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const [targetSlot,  setTargetSlot]  = useState(null);
  const [selectedPk,  setSelectedPk]  = useState(null);
  const [saving,      setSaving]      = useState(false);
  const [saved,       setSaved]       = useState(false);
  const [activeTab,   setActiveTab]   = useState('weakness');
  const [authPrompt,  setAuthPrompt]  = useState(null); // null | 'guardar' | 'exportar'
  const [assistOpen, setAssistOpen] = useState(false);

  const filledCount    = team.filter(Boolean).length;
  const totalBaseStats = team.filter(Boolean).reduce((a, pk) => a + (pk?.stats?.reduce((s, st) => s + st.base_stat, 0) || 0), 0);

  const openSearch = useCallback((i) => { setTargetSlot(i); setSearchOpen(true); }, []);

  const handleSelect = useCallback((pokemon) => {
    if (targetSlot === null) return;
    setTeam(prev => { const n = [...prev]; n[targetSlot] = pokemon; return n; });
    setSearchOpen(false); setTargetSlot(null); setSelectedPk(pokemon);
  }, [targetSlot]);

  const handleRemove = useCallback((i) => {
    setTeam(prev => { const n = [...prev]; n[i] = null; return n; });
    setSelectedPk(prev => prev?.name === team[i]?.name ? null : prev);
  }, [team]);

  /* ── Guardar (solo usuarios registrados) ── */
  const handleSave = async () => {
    if (!user) { setAuthPrompt('guardar'); return; }
    if (!teamName.trim()) { alert('Por favor ingresa un nombre para el equipo.'); return; }
    if (filledCount === 0) { alert('Tu equipo está vacío.'); return; }
    setSaving(true);
    try {
      await onSave?.({ name: teamName, format, pokemon: team.filter(Boolean).map(pk => ({ id: pk.id, name: pk.name, types: pk.types.map(t => t.type.name) })) });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('No se pudo guardar el equipo.');
    } finally { setSaving(false); }
  };

  /* ── Exportar Showdown (solo usuarios registrados) ── */
  const handleExport = () => {
    if (!user) { setAuthPrompt('exportar'); return; }
    if (filledCount === 0) { alert('Tu equipo está vacío.'); return; }
    const content  = exportTeamToShowdown(team, { name: teamName || 'Mi Equipo', format });
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
        <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
          <label style={{ fontSize:'10px', fontFamily:'var(--font-heading)', fontWeight:700, color:'var(--color-pk-muted)', letterSpacing:'0.1em', textTransform:'uppercase' }}>Formato</label>
          <select className="pk-input" value={format} onChange={e => setFormat(e.target.value)} style={{ padding:'9px 13px', fontSize:'14px', cursor:'pointer' }}>
            {FORMATS.map(f => <option key={f} value={f} style={{ background:'var(--color-pk-card)' }}>{f}</option>)}
          </select>
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
                onEdit={() => pokemon && setSelectedPk(pokemon)}
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
                    {selectedPk.types.map(t => <TypeBadge key={t.type.name} type={t.type.name} size="sm" />)}
                  </div>
                </div>
              </div>
              <PokemonStatsRadar pokemon={selectedPk} />
              <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginTop:'8px' }}>
                {selectedPk.stats.map(s => (
                  <div key={s.stat.name} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px' }}>
                    <span style={{ color: STAT_COLORS[s.stat.name]||'var(--color-pk-subtle)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{STAT_LABELS[s.stat.name]||s.stat.name}</span>
                    <span style={{ color:'var(--color-pk-text)', fontFamily:'var(--font-heading)', fontWeight:600 }}>{s.base_stat}</span>
                  </div>
                ))}
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', borderTop:'1px solid var(--color-pk-border)', paddingTop:'6px', marginTop:'2px' }}>
                  <span style={{ color:'var(--color-pk-muted)', fontFamily:'var(--font-heading)', fontWeight:700 }}>BST</span>
                  <span style={{ color:'var(--color-pk-yellow)', fontFamily:'var(--font-heading)', fontWeight:700 }}>{selectedPk.stats.reduce((a,s) => a+s.base_stat,0)}</span>
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
            // Fetch full details for each name from backend before applying
            const filled = await Promise.all(newTeam.slice(0,6).map(async (name) => {
              try {
                const res = await getBackendPokemon(name);
                return res?.data?.pokemon || { name };
              } catch (e) {
                return { name };
              }
            }));
            const arr = Array(6).fill(null);
            filled.forEach((pk, idx) => { arr[idx] = pk; });
            setTeam(arr);
            setAssistOpen(false);
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