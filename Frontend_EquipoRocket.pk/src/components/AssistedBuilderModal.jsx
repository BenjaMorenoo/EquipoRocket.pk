import { useEffect, useState, useRef } from 'react';
import { FaTimes } from 'react-icons/fa';
import { getBackendPokemons, getBackendPokemon, getCollections, recommendTeammateAI, getPokemon, analyzeTeamAI } from '../services/api';
import TypeBadge from './TypeBadge';

function PokemonGridItem({ p, isSelected, onToggle, cache }) {
  const [sprite, setSprite] = useState(() => cache[p.name]?.sprite ?? undefined);

  useEffect(() => {
    if (cache[p.name] !== undefined) {
      setSprite(cache[p.name].sprite);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const poke = await getPokemon(p.name.toLowerCase());
        const url = poke?.sprites?.other?.['official-artwork']?.front_default || poke?.sprites?.front_default || null;
        if (!cancelled) {
          cache[p.name] = { name: p.name, sprite: url, types: (poke?.types || []).map(t => t.type?.name || t.name) };
          setSprite(url);
        }
      } catch {
        if (!cancelled) {
          cache[p.name] = { name: p.name, sprite: null, types: [] };
          setSprite(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [p.name]);

  return (
    <button
      onClick={() => onToggle(p.name)}
      className={isSelected ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'}
      style={{ textTransform: 'capitalize', justifyContent: 'flex-start', display: 'flex', gap: 8, alignItems: 'center', padding: '8px 10px' }}
    >
      <div style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {sprite ? (
          <img src={sprite} alt={p.name} style={{ maxHeight: 28, maxWidth: 28, objectFit: 'contain' }} />
        ) : sprite === null ? (
          <div style={{ width: 28, height: 28, background: 'var(--color-pk-border)', borderRadius: 6 }} />
        ) : (
          <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: 'var(--color-pk-red)', animation: 'spin 0.8s linear infinite' }} />
        )}
      </div>
      <div style={{ flex: 1, textTransform: 'capitalize', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {p.name.replace(/-/g, ' ')}
      </div>
    </button>
  );
}

export default function AssistedBuilderModal({ open, onClose, onApply }) {
  const [loading, setLoading] = useState(false);
  const [allList, setAllList] = useState([]); // {id,name}
  const [seeds, setSeeds] = useState([]); // names selected by user
  const [useCollectionOnly, setUseCollectionOnly] = useState(false);
  const [collectionIds, setCollectionIds] = useState(new Set());
  const [typesFilter, setTypesFilter] = useState('');
  const [results, setResults] = useState([]); // array of teams
  const pokemonCache = useRef({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const res = await getBackendPokemons(1000, 0);
        const list = (res?.data?.pokemons || []).map(p => ({ id: p.id, name: p.name }));
        setAllList(list);
      } catch (e) {
        setAllList([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const toggleSeed = (name) => {
    setSeeds(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
  };

  const handleToggleCollection = async () => {
    if (!useCollectionOnly) {
      try {
        const res = await getCollections();
        const ids = res?.data?.pokemonIds || res?.pokemonIds || [];
        setCollectionIds(new Set(ids));
      } catch (e) {
        setCollectionIds(new Set());
      }
    }
    setUseCollectionOnly(v => !v);
  };

  const buildTeams = async () => {
    setLoading(true);
    try {
      // engine._norm normalizes to lowercase+spaces, so build a reverse map
      // normalized DB name → original DB name for case-insensitive matching
      const normName = (s) => (s || '').toLowerCase().replace(/-/g, ' ').trim();
      const basePool = useCollectionOnly ? allList.filter(p => collectionIds.has(p.id)) : allList;
      let poolNames = basePool.map(p => p.name);

      // Build case-insensitive lookup: normalized → original DB name
      const poolNormToOrig = {};
      for (const n of poolNames) poolNormToOrig[normName(n)] = n;
      // Convert an engine-returned (normalized) name to the original DB name
      const toDbName = (n) => poolNormToOrig[normName(n)];

      if (typesFilter.trim()) {
        const wanted = typesFilter.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const filtered = [];
        for (const p of basePool) {
          try {
            const detail = await getBackendPokemon(p.name).then(r => r.data?.pokemon).catch(() => null);
            const types = (detail?.types || []).map(t => (t.type?.name || t.name).toLowerCase());
            if (wanted.every(w => types.includes(w))) filtered.push(p.name);
          } catch {}
        }
        if (filtered.length) poolNames = filtered;
      }

      // seeds come from allList (original DB names), filter to those present in pool
      const seedsInPool = seeds.filter(s => poolNames.includes(s));

      const rec = await recommendTeammateAI(seedsInPool, 6).catch(() => ({ recommendations: {} }));
      const recObj = rec?.recommendations || {};
      const sorted = Object.entries(recObj).sort((a,b) => b[1]-a[1]).map(x=>x[0]);
      // convert engine names → original DB names, drop any without a DB match
      const starters = sorted.slice(0,3).map(toDbName).filter(Boolean);
      const candidateTeams = [];

      for (const starter of (starters.length ? starters : [''])) {
        const team = [...seedsInPool];
        if (starter && !team.includes(starter)) team.push(starter);
        while (team.length < 6) {
          const r = await recommendTeammateAI(team, 6).catch(() => ({ recommendations: {} }));
          const recs = r?.recommendations || {};
          const normTeam = team.map(normName);
          const choices = Object.entries(recs)
            .sort((a,b) => b[1]-a[1])
            .map(x => toDbName(x[0]))
            .filter(n => n && !normTeam.includes(normName(n)));
          if (!choices.length) break;
          team.push(choices[0]);
        }
        if (team.length < 6) {
          for (const candidate of poolNames) {
            if (team.length >= 6) break;
            if (!team.map(normName).includes(normName(candidate))) team.push(candidate);
          }
        }
        candidateTeams.push(team);
        if (candidateTeams.length >= 3) break;
      }

      // enhance results with sprites and types
      const cache = pokemonCache.current;
      const enhanced = await Promise.all(candidateTeams.filter(Boolean).map(async (team) => {
        const members = await Promise.all(team.map(async (name) => {
          if (cache[name]) return cache[name];
          try {
            const p = await getPokemon(name.toLowerCase());
            const sprite = p?.sprites?.front_default || p?.sprites?.other?.['official-artwork']?.front_default || null;
            const types = (p?.types || []).map(t => t.type?.name || t.name);
            const obj = { name, sprite, types };
            cache[name] = obj;
            return obj;
          } catch (e) {
            const obj = { name, sprite: null, types: [] };
            cache[name] = obj;
            return obj;
          }
        }));
        // compute synergy percent for this team
        try {
          const res = await analyzeTeamAI(members.map(m=>m.name)).catch(()=>({}));
          const synergy = res?.synergy_percent ?? null;
          return { members, synergy_percent: synergy };
        } catch {
          return { members, synergy_percent: null };
        }
      }));
      setResults(enhanced);
    } finally {
      setLoading(false);
    }
  };


  return (!open) ? null : (
    <>
      {/* Left suggestions modal */}
      {results.length > 0 && (
        <div style={{ position:'fixed', left:12, top:'8vh', width:320, height:'80vh', overflowY:'auto', zIndex:1200 }} onClick={(e)=>e.stopPropagation()}>
          <div className="pk-card" style={{ padding:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div style={{ fontWeight:700 }}>Sugerencias</div>
              <button onClick={() => { setResults([]); }} className="pk-btn pk-btn-secondary">Cerrar</button>
            </div>
            <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
              {results.map((entry, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:8, borderRadius:8, background:'var(--color-pk-surface)', border:'1px solid var(--color-pk-border)' }}>
                  <div style={{ width:56, height:56, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {entry.members[0]?.sprite ? <img src={entry.members[0].sprite} style={{ maxHeight:48 }} alt={entry.members[0].name} /> : <div style={{ width:48, height:48, background:'#eee', borderRadius:8 }} />}
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:600, textTransform:'capitalize' }}>Sugerencia {i+1}</div>
                    <div style={{ color:'red', fontSize:12 }}>Sinergia: {entry.synergy_percent != null ? `${entry.synergy_percent}%` : 'N/A'}</div>
                    <div style={{ marginTop:6, display:'flex', gap:6, flexWrap:'wrap' }}>
                      {entry.members.slice(0,4).map(m => (
                        <div key={m.name} style={{ display:'flex', gap:6, alignItems:'center' }}>
                          {m.sprite ? <img src={m.sprite} style={{ width:28, height:28 }} alt={m.name} /> : <div style={{ width:28, height:28, background:'#ddd', borderRadius:6 }} />}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <button onClick={() => { onApply(entry.members.map(m=>m.name)); setResults([]); onClose(); }} className="pk-btn pk-btn-primary">Usar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" style={{ width: results.length > 0 ? 'min(1100px,95vw)' : 'min(900px,95vw)', maxHeight: '90vh', marginLeft: results.length > 0 ? 360 : 0 }} onClick={(e)=>e.stopPropagation()}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-pk-border)' }}>
          <h3 style={{ margin:0 }}>Constructor Asistido por IA</h3>
          <button onClick={onClose} style={{ background:'var(--color-pk-surface)', border:'1px solid var(--color-pk-border)', borderRadius:8, width:36, height:36 }}><FaTimes /></button>
        </div>

        <div style={{ padding:16, display:'flex', gap:12, overflowY:'auto', maxHeight:'72vh' }}>
          <div style={{ flex:1 }}>
            <div style={{ marginBottom:8 }}>
              <label style={{ display:'block', fontSize:12, color:'var(--color-pk-muted)' }}>Semillas (selecciona hasta 4 Pokémon que quieras incluir)</label>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(148px,1fr))', gap:8, maxHeight:260, overflowY:'auto', paddingTop:8 }}>
                {(useCollectionOnly ? allList.filter(p => collectionIds.has(p.id)) : allList).map(p => (
                  <PokemonGridItem
                    key={p.name}
                    p={p}
                    isSelected={seeds.includes(p.name)}
                    onToggle={toggleSeed}
                    cache={pokemonCache.current}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center' }}>
              <button onClick={handleToggleCollection} className={useCollectionOnly? 'pk-btn pk-btn-primary':'pk-btn pk-btn-secondary'}>Sólo mi colección</button>
              <input placeholder="Tipos (ej: fire,dragon)" value={typesFilter} onChange={e=>setTypesFilter(e.target.value)} style={{ padding:8, borderRadius:8, border:'1px solid var(--color-pk-border)', flex:1 }} />
              <button onClick={buildTeams} className="pk-btn pk-btn-primary">Generar 3 equipos</button>
            </div>

            <div style={{ marginTop:12 }}>
              {loading ? <div>Cargando...</div> : (
                results.length === 0 ? <div style={{ color:'var(--color-pk-muted)' }}>No hay resultados aún</div> : (
                  <div style={{ padding:12, borderRadius:8, background:'var(--color-pk-surface)', border:'1px solid var(--color-pk-border)' }}>
                    <div style={{ fontWeight:600 }}>Sugerencias disponibles</div>
                    <div style={{ color:'var(--color-pk-muted)', marginTop:6 }}>Revisa las sugerencias en el panel izquierdo. Haz clic en "Usar" para aplicar un equipo.</div>
                  </div>
                )
              )}
            </div>

          </div>

          <div style={{ width:320 }}>
            <div className="pk-card" style={{ padding:12 }}>
                <h4 style={{ marginTop:0 }}>¿Cómo funciona?</h4>
                <p style={{ margin:'8px 0 0', color:'var(--color-pk-muted)', fontSize:13 }}>Sigue estos pasos rápidos para obtener equipos sugeridos por la IA:</p>
                <ol style={{ margin:'8px 0 0 16px', paddingLeft:12 }}>
                  <li><strong>Elige semillas (opcional):</strong> selecciona hasta 4 Pokémon que quieras incluir en tu equipo.</li>
                  <li><strong>Limita a tu colección:</strong> activa "Sólo mi colección" para ver y usar únicamente los Pokémon que tienes guardados.</li>
                  <li><strong>Filtra por tipos:</strong> escribe tipos separados por comas, por ejemplo <em>fire, dragon</em>, para preferir esos tipos en las sugerencias.</li>
                  <li><strong>Genera sugerencias:</strong> pulsa "Generar 3 equipos"; las mejores sugerencias aparecerán en el panel izquierdo.</li>
                </ol>
                <p style={{ marginTop:8, color:'var(--color-pk-muted)', fontSize:13 }}>Haz clic en <strong>Usar</strong> en cualquiera de las sugerencias para aplicar ese equipo al constructor. Las imágenes muestran los sprites oficiales para que identifiques fácilmente cada Pokémon.</p>
              </div>
          </div>
        </div>

      </div>
    </div>
    </>
  );
}
