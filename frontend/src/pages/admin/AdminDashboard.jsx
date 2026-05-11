// Página principal da dashboard ADMIN.
// Renderizada automaticamente quando user.role === "ADMIN".
import { useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout.jsx';
import StatCard from '../../components/admin/StatCard.jsx';
import ProcessFlow from '../../components/admin/ProcessFlow.jsx';
import RecentDavTable from '../../components/admin/RecentDavTable.jsx';
import PendingIssuesCard from '../../components/admin/PendingIssuesCard.jsx';
import IgnoredDavItemsCard from '../../components/admin/IgnoredDavItemsCard.jsx';
import DavUploadModal from '../../components/admin/DavUploadModal.jsx';
import AdminProducts from './AdminProducts.jsx';
import UploadDav from './UploadDav.jsx';
import AdminReviews from './AdminReviews.jsx';
import AdminOrders from './AdminOrders.jsx';
import AdminIgnoredItems from './AdminIgnoredItems.jsx';
import AdminUsers from './AdminUsers.jsx';
import AdminHistory from './AdminHistory.jsx';
import AdminSettings from './AdminSettings.jsx';
import './AdminDashboard.css';

// TODO: substituir STATS por dados reais da API quando endpoints estiverem disponíveis
const STATS = [
  {
    label: 'Aguardando revisão',
    value: '12',
    description: 'Itens extraídos do DAV aguardando validação',
    trend: 3,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Em separação',
    value: '5',
    description: 'Pedidos atualmente com estoquistas',
    trend: 1,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Em observação',
    value: '3',
    description: 'Pedidos com item não encontrado',
    trend: 1,
    trendDown: true,
    iconStyle: { background: '#ffe0c8', color: '#c25100' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'DAVs hoje',
    value: '27',
    description: 'Processados nas últimas 24h',
    trend: 8,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Produtos cadastrados',
    value: '1.842',
    description: 'No catálogo ativo',
    trend: 14,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Ignorados automaticamente',
    value: '84',
    description: 'Itens DAV fora do picking',
    trend: 2,
    iconStyle: { background: 'var(--surface-low)', color: 'var(--outline-strong)' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 3h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function AdminDashboard() {
  const [modalOpen,     setModalOpen]     = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <>
      {/* Blobs decorativos — mesmos da tela de login */}
      <div className="blob-bg">
        <div className="blob b1" />
        <div className="blob b2" />
      </div>

      <AdminLayout
        onOpenUpload={() => setModalOpen(true)}
        activeSection={activeSection}
        onNavigate={setActiveSection}
      >
        {activeSection === 'products' && (
          // Seção de cadastro de produtos
          <AdminProducts />
        )}

        {activeSection === 'uploadDav' && (
          // Seção de upload visual de DAV
          <UploadDav />
        )}

        {activeSection === 'reviews' && (
          // Seção visual de revisão dos itens extraídos do DAV
          <AdminReviews onNavigate={setActiveSection} />
        )}

        {activeSection === 'orders' && (
          // Seção de acompanhamento dos pedidos DAV
          <AdminOrders
            onNavigate={setActiveSection}
            onOpenUpload={() => setModalOpen(true)}
          />
        )}

        {activeSection === 'ignoredItems' && (
          // Seção de regras de itens DAV ignorados no picking
          <AdminIgnoredItems />
        )}

        {activeSection === 'users' && (
          // Seção de gestão visual de usuários
          <AdminUsers />
        )}

        {activeSection === 'history' && (
          // Seção de histórico e rastreabilidade
          <AdminHistory />
        )}

        {activeSection === 'settings' && (
          // Seção de configurações visuais do sistema
          <AdminSettings onNavigate={setActiveSection} />
        )}

        {activeSection === 'dashboard' && (
          // Seção principal da dashboard
          <>
            {/* Hero operacional */}
            <section className="hero">
              <div>
                <h1>Dashboard ADMIN</h1>
                <p>
                  Controle os DAVs enviados, revise itens e acompanhe a separação no estoque
                  em tempo real.
                </p>
              </div>
              <div className="hero-actions">
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => setModalOpen(true)}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                  Enviar novo DAV
                </button>
                <button className="btn btn-secondary" type="button">
                  Ver revisões pendentes
                </button>
              </div>
            </section>

            {/* Grid de KPIs */}
            <section className="stats-grid">
              {STATS.map((stat) => (
                <StatCard
                  key={stat.label}
                  icon={stat.icon}
                  value={stat.value}
                  label={stat.label}
                  description={stat.description}
                  trend={stat.trend}
                  trendDown={stat.trendDown}
                  iconStyle={stat.iconStyle}
                />
              ))}
            </section>

            {/* Fluxo visual do pedido */}
            <ProcessFlow />

            {/* Tabela + painel lateral */}
            <section className="two-col">
              <RecentDavTable />
              <div>
                <PendingIssuesCard />
                <IgnoredDavItemsCard />
              </div>
            </section>
          </>
        )}
      </AdminLayout>

      {/* Modal de upload — controlado pelo estado desta página */}
      <DavUploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
