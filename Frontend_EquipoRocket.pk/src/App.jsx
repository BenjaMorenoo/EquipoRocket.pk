// src/App.jsx
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import Navbar from './components/Navbar';
import TeamBuilder from './pages/TeamBuilder';
import MyTeams from './pages/MyTeams';
import UserProfile from './pages/UserProfile';
import AdminPanel from './pages/AdminPanel';

function PlaceholderPage({ title, icon, description }) {
  return (
    <div style={{ maxWidth:'1440px', margin:'0 auto', padding:'80px 24px', textAlign:'center' }}>
      <div style={{ fontSize:'56px', marginBottom:'20px' }}>{icon}</div>
      <h1 style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:'32px', letterSpacing:'0.06em', textTransform:'uppercase', margin:'0 0 12px' }}>{title}</h1>
      <p style={{ color:'var(--color-pk-muted)', fontSize:'15px', maxWidth:'400px', margin:'0 auto 32px' }}>{description}</p>
      <div style={{ display:'inline-flex', alignItems:'center', gap:'8px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:'10px', padding:'10px 20px', color:'var(--color-pk-yellow)', fontFamily:'var(--font-heading)', fontWeight:600, fontSize:'13px', letterSpacing:'0.06em', textTransform:'uppercase' }}>
        🚧 En desarrollo
      </div>
    </div>
  );
}

function AppContent() {
  const { user, logout } = useAuth();
  const [currentPage,  setCurrentPage]  = useState('teams');
  const [editingTeam,  setEditingTeam]  = useState(null);
  const [previewMode,  setPreviewMode]  = useState(false); // admin viewing as user

  const handleNavigate = (page) => {
    // Non-admins (or admins in preview mode) cannot access admin panel
    if (page === 'admin' && (!user?.is_admin || previewMode)) return;
    setCurrentPage(page);
    if (page !== 'builder') setEditingTeam(null);
  };

  const handleNavigateToBuilder = (team = null) => {
    setEditingTeam(team); setCurrentPage('builder');
  };

  const handleSaveTeam = async (teamData) => {
    console.log('[TeamBuilder] Guardando equipo:', teamData);
    await new Promise(r => setTimeout(r, 800));
    setCurrentPage('teams');
  };

  const handlePreviewAsUser = () => {
    setPreviewMode(true);
    // If they were on admin panel, redirect to teams
    if (currentPage === 'admin') setCurrentPage('teams');
  };

  const handleExitPreview = () => {
    setPreviewMode(false);
    setCurrentPage('admin'); // return to admin panel
  };

  return (
    <div style={{ minHeight:'100vh' }} className="bg-grid">
      <Navbar
        currentPage={currentPage}
        onNavigate={handleNavigate}
        user={user}
        onLogout={logout}
        isPreview={previewMode}
        onExitPreview={handleExitPreview}
      />
      <main style={{ position:'relative', zIndex:1 }}>
        {currentPage === 'teams'   && <MyTeams    onNavigateToBuilder={handleNavigateToBuilder} />}
        {currentPage === 'builder' && <TeamBuilder initialTeam={editingTeam} onSave={handleSaveTeam} />}
        {currentPage === 'profile' && <UserProfile onNavigate={handleNavigate} />}
        {currentPage === 'admin'   && user?.is_admin && !previewMode && (
          <AdminPanel onPreviewAsUser={handlePreviewAsUser} />
        )}
        {currentPage === 'dex'     && <PlaceholderPage title="Pokédex"  icon="📖" description="Explora todos los Pokémon disponibles en Pokémon Champions." />}
        {currentPage === 'ranking' && <PlaceholderPage title="Rankings" icon="🏆" description="Los equipos más usados en la meta competitiva." />}
      </main>
    </div>
  );
}

function AuthGate() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'16px' }}>
      <div style={{ width:'44px', height:'44px', borderRadius:'50%', border:'3px solid var(--color-pk-border)', borderTopColor:'var(--color-pk-red)', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  return user ? <AppContent /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
