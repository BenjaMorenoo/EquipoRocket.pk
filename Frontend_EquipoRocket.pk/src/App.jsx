// src/App.jsx
import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage     from './pages/AuthPage';
import Navbar       from './components/Navbar';
import Home         from './pages/Home';
import TeamBuilder  from './pages/TeamBuilder';
import MyTeams      from './pages/MyTeams';
import UserProfile  from './pages/UserProfile';
import AdminPanel   from './pages/AdminPanel';
import MisPokemon   from './pages/MisPokemon';
import Simulations  from './pages/Simulations';
import { createTeam, updateTeam } from './services/api';

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

function AppShell() {
  const { user, logout, loading } = useAuth();
  const [currentPage,  setCurrentPage]  = useState('home');
  const [adminInitialSection, setAdminInitialSection] = useState(null);
  const [editingTeam,  setEditingTeam]  = useState(null);
  const [previewMode,  setPreviewMode]  = useState(false);
  const [showAuth,     setShowAuth]     = useState(false); // modal de login/register

  const navigate = (page) => {
    if (page === 'auth')  { setShowAuth(true); return; }
    // support deep navigation into admin sections using 'admin:<section>'
    if (page && page.startsWith('admin:')) {
      const section = page.split(':')[1] || null;
      if (!user?.is_admin || previewMode) return;
      setAdminInitialSection(section);
      setCurrentPage('admin');
      return;
    }
    if (page === 'admin' && (!user?.is_admin || previewMode)) return;
    if (page === 'profile' && !user) { setShowAuth(true); return; }
    if (page === 'teams'   && !user) { setShowAuth(true); return; }
    setShowAuth(false);
    setCurrentPage(page);
    if (page !== 'builder') setEditingTeam(null);
  };

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'50%', border:'3px solid var(--color-pk-border)', borderTopColor:'var(--color-pk-red)', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // Si showAuth está activo, mostrar página de auth
  if (showAuth) return (
    <AuthPage onSuccess={() => setShowAuth(false)} onBack={() => setShowAuth(false)} onNavigate={navigate} />
  );

  const handleSaveTeam = async (teamData) => {
    try {
      console.log('[TeamBuilder] Guardando equipo:', teamData);
      // createTeam from API
      let res;
      if (editingTeam && editingTeam.id) {
        res = await updateTeam(editingTeam.id, teamData);
      } else {
        res = await createTeam(teamData);
      }
      console.log('Equipo guardado', res);
      setCurrentPage('teams');
    } catch (e) {
      console.error('Error guardando equipo', e.message);
      alert('No se pudo guardar el equipo: ' + (e.message || 'error'));
    }
  };

  const handlePreviewAsUser = () => { setPreviewMode(true); if (currentPage === 'admin') setCurrentPage('home'); };
  const handleExitPreview   = () => { setPreviewMode(false); setCurrentPage('admin'); };

  return (
    <div style={{ minHeight:'100vh' }} className="bg-grid">
      <Navbar
        currentPage={currentPage}
        onNavigate={navigate}
        user={user}
        onLogout={logout}
        isPreview={previewMode}
        onExitPreview={handleExitPreview}
        onLoginClick={() => setShowAuth(true)}
      />
      <main style={{ position:'relative', zIndex:1 }}>
        {currentPage === 'home'    && <Home         onNavigate={navigate} />}
        {currentPage === 'teams'   && user && <MyTeams    onNavigateToBuilder={(t) => { setEditingTeam(t); setCurrentPage('builder'); }} />}
        {currentPage === 'builder' && <TeamBuilder  initialTeam={editingTeam} onSave={handleSaveTeam} onNavigate={navigate} />}
        {currentPage === 'profile' && user && <UserProfile onNavigate={navigate} />}
        {currentPage === 'admin'   && user?.is_admin && !previewMode && <AdminPanel onPreviewAsUser={handlePreviewAsUser} initialSection={adminInitialSection} />}
        {currentPage === 'sim'     && user && <Simulations onNavigate={navigate} />}
        {currentPage === 'mypokemon' && <MisPokemon onNavigate={navigate} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}