import { useState, useMemo, useEffect } from 'react';
import { getAdminTeamById } from '../services/api';
import PokemonSprite from './PokemonSprite';
import { FaRobot, FaUser, FaTimes, FaSearch, FaTrophy, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PAGE_SIZE = 12;

const formatName = n =>
  (n || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

/* ── Badges ── */
function CreatedByBadge({ value }) {
  const isAI = value === 'ai';
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase', borderRadius: 20,
      padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: 4,
      background: isAI ? 'rgba(124,58,237,0.12)' : 'rgba(59,130,246,0.08)',
      border: `1px solid ${isAI ? 'rgba(124,58,237,0.35)' : 'rgba(59,130,246,0.25)'}`,
      color: isAI ? '#a78bfa' : '#6890F0',
    }}>
      {isAI ? <FaRobot style={{ fontSize: 8 }} /> : <FaUser style={{ fontSize: 8 }} />}
      {isAI ? 'IA' : 'Manual'}
    </span>
  );
}

function ActiveBadge({ active }) {
  const on = active !== false;
  return (
    <span style={{
      fontSize: 10, fontFamily: 'var(--font-heading)', fontWeight: 700,
      letterSpacing: '0.07em', textTransform: 'uppercase', borderRadius: 20,
      padding: '3px 8px',
      background: on ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.08)',
      border: `1px solid ${on ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.2)'}`,
      color: on ? '#4ade80' : '#fca5a5',
    }}>
      {on ? '● Activo' : '○ Inactivo'}
    </span>
  );
}

/* ── Paginación ── */
function Pagination({ page, total, onChange }) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  if (totalPages <= 1) return null;

  const pages = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== '…') pages.push('…');
  }

  const btnStyle = (active, disabled) => ({
    minWidth: 32, height: 32, borderRadius: 8, border: '1px solid',
    fontSize: 12, fontFamily: 'var(--font-heading)', fontWeight: 700,
    cursor: disabled ? 'default' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background:     active   ? 'rgba(245,158,11,0.15)' : 'var(--color-pk-surface)',
    borderColor:    active   ? 'rgba(245,158,11,0.5)'  : 'var(--color-pk-border)',
    color:          active   ? '#f59e0b' : disabled ? 'rgba(255,255,255,0.2)' : 'var(--color-pk-muted)',
    opacity: disabled ? 0.5 : 1,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 24 }}>
      <button style={btnStyle(false, page === 1)} disabled={page === 1} onClick={() => onChange(page - 1)}>
        <FaChevronLeft style={{ fontSize: 10 }} />
      </button>
      {pages.map((p, i) =>
        p === '…'
          ? <span key={`e${i}`} style={{ color: 'var(--color-pk-muted)', fontSize: 12, padding: '0 4px' }}>…</span>
          : <button key={p} style={btnStyle(p === page, false)} onClick={() => onChange(p)}>{p}</button>
      )}
      <button style={btnStyle(false, page === totalPages)} disabled={page === totalPages} onClick={() => onChange(page + 1)}>
        <FaChevronRight style={{ fontSize: 10 }} />
      </button>
    </div>
  );
}

/* ── Tarjeta de equipo ── */
function TeamCard({ team, creatorName, onClick }) {
  const pokemon = team.pokemon ?? team.team_pokemon ?? [];
  const count   = pokemon.length || team.pokemon_count || null;

  return (
    <div
      className="pk-card"
      onClick={onClick}
      style={{
        padding: '16px 18px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 10,
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'rgba(245,158,11,0.45)';
        e.currentTarget.style.background  = 'rgba(245,158,11,0.03)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = '';
        e.currentTarget.style.background  = '';
      }}
    >
      {/* Nombre + badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 14,
          color: 'var(--color-pk-text)', lineHeight: 1.25, flex: 1, minWidth: 0,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {team.name || `Equipo #${team.id}`}
        </div>
        <CreatedByBadge value={team.created_by} />
      </div>

      {/* Sprites de Pokémon */}
      <div style={{ display: 'flex', gap: 0, alignItems: 'center', minHeight: 40 }}>
        {pokemon.length > 0
          ? pokemon.slice(0, 6).map((p, i) => (
              <PokemonSprite
                key={i}
                name={p.pokemon_name ?? p.name}
                size={40}
              />
            ))
          : <span style={{ fontSize: 11, color: 'var(--color-pk-muted)', fontStyle: 'italic' }}>
              {count ? `${count} Pokémon` : 'Sin Pokémon'}
            </span>
        }
        {pokemon.length > 0 && pokemon.length < 6 && (
          <span style={{ fontSize: 10, color: 'var(--color-pk-muted)', marginLeft: 4 }}>
            {pokemon.length}/6
          </span>
        )}
      </div>

      {/* Pie: creador + fecha */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--color-pk-muted)' }}>
          <span>por </span>
          <span style={{ fontWeight: 700, color: 'var(--color-pk-subtle)' }}>{creatorName}</span>
        </span>
        <span style={{ fontSize: 10, color: 'var(--color-pk-muted)' }}>
          {team.created_at ? new Date(team.created_at).toLocaleDateString('es-CL') : '—'}
        </span>
      </div>
    </div>
  );
}

/* ── Modal de detalle ── */
function TeamDetailModal({ teamId, initialTeam, creatorName, onClose }) {
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    let mounted = true;
    getAdminTeamById(teamId)
      .then(res => {
        if (!mounted) return;
        const t = res?.data?.team ?? res?.data ?? res?.team ?? res ?? null;
        setDetail(t);
        setLoading(false);
      })
      .catch(e => { if (mounted) { setError(e.message || 'Error'); setLoading(false); } });
    return () => { mounted = false; };
  }, [teamId]);

  const team   = detail ?? initialTeam;
  const pokemon = team?.pokemon ?? team?.team_pokemon ?? [];

  return (
    <div
      role="dialog" aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        background: 'rgba(6,9,20,0.88)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, animation: 'fadeIn .18s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--color-pk-card)', border: '1px solid var(--color-pk-border)',
          borderRadius: 20, padding: 28, width: 'min(640px,100%)',
          maxHeight: '90vh', overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 20,
          animation: 'modalSlide .22s ease',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 20,
              color: 'var(--color-pk-text)', marginBottom: 8, lineHeight: 1.2,
            }}>
              <FaTrophy style={{ color: '#f59e0b', marginRight: 10, fontSize: 16 }} />
              {team?.name || `Equipo #${teamId}`}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <CreatedByBadge value={team?.created_by} />
              <ActiveBadge active={team?.active} />
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
              borderRadius: 8, color: 'var(--color-pk-muted)', cursor: 'pointer',
              width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FaTimes />
          </button>
        </div>

        {/* Métricas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px,1fr))', gap: 10 }}>
          {[
            { label: 'Creador',       value: creatorName,                                       color: '#6890F0' },
            { label: 'Pokémon',       value: loading ? '…' : `${pokemon.length} / 6`,           color: '#22c55e' },
            { label: 'Win rate',      value: team?.win_rate      ? `${team.win_rate}%`    : '—', color: '#f59e0b' },
            { label: 'Sinergia',      value: team?.synergy_score ? `${team.synergy_score}%` : '—', color: '#a78bfa' },
            { label: 'Creado',        value: team?.created_at    ? new Date(team.created_at).toLocaleDateString('es-CL') : '—', color: 'var(--color-pk-subtle)' },
          ].map(s => (
            <div key={s.label} style={{
              background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
              borderRadius: 10, padding: '10px 14px',
            }}>
              <div style={{ fontSize: 9, fontFamily: 'var(--font-heading)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-pk-muted)', marginBottom: 4 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: 18, color: s.color, lineHeight: 1 }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>

        {/* Lista de Pokémon */}
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase',
            color: 'var(--color-pk-muted)', marginBottom: 12,
          }}>
            Pokémon del equipo
          </div>

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-pk-muted)', fontSize: 12, padding: '16px 0' }}>
              <span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid var(--color-pk-border)', borderTopColor: '#f59e0b', display: 'inline-block', animation: 'spin .8s linear infinite' }} />
              Cargando datos del equipo...
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          )}

          {error && (
            <div style={{ color: '#fca5a5', fontSize: 12, padding: '8px 12px', background: 'rgba(239,68,68,0.06)', borderRadius: 8 }}>
              {error}
            </div>
          )}

          {!loading && pokemon.length === 0 && !error && (
            <div style={{ color: 'var(--color-pk-muted)', fontSize: 12, fontStyle: 'italic' }}>
              Este equipo no tiene Pokémon registrados.
            </div>
          )}

          {pokemon.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {pokemon.map((p, i) => {
                const slot = p.slot ?? i + 1;
                return (
                  <div key={i} style={{
                    background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
                    borderRadius: 12, padding: '10px 14px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: 'rgba(255,255,255,0.06)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 800, color: 'var(--color-pk-muted)',
                      fontFamily: 'var(--font-heading)',
                    }}>
                      {slot}
                    </div>
                    <PokemonSprite
                      name={p.pokemon_name ?? p.name}
                      size={48}
                    />
                    <span style={{
                      fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: 12,
                      color: 'var(--color-pk-text)', lineHeight: 1.2,
                    }}>
                      {formatName(p.pokemon_name ?? p.name ?? '')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from { opacity:0 } to { opacity:1 } }
        @keyframes modalSlide { from { opacity:0; transform:scale(.96) translateY(10px) } to { opacity:1; transform:scale(1) translateY(0) } }
      `}</style>
    </div>
  );
}

/* ── Componente principal ── */
export default function AdminTeamsView({ teams = [], users = [] }) {
  const [search,    setSearch]    = useState('');
  const [filterBy,  setFilterBy]  = useState('');   // 'ai' | 'manual' | ''
  const [page,      setPage]      = useState(1);
  const [detailId,  setDetailId]  = useState(null);

  const userMap = useMemo(() => {
    const m = {};
    for (const u of users) m[u.id] = u.username;
    return m;
  }, [users]);

  const filtered = useMemo(() => {
    return teams.filter(t => {
      if (filterBy && t.created_by !== filterBy) return false;
      if (search) {
        const q = search.toLowerCase();
        const name    = (t.name || '').toLowerCase();
        const creator = (userMap[t.user_id] || '').toLowerCase();
        if (!name.includes(q) && !creator.includes(q)) return false;
      }
      return true;
    });
  }, [teams, filterBy, search, userMap]);

  // Reset page on filter change
  useEffect(() => setPage(1), [search, filterBy]);

  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const selectedTeam = detailId != null ? teams.find(t => t.id === detailId) : null;

  const selStyle = {
    background: 'var(--color-pk-surface)', border: '1px solid var(--color-pk-border)',
    borderRadius: 8, color: 'var(--color-pk-text)', fontFamily: 'var(--font-body)',
    fontSize: 13, padding: '8px 10px', outline: 'none', cursor: 'pointer',
  };

  return (
    <div>
      {/* Encabezado */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: 'var(--font-heading)', fontWeight: 700,
          fontSize: 'clamp(20px,3vw,28px)', letterSpacing: '0.06em',
          textTransform: 'uppercase', margin: 0, color: 'var(--color-pk-text)',
        }}>
          Equipos
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-pk-muted)' }}>
          {teams.length} equipos registrados en la plataforma
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <input
            type="search"
            placeholder="Buscar por nombre o creador..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...selStyle, width: '100%', padding: '9px 13px 9px 36px', borderRadius: 10, boxSizing: 'border-box' }}
          />
          <FaSearch style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-pk-muted)', fontSize: 12 }} />
        </div>
        <select value={filterBy} onChange={e => setFilterBy(e.target.value)} style={selStyle} aria-label="Tipo de creación">
          <option value="">Todos los equipos</option>
          <option value="manual">Solo manual</option>
          <option value="ai">Solo IA</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--color-pk-muted)', flexShrink: 0 }}>
          {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Grid de tarjetas */}
      {filtered.length === 0 ? (
        <div className="pk-card" style={{ padding: 40, textAlign: 'center', color: 'var(--color-pk-muted)', fontSize: 13 }}>
          No se encontraron equipos
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 14 }}>
            {paginated.map(team => (
              <TeamCard
                key={team.id}
                team={team}
                creatorName={team.creator_username ?? userMap[team.user_id] ?? `Usuario #${team.user_id}`}
                onClick={() => setDetailId(team.id)}
              />
            ))}
          </div>
          <Pagination
            page={page}
            total={filtered.length}
            onChange={setPage}
          />
        </>
      )}

      {/* Modal de detalle */}
      {detailId != null && (
        <TeamDetailModal
          teamId={detailId}
          initialTeam={selectedTeam}
          creatorName={selectedTeam?.creator_username ?? userMap[selectedTeam?.user_id] ?? `Usuario #${selectedTeam?.user_id}`}
          onClose={() => setDetailId(null)}
        />
      )}
    </div>
  );
}
