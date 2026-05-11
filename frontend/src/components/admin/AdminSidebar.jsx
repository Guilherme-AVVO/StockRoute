// Barra lateral de navegação da dashboard ADMIN.
// Recebe isOpen e onClose para controle do menu mobile.
import './AdminSidebar.css';

// Ícone do logo StockRoute
function BrandIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 36 36" fill="none">
      <path d="M6 14.5L18 6l12 8.5V30a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V14.5z"
        stroke="#2a4dd7" strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M11 32V22h14v10" stroke="#2a4dd7" strokeWidth="2" strokeLinejoin="round" />
      <path d="M6 14.5h24" stroke="#2a4dd7" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function AdminSidebar({ isOpen, onClose, activeSection, onNavigate }) {
  function nav(section) {
    onNavigate?.(section);
  }

  return (
    <>
      {/* Overlay escuro mobile */}
      <div
        className={`sidebar-overlay${isOpen ? ' open' : ''}`}
        onClick={onClose}
      />

      <aside className={`sidebar${isOpen ? ' open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <BrandIcon />
          <span>
            <div className="brand-name">StockRoute</div>
            <div className="brand-sub">Moto Madeiras</div>
          </span>
        </div>

        <div className="nav-section">Operações</div>

        <a
          className={`nav-item${!activeSection || activeSection === 'dashboard' ? ' active' : ''}`}
          onClick={() => nav('dashboard')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" fill="currentColor" />
          </svg>
          Dashboard
        </a>

        <a
          className={`nav-item${activeSection === 'uploadDav' ? ' active' : ''}`}
          onClick={() => nav('uploadDav')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M14 3v6h6M12 13v5M9.5 15.5 12 13l2.5 2.5"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Upload DAV
        </a>

        <a
          className={`nav-item${activeSection === 'reviews' ? ' active' : ''}`}
          onClick={() => nav('reviews')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Revisões
          <span className="nav-count">12</span>
        </a>

        <a
          className={`nav-item${activeSection === 'orders' ? ' active' : ''}`}
          onClick={() => nav('orders')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M16 3H8a2 2 0 0 0-2 2v14l6-3 6 3V5a2 2 0 0 0-2-2z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Pedidos
        </a>

        <div className="nav-section">Cadastros</div>

        <a
          className={`nav-item${activeSection === 'products' ? ' active' : ''}`}
          onClick={() => nav('products')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Produtos
        </a>

        <a
          className={`nav-item${activeSection === 'ignoredItems' ? ' active' : ''}`}
          onClick={() => nav('ignoredItems')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <path d="M9 3h12v12M3 9v12h12"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Itens ignorados
        </a>

        <div className="nav-section">Sistema</div>

        <a
          className={`nav-item${activeSection === 'users' ? ' active' : ''}`}
          onClick={() => nav('users')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11l2 2 4-4"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Usuários
        </a>

        <a
          className={`nav-item${activeSection === 'history' ? ' active' : ''}`}
          onClick={() => nav('history')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          Histórico
        </a>

        <a
          className={`nav-item${activeSection === 'settings' ? ' active' : ''}`}
          onClick={() => nav('settings')}
        >
          <svg className="nav-icon" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.4H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Configurações
        </a>
      </aside>
    </>
  );
}
