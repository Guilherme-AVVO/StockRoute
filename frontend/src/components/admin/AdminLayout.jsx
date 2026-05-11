// Layout principal da dashboard ADMIN: grid de 2 colunas (sidebar + conteúdo).
// Gerencia o estado do menu mobile (aberto/fechado).
import { useState } from 'react';
import AdminSidebar from './AdminSidebar.jsx';
import AdminHeader from './AdminHeader.jsx';
import './AdminLayout.css';

export default function AdminLayout({ children, onOpenUpload, activeSection, onNavigate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  function toggleMenu() { setMenuOpen((v) => !v); }
  function closeMenu()  { setMenuOpen(false); }

  return (
    <div className="admin-app">
      <AdminSidebar
        isOpen={menuOpen}
        onClose={closeMenu}
        activeSection={activeSection}
        onNavigate={(section) => { onNavigate?.(section); closeMenu(); }}
      />

      {/* Coluna principal: header + conteúdo */}
      <div className="admin-main-col">
        <AdminHeader onMenuToggle={toggleMenu} onOpenUpload={onOpenUpload} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
