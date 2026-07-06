// src/pages/MisPokemon.jsx
import { useEffect, useState } from 'react';
import { getBackendPokemons, getBackendPokemon, getPokemon as getPokeApiPokemon, getCollections, addToCollection, removeFromCollection } from '../services/api';
import TypeBadge from '../components/TypeBadge';
import { getTypeColor } from '../utils/typeColors';

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

  const getTypeName = (t) => typeof t === 'string' ? t : (t?.type?.name || t?.name || '');

  const filtered = pokemons.filter(p => {
    if (showOnlyMine && !selected.includes(p.id)) return false;
    if (filterType !== 'all') {
      if (!(p.types || []).map(getTypeName).includes(filterType)) return false;
    }
    if (nameFilter && !p.name.toLowerCase().includes(nameFilter.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '36px 24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 30, margin: 0 }}>Mis Pokémon</h1>
          <p style={{ color: 'var(--color-pk-muted)', marginTop: 6, fontSize: 14 }}>
            Tu Pokédex personal. Marca los que tienes en tu colección.
          </p>
        </div>
        <div style={{
          background: 'var(--color-pk-surface)',
          border: '1px solid var(--color-pk-border)',
          borderRadius: 12,
          padding: '10px 20px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 11, color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Colección</div>
          <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: 'var(--color-pk-red)', lineHeight: 1.1 }}>{selected.length}</div>
          <div style={{ fontSize: 11, color: 'var(--color-pk-muted)' }}>de {pokemons.length}</div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-pk-muted)' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid var(--color-pk-border)', borderTopColor: 'var(--color-pk-red)', animation: 'spin .8s linear infinite', margin: '0 auto 16px' }} />
          Cargando Pokédex...
        </div>
      ) : (
        <>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              placeholder="Buscar por nombre..."
              className="pk-input"
              style={{ padding: '8px 14px', fontSize: 13, minWidth: 180 }}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ padding: '8px 12px', background: 'var(--color-pk-surface)', color: 'var(--color-pk-text)', border: '1px solid var(--color-pk-border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}
            >
              <option value="all">Todos los tipos</option>
              {types.map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t}</option>)}
            </select>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <button onClick={() => setShowOnlyMine(false)} className={!showOnlyMine ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'} style={{ fontSize: 13, padding: '8px 14px' }}>
                Todos ({pokemons.length})
              </button>
              <button onClick={() => setShowOnlyMine(true)} className={showOnlyMine ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'} style={{ fontSize: 13, padding: '8px 14px' }}>
                Mi colección ({selected.length})
              </button>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: 14 }}>
            {filtered.map((p) => {
              const inCollection = selected.includes(p.id);
              const typeNames = (p.types || []).map(getTypeName).filter(Boolean);
              const primaryType = typeNames[0] || 'normal';
              const colors = getTypeColor(primaryType);
              const dexNum = p.pokeapi_id || p.id;

              return (
                <div
                  key={p.id}
                  onClick={() => toggleSelect(p.id)}
                  style={{
                    position: 'relative',
                    borderRadius: 14,
                    border: `2px solid ${inCollection ? colors.bg : 'var(--color-pk-border)'}`,
                    background: inCollection
                      ? `linear-gradient(160deg, ${colors.light}, var(--color-pk-surface))`
                      : 'var(--color-pk-surface)',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'transform 0.15s, border-color 0.15s, box-shadow 0.15s',
                    boxShadow: inCollection ? `0 4px 18px ${colors.border}` : '0 1px 4px rgba(0,0,0,0.06)',
                    userSelect: 'none',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {/* Type color strip at top */}
                  <div style={{ height: 6, background: colors.bg, opacity: inCollection ? 1 : 0.35 }} />

                  {/* Dex number */}
                  <div style={{
                    position: 'absolute', top: 12, left: 10,
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: 10, color: inCollection ? colors.bg : 'var(--color-pk-muted)',
                    letterSpacing: '0.05em',
                  }}>
                    #{String(dexNum).padStart(3, '0')}
                  </div>

                  {/* Checkmark overlay */}
                  {inCollection && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 20, height: 20, borderRadius: '50%',
                      background: colors.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: colors.text, fontWeight: 900,
                    }}>✓</div>
                  )}

                  {/* Sprite */}
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '18px 12px 8px',
                    background: inCollection ? `radial-gradient(circle at 50% 60%, ${colors.light} 0%, transparent 70%)` : 'transparent',
                  }}>
                    {p.sprite ? (
                      <img
                        src={p.sprite}
                        alt={p.name}
                        style={{ width: 88, height: 88, objectFit: 'contain', filter: inCollection ? 'none' : 'grayscale(40%) opacity(0.7)', transition: 'filter 0.2s' }}
                        onError={e => { e.currentTarget.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, opacity: 0.3 }}>?</div>
                    )}
                  </div>

                  {/* Name */}
                  <div style={{
                    fontFamily: 'var(--font-heading)', fontWeight: 700,
                    fontSize: 12, textAlign: 'center',
                    textTransform: 'capitalize',
                    color: 'var(--color-pk-text)',
                    padding: '0 8px 8px',
                    letterSpacing: '0.03em',
                  }}>
                    {p.name.replace(/-/g, ' ')}
                  </div>

                  {/* Type badges */}
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 4, padding: '0 8px 12px', flexWrap: 'wrap' }}>
                    {typeNames.map(t => <TypeBadge key={t} type={t} size="xs" />)}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div style={{ padding: 60, textAlign: 'center', color: 'var(--color-pk-muted)' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>—</div>
              No hay Pokémon que coincidan con los filtros.
            </div>
          )}
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

