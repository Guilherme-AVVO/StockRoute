import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

// Roteia para a tela correta baseado em autenticação e role do usuário.
// ADMIN → AdminDashboard | outros → Dashboard | não autenticado → Login
function AppRouter() {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#eef0ff',
        color: '#6b7280',
        fontSize: '0.9rem',
      }}>
        Carregando...
      </div>
    );
  }

  if (!isAuthenticated) return <Login />;

  return user?.role === 'ADMIN' ? <AdminDashboard /> : <Dashboard />;
}

export default function App() {
  return (
    // AuthProvider concentra token, usuário logado e ações de login/logout.
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
