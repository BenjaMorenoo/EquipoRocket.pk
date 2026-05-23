// src/App.jsx
import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
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

function AppShell() {
  const { user, logout, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [editingTeam, setEditingTeam] = useState(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [adminInitialSection, setAdminInitialSection] = useState(null);

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:'40px', height:'40px', borderRadius:'50%', border:'3px solid var(--color-pk-border)', borderTopColor:'var(--color-pk-red)', animation:'spin .8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const handleSaveTeam = async (teamData) => {
    try {
      console.log('[TeamBuilder] Guardando equipo:', teamData);
      let res;
      if (editingTeam && editingTeam.id) {
        res = await updateTeam(editingTeam.id, teamData);
      } else {
        res = await createTeam(teamData);
      }
      console.log('Equipo guardado', res);
      setEditingTeam(null);
      navigate('/equipos');
    } catch (e) {
      console.error('Error guardando equipo', e.message);
      alert('No se pudo guardar el equipo: ' + (e.message || 'error'));
    }
  };

  const handlePreviewAsUser = () => { setPreviewMode(true); };
  const handleExitPreview = () => { setPreviewMode(false); navigate('/admin'); };

  // Helper function to get current page from location
  const getCurrentPage = () => {
    const path = location.pathname;
    if (path === '/') return 'home';
    if (path === '/equipos') return 'teams';
    if (path === '/constructor') return 'builder';
    if (path === '/perfil') return 'profile';
    if (path === '/admin' || path.startsWith('/admin/')) return 'admin';
    if (path === '/simulaciones') return 'sim';
    if (path === '/mis-pokemon') return 'mypokemon';
    return 'home';
  };

  // Helper function for navigation
  const handleNavigate = (page, payload = null) => {
    if (page === 'home') navigate('/');
    if (page === 'auth') navigate('/auth');
    if (page === 'teams') navigate('/equipos');
    if (page === 'builder') {
      if (payload) setEditingTeam(payload);
      navigate('/constructor');
    }
    if (page === 'profile') navigate('/perfil');
    if (page === 'admin') navigate('/admin');
    if (page === 'sim') navigate('/simulaciones');
    if (page === 'mypokemon') navigate('/mis-pokemon');
    if (page?.startsWith('admin:')) {
      const section = page.split(':')[1];
      setAdminInitialSection(section);
      navigate('/admin');
    }
  };

  return (
    <div style={{ minHeight:'100vh' }} className="bg-grid">
      <Navbar
        currentPage={getCurrentPage()}
        onNavigate={handleNavigate}
        user={user}
        onLogout={() => {
          logout();
          navigate('/');
        }}
        isPreview={previewMode}
        onExitPreview={handleExitPreview}
        onLoginClick={() => navigate('/auth')}
      />
      <main style={{ position:'relative', zIndex:1 }}>
        <Routes>
          <Route path="/" element={<Home onNavigate={handleNavigate} />} />
          <Route path="/auth" element={<AuthPage onSuccess={() => navigate('/')} onBack={() => navigate(-1)} onNavigate={handleNavigate} />} />
          <Route path="/equipos" element={user ? <MyTeams onNavigateToBuilder={(t) => { setEditingTeam(t); navigate('/constructor'); }} /> : <Navigate to="/auth" />} />
          <Route path="/constructor" element={<TeamBuilder initialTeam={editingTeam} onSave={handleSaveTeam} onNavigate={handleNavigate} />} />
          <Route path="/perfil" element={user ? <UserProfile onNavigate={handleNavigate} /> : <Navigate to="/auth" />} />
          <Route path="/admin/*" element={user?.is_admin && !previewMode ? <AdminPanel onPreviewAsUser={handlePreviewAsUser} initialSection={adminInitialSection} /> : <Navigate to="/" />} />
          <Route path="/simulaciones" element={<Simulations onNavigate={handleNavigate} />} />
          <Route path="/mis-pokemon" element={<MisPokemon onNavigate={handleNavigate} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
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