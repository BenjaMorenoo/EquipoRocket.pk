// src/App.jsx
import { useState } from 'react';
import Navbar from './components/Navbar';
import TeamBuilder from './pages/TeamBuilder';
import MyTeams from './pages/MyTeams';

// Placeholder pages for nav links not yet implemented
function PlaceholderPage({ title, icon, description }) {
  return (
    <div style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '80px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '56px', marginBottom: '20px' }}>{icon}</div>
      <h1 style={{
        fontFamily: 'var(--font-heading)',
        fontWeight: 700,
        fontSize: '32px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        margin: '0 0 12px',
      }}>
        {title}
      </h1>
      <p style={{ color: 'var(--color-pk-muted)', fontSize: '15px', maxWidth: '400px', margin: '0 auto 32px' }}>
        {description}
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: '10px',
        padding: '10px 20px',
        color: 'var(--color-pk-yellow)',
        fontFamily: 'var(--font-heading)',
        fontWeight: 600,
        fontSize: '13px',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
      }}>
        🚧 En desarrollo
      </div>
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('teams');
  const [editingTeam, setEditingTeam] = useState(null);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    if (page !== 'builder') setEditingTeam(null);
  };

  const handleNavigateToBuilder = (team = null) => {
    setEditingTeam(team);
    setCurrentPage('builder');
  };

  const handleSaveTeam = async (teamData) => {
    // Will connect to backend API once microservices are ready
    console.log('[TeamBuilder] Guardando equipo:', teamData);
    // Simulate API delay
    await new Promise((r) => setTimeout(r, 800));
    // After saving, redirect to teams list
    setCurrentPage('teams');
  };

  return (
    <div style={{ minHeight: '100vh' }} className="bg-grid">
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      <main style={{ position: 'relative', zIndex: 1 }}>
        {currentPage === 'teams' && (
          <MyTeams onNavigateToBuilder={handleNavigateToBuilder} />
        )}

        {currentPage === 'builder' && (
          <TeamBuilder
            initialTeam={editingTeam}
            onSave={handleSaveTeam}
          />
        )}

        {currentPage === 'dex' && (
          <PlaceholderPage
            title="Pokédex"
            icon="📖"
            description="Explora todos los Pokémon disponibles en Pokémon Champions con estadísticas, habilidades y más."
          />
        )}

        {currentPage === 'ranking' && (
          <PlaceholderPage
            title="Rankings"
            icon="🏆"
            description="Consulta los equipos más usados en la meta competitiva y los mejores jugadores de la temporada."
          />
        )}
      </main>
    </div>
  );
}
