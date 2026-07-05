import { useState, useEffect } from 'react';
import { getPokemon } from '../services/api';

// Module-level cache: name → sprite URL (persists across re-renders)
// Name resolution (Pikalytics → PokeAPI) is handled by getPokemon() in api.js
const spriteCache = new Map();
const pendingFetches = new Map();

function fetchSprite(name) {
  if (!name) return Promise.resolve(null);
  const key = name.toLowerCase();
  if (spriteCache.has(key)) return Promise.resolve(spriteCache.get(key));
  if (pendingFetches.has(key)) return pendingFetches.get(key);

  const promise = getPokemon(key)
    .then(d => {
      const url =
        d?.sprites?.other?.['official-artwork']?.front_default ||
        d?.sprites?.front_default ||
        null;
      spriteCache.set(key, url);
      pendingFetches.delete(key);
      return url;
    })
    .catch(() => {
      spriteCache.set(key, null);
      pendingFetches.delete(key);
      return null;
    });

  pendingFetches.set(key, promise);
  return promise;
}

export default function PokemonSprite({ name, size = 40, style = {}, alt }) {
  const [url, setUrl] = useState(() => {
    const key = name?.toLowerCase();
    return key && spriteCache.has(key) ? spriteCache.get(key) : undefined;
  });

  useEffect(() => {
    if (!name) { setUrl(null); return; }
    let mounted = true;
    fetchSprite(name).then(u => { if (mounted) setUrl(u); });
    return () => { mounted = false; };
  }, [name]);

  if (url === undefined) {
    // loading placeholder
    return (
      <div style={{ width: size, height: size, borderRadius: 4, background: 'rgba(255,255,255,0.05)', flexShrink: 0, ...style }} />
    );
  }

  if (!url) {
    return (
      <div style={{ width: size, height: size, borderRadius: 4, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.4, flexShrink: 0, ...style }}>
        ?
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt ?? name}
      width={size}
      height={size}
      style={{ objectFit: 'contain', flexShrink: 0, ...style }}
      onError={e => { e.target.style.opacity = '0.15'; }}
    />
  );
}
