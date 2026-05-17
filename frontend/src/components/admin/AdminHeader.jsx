// Topbar da dashboard ADMIN: busca, role pill, usuário e logout.
// Recebe onMenuToggle para acionar o menu mobile.
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminHeader.css';

// Gera as iniciais do nome do usuário (ex.: "Rafael Costa" → "RC")
function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export default function AdminHeader({ onMenuToggle }) {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      {/* Botão hambúrguer — visível apenas em mobile */}
      <button
        className="menu-toggle"
        type="button"
        onClick={onMenuToggle}
        aria-label="Abrir menu"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Campo de busca */}
      <div className="search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input type="search" placeholder="Buscar DAV, cliente ou produto..." />
      </div>

      <div className="topbar-spacer" />

      {/* Pílula de role */}
      <span className="role-pill">⬡ ADMIN</span>

      {/* Chip de usuário */}
      <span className="user-chip">
        <span className="avatar">{getInitials(user?.name)}</span>
        <span className="user-info">
          <span className="user-name">{user?.name ?? 'Admin'}</span>
          <span className="user-email">{user?.email ?? ''}</span>
        </span>
      </span>

      {/* Botão de logout */}
      <button
        className="icon-btn"
        type="button"
        aria-label="Sair"
        title="Sair"
        onClick={logout}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </header>
  );
}
