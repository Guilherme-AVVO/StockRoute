// Topbar da dashboard ADMIN: busca, role pill, notificações, usuário e logout.
// Recebe onMenuToggle (mobile) e onOpenUpload para acionar o modal de upload.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import './AdminHeader.css';

// Dado temporário usado apenas enquanto a API real não está pronta.
// Notificações mockadas apenas para simular a interação visual.
// Futuramente serão substituídas por dados reais do backend.
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    title: 'DAV aguardando revisão',
    text: 'O DAV 0000000113110 possui 3 itens sem vínculo.',
    type: 'warning',
    time: 'há 5 min',
    read: false,
  },
  {
    id: 2,
    title: 'Pedido em observação',
    text: 'Um estoquista marcou item como não encontrado.',
    type: 'danger',
    time: 'há 12 min',
    read: false,
  },
  {
    id: 3,
    title: 'Item ignorado automaticamente',
    text: 'SERV-CORTE foi ignorado com base em regra cadastrada.',
    type: 'info',
    time: 'há 20 min',
    read: false,
  },
  {
    id: 4,
    title: 'Upload concluído',
    text: 'O PDF do DAV foi recebido com sucesso.',
    type: 'success',
    time: 'há 1h',
    read: false,
  },
];

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

export default function AdminHeader({ onMenuToggle, onOpenUpload }) {
  const { user, logout } = useAuth();
  const notificationRef = useRef(null);

  // Estado do dropdown de notificações e leitura visual dos itens.
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications],
  );

  useEffect(() => {
    if (!notificationsOpen) return;

    function handleDocumentClick(event) {
      if (!notificationRef.current?.contains(event.target)) {
        setNotificationsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleDocumentClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  function markAllAsRead() {
    setNotifications((current) => (
      current.map((notification) => ({ ...notification, read: true }))
    ));
  }

  function markAsRead(id) {
    setNotifications((current) => (
      current.map((notification) => (
        notification.id === id ? { ...notification, read: true } : notification
      ))
    ));
  }

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

      {/* Botão e dropdown de notificações mockadas */}
      <div className="notifications-wrap" ref={notificationRef}>
        <button
          className={`icon-btn${notificationsOpen ? ' active' : ''}`}
          type="button"
          aria-label="Notificações"
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen((open) => !open)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 8a6 6 0 0 1 12 0v5l1.5 3h-15L6 13V8z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M10 19a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.8" />
          </svg>
          {unreadCount > 0 && (
            <span className="notification-count">{unreadCount}</span>
          )}
        </button>

        {notificationsOpen && (
          <div className="notifications-dropdown" role="menu">
            <div className="notifications-head">
              <div>
                <h2>Notificações</h2>
                <p>{unreadCount} não lidas</p>
              </div>
              <button type="button" onClick={markAllAsRead}>
                Marcar todas como lidas
              </button>
            </div>

            <div className="notifications-list">
              {notifications.map((notification) => (
                <button
                  className={`notification-item ${notification.type}${notification.read ? ' read' : ''}`}
                  key={notification.id}
                  type="button"
                  onClick={() => markAsRead(notification.id)}
                >
                  <span className="notification-marker" />
                  <span className="notification-copy">
                    <strong>{notification.title}</strong>
                    <span>{notification.text}</span>
                    <small>{notification.time}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

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
