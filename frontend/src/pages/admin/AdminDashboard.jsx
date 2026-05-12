import { useState, useEffect } from 'react';
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
import { api } from '../../services/api.js';
import './AdminDashboard.css';

const STAT_ICONS = {
  pending: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="m9 11 3 3L22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  inProgress: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="7" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ),
  completed: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  products: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 7h18M3 12h18M3 17h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  ignored: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 3h12v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  cancelled: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export default function AdminDashboard() {
  const [modalOpen,     setModalOpen]     = useState(false);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [stats,         setStats]         = useState(null);

  function loadStats() {
    api.get('/dashboard/stats')
      .then((res) => res.json())
      .then(setStats)
      .catch(() => {});
  }

  useEffect(() => { loadStats(); }, []);

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
              <StatCard icon={STAT_ICONS.pending}    value={stats?.ordersPending    ?? '—'} label="Aguardando revisão"     description="DAVs importados, não publicados" />
              <StatCard icon={STAT_ICONS.inProgress} value={stats?.ordersInProgress ?? '—'} label="Em separação"           description="Pedidos com estoquistas" />
              <StatCard icon={STAT_ICONS.completed}  value={stats?.ordersCompleted  ?? '—'} label="Concluídos"             description="Pedidos finalizados"
                iconStyle={{ background: 'var(--success-bg)', color: 'var(--success)' }} />
              <StatCard icon={STAT_ICONS.products}   value={stats?.totalProducts    ?? '—'} label="Produtos cadastrados"   description="No catálogo ativo" />
              <StatCard icon={STAT_ICONS.ignored}    value={stats?.activeIgnoredRules ?? '—'} label="Ignorados automaticamente" description="Regras de ignorar ativas"
                iconStyle={{ background: 'var(--surface-low)', color: 'var(--outline-strong)' }} />
              <StatCard icon={STAT_ICONS.cancelled}  value={stats?.ordersCancelled  ?? '—'} label="Cancelados"             description="Pedidos removidos do fluxo"
                iconStyle={{ background: '#ececf5', color: '#6a6a78' }} />
            </section>

            {/* Fluxo visual do pedido */}
            <ProcessFlow />

            {/* Tabela + painel lateral */}
            <section className="two-col">
              <RecentDavTable />
              <div>
                <PendingIssuesCard stats={stats} />
                <IgnoredDavItemsCard onNavigate={setActiveSection} />
              </div>
            </section>
          </>
        )}
      </AdminLayout>

      {/* Modal de upload — controlado pelo estado desta página */}
      <DavUploadModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={loadStats}
      />
    </>
  );
}
