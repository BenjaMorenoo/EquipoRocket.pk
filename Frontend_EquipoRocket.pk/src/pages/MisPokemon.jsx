// src/pages/MisPokemon.jsx
import { useEffect, useState } from 'react';
import { getBackendPokemons, getBackendPokemon, getPokemon as getPokeApiPokemon, getCollections, addToCollection, removeFromCollection } from '../services/api';
import TypeBadge from '../components/TypeBadge';

export default function MisPokemon() {
  const [loading, setLoading] = useState(true);
  const [pokemons, setPokemons] = useState([]);
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('my_pokemons') || '[]'); } catch (e) { return []; }
  });
  const [types, setTypes] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [showOnlyMine, setShowOnlyMine] = useState(false);
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBackendPokemons(500, 0);
        // ms_pokemon returns { success: true, data: { pokemons: [...] } }
        const list = res?.data?.pokemons || res?.pokemons || [];
        // enrich with backend details (types, stats) and sprite from PokeAPI
        const enriched = await Promise.all(list.map(async (p) => {
          try {
            const detail = await getBackendPokemon(p.name).then(r => r.data?.pokemon).catch(() => null);
            const d = await getPokeApiPokemon(p.name).catch(() => null);
            const sprite = d?.sprites?.other?.['official-artwork']?.front_default || d?.sprites?.front_default || null;
            // prefer detail fields when available
            const out = detail ? { ...detail, sprite } : { ...p, sprite, types: detail?.types || [] };
            return out;
          } catch (e) {
            return { ...p, sprite: null };
          }
        }));
        if (mounted) {
          setPokemons(enriched);
          // derive types list
          const typeSet = new Set();
          enriched.forEach(ep => {
            const tarr = ep?.types || [];
            tarr.forEach(t => {
              const tn = typeof t === 'string' ? t : (t.type?.name || t.name);
              if (tn) typeSet.add(tn);
            });
          });
          setTypes(Array.from(typeSet).sort());
        }
      } catch (e) {
        console.error('Error cargando pokemons del backend', e.message);
        if (mounted) setPokemons([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  // sync selected from backend when user is authenticated
  useEffect(() => {
    const token = localStorage.getItem('pk_token');
    if (!token) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getCollections();
        const ids = res?.data?.pokemonIds || res?.pokemonIds || [];
        if (mounted) {
          setSelected(ids);
          localStorage.setItem('my_pokemons', JSON.stringify(ids));
        }
      } catch (e) {
        console.error('No se pudieron cargar las colecciones del usuario', e.message);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleSelect = async (id) => {
    const token = localStorage.getItem('pk_token');
    const exists = selected.includes(id);
    if (token) {
      try {
        if (exists) {
          await removeFromCollection(id);
          setSelected(prev => {
            const next = prev.filter(x => x !== id);
            localStorage.setItem('my_pokemons', JSON.stringify(next));
            return next;
          });
        } else {
          await addToCollection(id);
          setSelected(prev => {
            const next = [...prev, id];
            localStorage.setItem('my_pokemons', JSON.stringify(next));
            return next;
          });
        }
      } catch (e) {
        console.error('Error sincronizando colección con backend', e.message);
      }
    } else {
      // fallback to local-only behavior
      setSelected(prev => {
        const next = exists ? prev.filter(x => x !== id) : [...prev, id];
        localStorage.setItem('my_pokemons', JSON.stringify(next));
        return next;
      });
    }
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 28, margin: 0 }}>Mis Pokémon</h1>
          <p style={{ color: 'var(--color-pk-muted)', marginTop: 6 }}>Selecciona los Pokémon que tienes (guardado en el navegador).</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 13, color: 'var(--color-pk-muted)' }}>Seleccionados</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18 }}>{selected.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-pk-muted)' }}>Cargando Pokémon...</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: 'var(--color-pk-muted)' }}>Filtrar por tipo:</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '6px 10px', background: '#fff', color: '#000', border: '1px solid var(--color-pk-border)', borderRadius: 6 }}>
                <option value="all">Todos</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 13, color: 'var(--color-pk-muted)' }}>Buscar:</label>
              <input value={nameFilter} onChange={(e) => setNameFilter(e.target.value)} placeholder="Nombre..." style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-pk-border)', background: '#fff', color: '#000' }} />
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOnlyMine(false)} className={!showOnlyMine ? 'pk-btn pk-btn-primary' : 'pk-btn'}>Todos</button>
              <button onClick={() => setShowOnlyMine(true)} className={showOnlyMine ? 'pk-btn pk-btn-primary' : 'pk-btn'}>Solo seleccionados</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12 }}>
          {pokemons
            .filter(p => {
              if (showOnlyMine && !selected.includes(p.id)) return false;
              if (filterType !== 'all') {
                const names = (p.types || []).map(t => (typeof t === 'string' ? t : (t.type?.name || t.name)));
                if (!names.includes(filterType)) return false;
              }
              if (nameFilter && !p.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
              return true;
            })
            .map((p) => (
            <div key={p.id} className="pk-card" style={{ padding: 12, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 72, height: 72, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/** sprite from PokeAPI loaded into sprites map */}
                <img src={p.sprite || ''} alt={p.name} style={{ width: 64, height: 64, objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
              </div>
              <div style={{ fontWeight: 700, textTransform: 'capitalize', textAlign: 'center' }}>{p.name}</div>

              <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                <button onClick={() => toggleSelect(p.id)} className={selected.includes(p.id) ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'} style={{ padding: '8px 12px', fontSize: 13 }}>
                  {selected.includes(p.id) ? 'Seleccionado' : 'Seleccionar'}
                </button>
              </div>
            </div>
          ))}
          </div>
        </>
      )}
    </div>
  );
}

