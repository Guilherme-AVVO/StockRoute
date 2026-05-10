import { useAuth } from '../context/AuthContext.jsx';
import './Dashboard.css';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dash-bg">
      <div className="dash-wrapper">
        <div className="dash-card">
          <p className="dash-badge">Login realizado com sucesso</p>
          <h1 className="dash-title">{user?.name ?? 'Usuário'}</h1>

          <div className="dash-info">
            <div className="dash-info-row">
              <span className="dash-info-label">E-mail</span>
              <span className="dash-info-value">{user?.email ?? '-'}</span>
            </div>
            <div className="dash-info-row">
              <span className="dash-info-label">Role</span>
              <span className="dash-info-value">{user?.role ?? '-'}</span>
            </div>
          </div>

          <button className="dash-logout-btn" type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
