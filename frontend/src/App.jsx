import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Protege a tela principal usando apenas o estado de autenticação do contexto.
// Enquanto a sessão salva é validada, evita piscar a tela de login.
function AppRouter() {
  const { isAuthenticated, loading } = useAuth();

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

  return isAuthenticated ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    // AuthProvider concentra token, usuário logado e ações de login/logout.
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
