// src/pages/MisPokemon.jsx
import { useEffect, useState } from 'react';
import { getBackendPokemons } from '../services/api';

export default function MisPokemon() {
  const [loading, setLoading] = useState(true);
  const [pokemons, setPokemons] = useState([]);
  const [selected, setSelected] = useState(() => {
    try { return JSON.parse(localStorage.getItem('my_pokemons') || '[]'); } catch (e) { return []; }
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await getBackendPokemons(500, 0);
        // ms_pokemon returns { success: true, data: { pokemons: [...] } }
        const list = res?.data?.pokemons || res?.pokemons || [];
        if (mounted) setPokemons(list);
      } catch (e) {
        console.error('Error cargando pokemons del backend', e.message);
        if (mounted) setPokemons([]);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, []);

  const toggleSelect = (id) => {
    setSelected(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('my_pokemons', JSON.stringify(next));
      return next;
    });
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {pokemons.map((p) => (
            <div key={p.id} className="pk-card" style={{ padding: 12, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{p.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-pk-subtle)' }}>#{String(p.id).padStart(3, '0')}</div>
              </div>

              <div style={{ color: 'var(--color-pk-muted)', fontSize: 13, marginBottom: 12 }}>HP: {p.hp ?? '-'} · ATK: {p.attack ?? '-'} · DEF: {p.defense ?? '-'}</div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
                <button onClick={() => toggleSelect(p.id)} className={selected.includes(p.id) ? 'pk-btn pk-btn-primary' : 'pk-btn pk-btn-secondary'} style={{ padding: '6px 10px', fontSize: 13 }}>
                  {selected.includes(p.id) ? 'Seleccionado' : 'Seleccionar'}
                </button>
                <button onClick={() => { navigator.clipboard?.writeText(p.name); }} className="pk-btn" style={{ padding: '6px 10px', fontSize: 12 }}>Copiar nombre</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
