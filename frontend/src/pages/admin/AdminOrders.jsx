import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import { listOrders, publishOrder } from '../../services/orderService.js';
import { api } from '../../services/api.js';
import './AdminOrders.css';

const STATUS_LABEL = {
  PENDING:     { label: 'Aguardando revisão', cls: 'aguardando' },
  IN_PROGRESS: { label: 'Em separação',       cls: 'em-separacao' },
  COMPLETED:   { label: 'Concluído',          cls: 'concluido' },
  CANCELLED:   { label: 'Cancelado',          cls: 'cancelado' },
};

const STATUS_FILTERS = [
  { id: 'all',         label: 'Todos' },
  { id: 'PENDING',     label: 'Aguardando' },
  { id: 'IN_PROGRESS', label: 'Em separação' },
  { id: 'COMPLETED',   label: 'Concluído' },
  { id: 'CANCELLED',   label: 'Cancelado' },
];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function OrderStatusBadge({ status }) {
  const info = STATUS_LABEL[status] ?? { label: status, cls: '' };
  return <span className={`orders-status ${info.cls}`}>{info.label}</span>;
}

function ProgressBar({ value }) {
  return (
    <div className="orders-progress">
      <div className="orders-progress-track">
        <span style={{ width: `${value}%` }} />
      </div>
      <strong>{value}%</strong>
    </div>
  );
}

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
  cancelled: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
};

export default function AdminOrders({ onNavigate, onOpenUpload }) {
  const [orders, setOrders] = useState([]);
  const [stats,  setStats]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalOrder, setModalOrder] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    Promise.all([
      listOrders(),
      api.get('/dashboard/stats').then((r) => r.json()),
    ])
      .then(([ords, st]) => { setOrders(ords); setStats(st); setSelectedOrder((prev) => prev ?? ords[0] ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      const matchStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchSearch = !q || o.orderNumber.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q);
      return matchStatus && matchSearch;
    });
  }, [orders, statusFilter, search]);

  function openOrderAction(order) {
    setSelectedOrder(order);
    setFeedback(null);
    setModalOrder(order);
  }

  function closeModal() { setModalOrder(null); setFeedback(null); }

  async function handlePublish(order) {
    setPublishing(true);
    try {
      await publishOrder(order.id);
      setFeedback('Pedido publicado com sucesso!');
      closeModal();
      reload();
    } catch (err) {
      setFeedback(err.message || 'Erro ao publicar pedido');
    } finally {
      setPublishing(false);
    }
  }

  function getOrderAction(order) {
    if (order.status === 'PENDING')     return 'Publicar';
    if (order.status === 'IN_PROGRESS') return 'Acompanhar';
    return 'Ver';
  }

  function getProgress(order) {
    const total = order.totalItems ?? 0;
    if (!total) return 0;
    const done = (order.pickedItems ?? 0) + (order.missingItems ?? 0) + (order.partialItems ?? 0);
    return Math.round((done / total) * 100);
  }

  return (
    <div className="orders-page">
      <section className="hero orders-hero">
        <div>
          <h1>Pedidos</h1>
          <p>Acompanhe o ciclo completo dos pedidos, da revisão do DAV até a finalização da separação.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onOpenUpload}>+ Enviar novo DAV</button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate?.('reviews')}>Ver revisões pendentes</button>
        </div>
      </section>

      {feedback && <div className="orders-feedback" role="status">{feedback}</div>}

      <section className="orders-stats-grid">
        <StatCard icon={STAT_ICONS.pending}    value={stats?.ordersPending    ?? '—'} label="Aguardando revisão"   description="Não publicados ainda" />
        <StatCard icon={STAT_ICONS.inProgress} value={stats?.ordersInProgress ?? '—'} label="Em separação"         description="Em andamento" />
        <StatCard icon={STAT_ICONS.completed}  value={stats?.ordersCompleted  ?? '—'} label="Concluídos"           description="Pedidos finalizados"
          iconStyle={{ background: 'var(--success-bg)', color: 'var(--success)' }} />
        <StatCard icon={STAT_ICONS.cancelled}  value={stats?.ordersCancelled  ?? '—'} label="Cancelados"           description="Pedidos cancelados"
          iconStyle={{ background: '#ececf5', color: '#6a6a78' }} />
      </section>

      <section className="orders-layout">
        <div className="orders-main">
          <div className="card orders-control-card">
            <div className="orders-filter-block">
              <div className="orders-filter-row" aria-label="Filtros por status">
                {STATUS_FILTERS.map((f) => (
                  <button
                    className={`chip-filter${statusFilter === f.id ? ' active' : ''}`}
                    key={f.id} type="button"
                    onClick={() => setStatusFilter(f.id)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="orders-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input type="search" placeholder="Buscar por DAV ou cliente…"
                value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
          </div>

          <div className="card orders-table-card">
            {loading ? (
              <div className="orders-empty"><p>Carregando…</p></div>
            ) : filteredOrders.length === 0 ? (
              <div className="orders-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <p>Nenhum pedido encontrado.</p>
              </div>
            ) : (
              <>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>DAV</th>
                      <th>Cliente</th>
                      <th>Importado em</th>
                      <th>Status</th>
                      <th>Itens</th>
                      <th>Progresso</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        className={selectedOrder?.id === order.id ? 'selected' : ''}
                        key={order.id}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td><span className="dav-id">{order.orderNumber}</span></td>
                        <td><span className="client-name">{order.customerName}</span></td>
                        <td><span className="orders-date">{formatDate(order.createdAt)}</span></td>
                        <td><OrderStatusBadge status={order.status} /></td>
                        <td><span className="counts"><span className="num">{order.totalItems ?? 0}</span> itens</span></td>
                        <td><ProgressBar value={getProgress(order)} /></td>
                        <td>
                          <button className="orders-action" type="button"
                            onClick={(e) => { e.stopPropagation(); openOrderAction(order); }}>
                            {getOrderAction(order)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="orders-mobile-list">
                  {filteredOrders.map((order) => (
                    <article
                      className={`orders-mobile-card${selectedOrder?.id === order.id ? ' selected' : ''}`}
                      key={order.id} onClick={() => setSelectedOrder(order)}
                    >
                      <div className="orders-mobile-head">
                        <div>
                          <span className="dav-id">{order.orderNumber}</span>
                          <strong>{order.customerName}</strong>
                        </div>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div className="orders-mobile-grid">
                        <div><span>Importado em</span><strong>{formatDate(order.createdAt)}</strong></div>
                        <div><span>Itens</span><strong>{order.totalItems ?? 0}</strong></div>
                      </div>
                      <ProgressBar value={getProgress(order)} />
                      <button className="btn btn-primary btn-sm" type="button"
                        onClick={(e) => { e.stopPropagation(); openOrderAction(order); }}>
                        {getOrderAction(order)}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="orders-side">
          <div className="card orders-selected-card">
            <h2>Pedido selecionado</h2>
            {!selectedOrder ? (
              <p>Selecione um pedido para ver detalhes.</p>
            ) : (
              <div className="orders-selected-summary">
                <div><span>DAV</span><strong>{selectedOrder.orderNumber}</strong></div>
                <div><span>Cliente</span><strong>{selectedOrder.customerName}</strong></div>
                <div><span>Status</span><OrderStatusBadge status={selectedOrder.status} /></div>
                <div><span>Itens totais</span><strong>{selectedOrder.totalItems ?? 0}</strong></div>
                <div><span>Coletados</span><strong>{selectedOrder.pickedItems ?? 0}</strong></div>
                <div><span>Importado em</span><strong>{formatDate(selectedOrder.createdAt)}</strong></div>
                <div><span>Progresso</span><ProgressBar value={getProgress(selectedOrder)} /></div>
              </div>
            )}
          </div>
        </aside>
      </section>

      {modalOrder && (
        <div className="orders-modal-overlay open" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="orders-modal card">
            <div className="orders-modal-head">
              <div>
                <h2>{getOrderAction(modalOrder)}</h2>
                <p>{modalOrder.orderNumber} · {modalOrder.customerName}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="orders-modal-body">
              {modalOrder.status === 'PENDING' && (
                <div className="orders-modal-section">
                  <p>Publicar este pedido envia a lista de picking para o estoquista.</p>
                  <div className="orders-modal-grid">
                    <span>Total de itens</span><strong>{modalOrder.totalItems ?? 0}</strong>
                    <span>Status atual</span><strong>Aguardando revisão</strong>
                  </div>
                  <button className="btn btn-primary" type="button"
                    disabled={publishing} onClick={() => handlePublish(modalOrder)}>
                    {publishing ? 'Publicando…' : 'Publicar pedido'}
                  </button>
                  <button className="btn btn-secondary" type="button" style={{ marginLeft: 8 }}
                    onClick={() => { closeModal(); onNavigate?.('reviews'); }}>
                    Ver itens
                  </button>
                </div>
              )}
              {modalOrder.status === 'IN_PROGRESS' && (
                <div className="orders-modal-section">
                  <ProgressBar value={getProgress(modalOrder)} />
                  <div className="orders-modal-grid">
                    <span>Itens totais</span><strong>{modalOrder.totalItems ?? 0}</strong>
                    <span>Coletados</span><strong>{modalOrder.pickedItems ?? 0}</strong>
                    <span>Pendentes</span><strong>{(modalOrder.totalItems ?? 0) - (modalOrder.pickedItems ?? 0)}</strong>
                  </div>
                </div>
              )}
              {(modalOrder.status === 'COMPLETED' || modalOrder.status === 'CANCELLED') && (
                <div className="orders-modal-section">
                  <div className="orders-modal-grid">
                    <span>Status</span><OrderStatusBadge status={modalOrder.status} />
                    <span>Itens totais</span><strong>{modalOrder.totalItems ?? 0}</strong>
                    <span>Importado em</span><strong>{formatDate(modalOrder.createdAt)}</strong>
                  </div>
                </div>
              )}
              {feedback && <div className="orders-modal-feedback" role="status">{feedback}</div>}
            </div>
            <div className="orders-modal-foot">
              <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
