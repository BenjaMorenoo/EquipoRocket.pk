// src/components/SearchModal.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { getPokemon, getBackendPokemons, getBackendPokemon, getCollections } from '../services/api';
import TypeBadge from './TypeBadge';

const ITEMS_PER_PAGE = 40;

// Lightweight list item (only fetched on hover/click)
function PokemonListItem({ entry, onSelect, isSelected }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const hasHovered = useRef(false);
  const dataRef = useRef(null);

  const loadData = useCallback(async () => {
    if (dataRef.current || loading) return dataRef.current;
    setLoading(true);
    try {
      let db = null;
      try {
        const res = await getBackendPokemon(entry.name);
        db = res?.data?.pokemon || null;
      } catch { db = null; }

      let built = db ? {
        id: db.id,
        name: db.name,
        stats: db.stats || [],
        types: db.types || [],
        abilities: db.abilities || [],
        sprites: null,
      } : null;

      try {
        const poke = await getPokemon(entry.name);
        const spriteUrl = poke?.sprites?.other?.['official-artwork']?.front_default || poke?.sprites?.front_default || null;
        if (spriteUrl && built) {
          built.sprites = { front_default: spriteUrl, other: { 'official-artwork': { front_default: spriteUrl } } };
        }
        // If DB lookup failed, use full PokeAPI data as fallback
        if (!built && poke) built = poke;
      } catch { /* ignore sprite fetch failures */ }

      if (built) { dataRef.current = built; setData(built); }
      return built;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, [entry.name, loading]);

  const sprite = data?.sprites?.front_default;
  const id     = data ? String(data.id).padStart(3, '0') : (entry.id ? String(entry.id).padStart(3, '0') : '???');

  return (
    <button
      onClick={async () => {
        const pkData = dataRef.current || await loadData();
        onSelect(pkData);
      }}
      onMouseEnter={() => {
        if (!hasHovered.current) {
          hasHovered.current = true;
          loadData();
        }
      }}
      disabled={isSelected}
      style={{
        background: isSelected ? 'rgba(220,38,38,0.08)' : 'var(--color-pk-surface)',
        border: isSelected
          ? '1px solid rgba(220,38,38,0.35)'
          : '1px solid var(--color-pk-border)',
        borderRadius: '10px',
        padding: '10px 12px',
        cursor: isSelected ? 'default' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        transition: 'all 0.15s ease',
        width: '100%',
        textAlign: 'left',
        opacity: isSelected ? 0.6 : 1,
      }}
      onMouseEnter2={(e) => {
        if (!isSelected) {
          e.currentTarget.style.borderColor = 'var(--color-pk-border-light)';
          e.currentTarget.style.background  = 'var(--color-pk-card)';
        }
      }}
    >
      {/* Sprite / skeleton */}
      <div style={{
        width: '44px',
        height: '44px',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-pk-card)',
        borderRadius: '8px',
      }}>
        {loading ? (
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            border: '2px solid var(--color-pk-border-light)',
            borderTopColor: 'var(--color-pk-red)',
            animation: 'spin 0.8s linear infinite',
          }} />
        ) : sprite ? (
          <img src={sprite} alt={entry.name} style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontSize: '20px' }}>🔮</span>
        )}
      </div>

      {/* Info */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{
          fontFamily: 'var(--font-heading)',
          fontWeight: 700,
          fontSize: '13px',
          color: 'var(--color-pk-text)',
          textTransform: 'capitalize',
          letterSpacing: '0.04em',
        }}>
          {entry.name}
        </div>
        <div style={{ fontSize: '10px', color: 'var(--color-pk-muted)', fontFamily: 'var(--font-heading)' }}>
          #{id}
        </div>
      </div>

      {/* Types */}
      {data && (
        <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
          {data.types.map((t) => (
            <TypeBadge key={t.type.name} type={t.type.name} size="xs" />
          ))}
        </div>
      )}

      {/* Selected checkmark */}
      {isSelected && (
        <span style={{ fontSize: '14px', color: 'var(--color-pk-red-light)', flexShrink: 0 }}>✓</span>
      )}
    </button>
  );
}

export default function SearchModal({ onSelect, onClose, selectedPokemon = [] }) {
  const [query,      setQuery]      = useState('');
  const [allList,    setAllList]    = useState([]);
  const [filtered,   setFiltered]   = useState([]);
  const [showOnlyCollection, setShowOnlyCollection] = useState(false);
  const [collectionIds, setCollectionIds] = useState(new Set());
  const [page,       setPage]       = useState(0);
  const [loadingAll, setLoadingAll] = useState(true);
  const [directPk,   setDirectPk]   = useState(null);
  const [directLoad, setDirectLoad] = useState(false);
  const inputRef   = useRef(null);
  const selectedIds = new Set(selectedPokemon.map((p) => p?.name));

  /* Load full list once from ms_pokemon (DB) */
  useEffect(() => {
    (async () => {
      setLoadingAll(true);
      try {
        const res = await getBackendPokemons(1000, 0);
        // res.data.pokemons expected
        const list = (res?.data?.pokemons || []).map(p => ({ name: p.name, id: p.id }));
        setAllList(list);
        setFiltered(list);
      } catch (e) {
        console.warn('Failed to load backend pokemons', e.message);
        setAllList([]);
        setFiltered([]);
      } finally {
        setLoadingAll(false);
      }
    })();
    inputRef.current?.focus();
  }, []);

  /* Filter on query change */
  useEffect(() => {
    const q = query.trim().toLowerCase();
    const base = !q ? allList : allList.filter((p) => p.name.includes(q));
    let result = base;
    if (showOnlyCollection) {
      result = base.filter((p) => collectionIds.has(p.id));
    }
    setFiltered(result);
    setPage(0);
    setDirectPk(null);
  }, [query, allList]);

  // When toggling collection filter, fetch collection ids if needed
  useEffect(() => {
    if (!showOnlyCollection) {
      // if turning off, simply refilter using existing allList (effect above)
      const q = query.trim().toLowerCase();
      const base = !q ? allList : allList.filter((p) => p.name.includes(q));
      setFiltered(base);
      return;
    }
    // showOnlyCollection === true
    (async () => {
      try {
        const res = await getCollections();
        const ids = res?.data?.pokemonIds || res?.pokemonIds || [];
        setCollectionIds(new Set(ids));
        const q = query.trim().toLowerCase();
        const base = !q ? allList : allList.filter((p) => p.name.includes(q));
        setFiltered(base.filter((p) => ids.includes(p.id)));
      } catch (e) {
        console.error('No se pudo cargar la colección del usuario', e.message);
        // fallback: empty filtered list
        setFiltered([]);
      }
    })();
  }, [showOnlyCollection]);

  /* Direct exact search (for IDs or exact names) */
  const handleDirectSearch = async () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    setDirectLoad(true);
    try {
      // Prefer DB lookup
      try {
        const res = await getBackendPokemon(q);
        const db = res?.data?.pokemon || null;
        if (db) {
          // fetch sprite
          try {
            const poke = await getPokemon(q);
            const spriteUrl = poke?.sprites?.other?.['official-artwork']?.front_default || poke?.sprites?.front_default || null;
            db.sprites = spriteUrl ? { front_default: spriteUrl, other: { 'official-artwork': { front_default: spriteUrl } } } : null;
          } catch {}
          setDirectPk(db);
          return;
        }
      } catch (e) {
        // fallback to pokeapi
      }

      const pk = await getPokemon(q);
      setDirectPk(pk);
    } catch {
      setDirectPk(null);
    } finally {
      setDirectLoad(false);
    }
  };

  const paged = filtered.slice(0, (page + 1) * ITEMS_PER_PAGE);
  const hasMore = paged.length < filtered.length;

  /* Close on Escape */
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ width: 'min(620px, 95vw)', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--color-pk-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 700,
              fontSize: '20px',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              margin: 0,
              marginBottom: '2px',
            }}>
              Seleccionar <span style={{ color: 'var(--color-pk-red)' }}>Pokémon</span>
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--color-pk-muted)', margin: 0 }}>
              {filtered.length} Pokémon disponibles
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--color-pk-surface)',
              border: '1px solid var(--color-pk-border)',
              borderRadius: '8px',
              color: 'var(--color-pk-muted)',
              cursor: 'pointer',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              flexShrink: 0,
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Search bar */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--color-pk-border)' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              ref={inputRef}
              type="text"
              className="pk-input"
              placeholder="Buscar por nombre o ID (ej: pikachu, 25)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDirectSearch()}
              style={{ flex: 1, padding: '10px 14px', fontSize: '14px' }}
            />
            <button
              className="pk-btn pk-btn-secondary"
              onClick={handleDirectSearch}
              disabled={directLoad}
              style={{ padding: '10px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {directLoad ? '...' : (<FaSearch />)}
            </button>
            <button
              onClick={async () => {
                const token = localStorage.getItem('pk_token');
                if (!token) {
                  alert('Inicia sesión para usar el filtro de colección');
                  return;
                }
                setShowOnlyCollection(s => !s);
              }}
              className={showOnlyCollection ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'}
              style={{ padding: '10px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}
              title="Mostrar sólo Pokémon de mi colección"
            >
              {showOnlyCollection ? 'Mi colección' : 'Sólo mi colección'}
            </button>
          </div>
        </div>

        {/* Direct search result */}
        {directPk && (
          <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--color-pk-border)' }}>
            <p style={{ fontSize: '11px', color: 'var(--color-pk-muted)', marginBottom: '8px', fontFamily: 'var(--font-heading)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Resultado exacto
            </p>
            <PokemonListItem
              entry={{ name: directPk.name, url: '' }}
              onSelect={() => onSelect(directPk)}
              isSelected={selectedIds.has(directPk.name)}
            />
          </div>
        )}

        {/* List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
        }}>
          {loadingAll ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-pk-muted)' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                border: '3px solid var(--color-pk-border)',
                borderTopColor: 'var(--color-pk-red)',
                animation: 'spin 0.8s linear infinite',
                margin: '0 auto 12px',
              }} />
              Cargando Pokédex...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-pk-muted)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>No encontrado</div>
              No se encontró ningún Pokémon con ese nombre.
            </div>
          ) : (
            <>
                  {paged.map((entry) => (
                    <PokemonListItem
                      key={entry.name}
                      entry={entry}
                      onSelect={async (pkData) => {
                        if (!pkData) {
                          try {
                            const d = await getPokemon(entry.name);
                            onSelect(d);
                          } catch { /* ignore */ }
                        } else {
                          onSelect(pkData);
                        }
                      }}
                      isSelected={selectedIds.has(entry.name)}
                    />
                  ))}

              {hasMore && (
                <button
                  className="pk-btn pk-btn-secondary"
                  onClick={() => setPage((p) => p + 1)}
                  style={{ marginTop: '8px', width: '100%', justifyContent: 'center', fontSize: '13px' }}
                >
                  Cargar más ({filtered.length - paged.length} restantes)
                </button>
              )}
            </>
          )}
        </div>

        {/* Spin animation */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}
