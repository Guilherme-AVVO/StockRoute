// Página ADMIN de Pedidos.
// Acompanha visualmente o ciclo do DAV até a conclusão da separação.
import { useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import './AdminOrders.css';

// Dados temporários usados apenas para montar a interface.
// Quando as APIs estiverem prontas, substituir por chamadas reais ao backend.
const ORDERS = [
  {
    dav: '0000000113110',
    cliente: 'Projete Planejados',
    entrega: '13/05/2026',
    dateFilter: 'week',
    status: 'aguardando',
    statusLabel: 'Aguardando',
    itens: 16,
    progresso: 0,
    estoquista: '—',
    pendencias: '3 sem vínculo',
    acao: 'Revisar',
    coletados: 0,
    pendentes: 16,
    events: ['DAV extraído às 09:42', '3 itens sem vínculo encontrados', 'Aguardando revisão do ADMIN'],
  },
  {
    dav: '0000000113108',
    cliente: 'Marcenaria Lopes',
    entrega: '12/05/2026',
    dateFilter: 'week',
    status: 'em-separacao',
    statusLabel: 'Em separação',
    itens: 22,
    progresso: 64,
    estoquista: 'João',
    pendencias: '0',
    acao: 'Acompanhar',
    coletados: 14,
    pendentes: 8,
    events: ['João iniciou a separação', '14 itens coletados', 'Última atualização há 18 min'],
  },
  {
    dav: '0000000113105',
    cliente: 'Móveis Sob Medida ME',
    entrega: '12/05/2026',
    dateFilter: 'week',
    status: 'observacao',
    statusLabel: 'Observação',
    itens: 9,
    progresso: 78,
    estoquista: 'Carlos',
    pendencias: '1 item ausente',
    acao: 'Resolver',
    coletados: 7,
    pendentes: 2,
    events: ['Carlos marcou item como não encontrado', 'Motivo: produto ausente no endereço', 'Aguardando decisão do ADMIN'],
  },
  {
    dav: '0000000113101',
    cliente: 'Casa & Cia Decorações',
    entrega: '11/05/2026',
    dateFilter: 'today',
    status: 'concluido',
    statusLabel: 'Concluído',
    itens: 31,
    progresso: 100,
    estoquista: 'Maria',
    pendencias: '0',
    acao: 'Ver',
    coletados: 31,
    pendentes: 0,
    events: ['Separação finalizada', '31 itens confirmados', 'Pedido concluído às 10:12'],
  },
  {
    dav: '0000000113098',
    cliente: 'Fragoso Móveis Planejados',
    entrega: '11/05/2026',
    dateFilter: 'today',
    status: 'rascunho',
    statusLabel: 'Rascunho',
    itens: 7,
    progresso: 0,
    estoquista: '—',
    pendencias: '2 sem vínculo',
    acao: 'Continuar',
    coletados: 0,
    pendentes: 7,
    events: ['PDF recebido', 'Extração concluída', 'Rascunho ainda não publicado'],
  },
  {
    dav: '0000000113094',
    cliente: 'Studio Prime',
    entrega: '14/05/2026',
    dateFilter: 'week',
    status: 'cancelado',
    statusLabel: 'Cancelado',
    itens: 12,
    progresso: 0,
    estoquista: '—',
    pendencias: '—',
    acao: 'Ver motivo',
    coletados: 0,
    pendentes: 12,
    events: ['Pedido cancelado pelo ADMIN', 'Motivo registrado para auditoria', 'Não aparece para o estoquista'],
  },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'rascunho', label: 'Rascunho' },
  { id: 'aguardando', label: 'Aguardando' },
  { id: 'em-separacao', label: 'Em separação' },
  { id: 'observacao', label: 'Observação' },
  { id: 'concluido', label: 'Concluído' },
  { id: 'cancelado', label: 'Cancelado' },
];

const DATE_FILTERS = [
  { id: 'today', label: 'Entrega hoje' },
  { id: 'week', label: 'Esta semana' },
  { id: 'all', label: 'Todos' },
];

const ORDER_STATS = [
  {
    label: 'Rascunhos',
    value: '4',
    description: 'Pedidos ainda não publicados',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Aguardando estoquista',
    value: '12',
    description: 'Pedidos prontos para separação',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Em separação',
    value: '5',
    description: 'Pedidos em andamento',
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
    description: 'Precisam de ação do ADMIN',
    iconStyle: { background: '#ffe0c8', color: '#c25100' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Concluídos hoje',
    value: '18',
    description: 'Finalizados no dia',
    iconStyle: { background: 'var(--success-bg)', color: 'var(--success)' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Cancelados',
    value: '1',
    description: 'Pedidos removidos do fluxo',
    iconStyle: { background: '#ececf5', color: '#6a6a78' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

function OrderStatusBadge({ status, label }) {
  return <span className={`orders-status ${status}`}>{label}</span>;
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

export default function AdminOrders({ onNavigate, onOpenUpload }) {
  // Filtros e busca locais sobre dados mockados.
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Pedido selecionado alimenta o card lateral de detalhes.
  const [selectedOrder, setSelectedOrder] = useState(ORDERS[0]);

  // Modal visual das ações de cada pedido.
  const [modalOrder, setModalOrder] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return ORDERS.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesDate = dateFilter === 'all' || order.dateFilter === dateFilter;
      const matchesSearch = !normalizedSearch
        || order.dav.toLowerCase().includes(normalizedSearch)
        || order.cliente.toLowerCase().includes(normalizedSearch)
        || order.estoquista.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [statusFilter, dateFilter, search]);

  function openOrderAction(order) {
    setSelectedOrder(order);
    setFeedback(null);
    setModalOrder(order);
  }

  function closeModal() {
    setModalOrder(null);
    setFeedback(null);
  }

  function showActionFeedback(message = 'Essa ação será integrada ao backend na próxima etapa.') {
    setFeedback(message);
  }

  function handlePriorityClick() {
    setStatusFilter('observacao');
    showActionFeedback('Filtro "Observação" aplicado para revisar prioridades.');
  }

  return (
    <div className="orders-page">
      {/* Integração visual com sidebar: renderizada pela seção ativa "orders". */}
      <section className="hero orders-hero">
        <div>
          <h1>Pedidos</h1>
          <p>
            Acompanhe o ciclo completo dos pedidos, da revisão do DAV até a finalização da separação.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={onOpenUpload}>
            + Enviar novo DAV
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate?.('reviews')}>
            Ver revisões pendentes
          </button>
        </div>
      </section>

      {feedback && (
        <div className="orders-feedback" role="status">
          {feedback}
        </div>
      )}

      <section className="orders-stats-grid">
        {ORDER_STATS.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            description={stat.description}
            iconStyle={stat.iconStyle}
          />
        ))}
      </section>

      <section className="orders-layout">
        <div className="orders-main">
          <div className="card orders-control-card">
            <div className="orders-filter-block">
              <div className="orders-filter-row" aria-label="Filtros por status">
                {STATUS_FILTERS.map((filter) => (
                  <button
                    className={`chip-filter${statusFilter === filter.id ? ' active' : ''}`}
                    key={filter.id}
                    type="button"
                    onClick={() => setStatusFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>

              <div className="orders-filter-row orders-date-row" aria-label="Filtros por data">
                {DATE_FILTERS.map((filter) => (
                  <button
                    className={`orders-date-chip${dateFilter === filter.id ? ' active' : ''}`}
                    key={filter.id}
                    type="button"
                    onClick={() => setDateFilter(filter.id)}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="orders-search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                placeholder="Buscar por DAV, cliente ou estoquista..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>

          <div className="card orders-table-card">
            {filteredOrders.length === 0 ? (
              <div className="orders-empty">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
                  <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <p>Nenhum pedido encontrado para esta busca.</p>
              </div>
            ) : (
              <>
                <table className="orders-table">
                  <thead>
                    <tr>
                      <th>DAV</th>
                      <th>Cliente</th>
                      <th>Entrega</th>
                      <th>Status</th>
                      <th>Itens</th>
                      <th>Progresso</th>
                      <th>Estoquista</th>
                      <th>Pendências</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        className={selectedOrder?.dav === order.dav ? 'selected' : ''}
                        key={order.dav}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td><span className="dav-id">{order.dav}</span></td>
                        <td><span className="client-name">{order.cliente}</span></td>
                        <td><span className="orders-date">{order.entrega}</span></td>
                        <td><OrderStatusBadge status={order.status} label={order.statusLabel} /></td>
                        <td><span className="counts"><span className="num">{order.itens}</span> itens</span></td>
                        <td><ProgressBar value={order.progresso} /></td>
                        <td><span className="orders-worker">{order.estoquista}</span></td>
                        <td>
                          <span className={`pending-pill${order.pendencias === '0' ? ' zero' : ''}`}>
                            {order.pendencias}
                          </span>
                        </td>
                        <td>
                          <button
                            className="orders-action"
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openOrderAction(order);
                            }}
                          >
                            {order.acao}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="orders-mobile-list">
                  {filteredOrders.map((order) => (
                    <article
                      className={`orders-mobile-card${selectedOrder?.dav === order.dav ? ' selected' : ''}`}
                      key={order.dav}
                      onClick={() => setSelectedOrder(order)}
                    >
                      <div className="orders-mobile-head">
                        <div>
                          <span className="dav-id">{order.dav}</span>
                          <strong>{order.cliente}</strong>
                        </div>
                        <OrderStatusBadge status={order.status} label={order.statusLabel} />
                      </div>
                      <div className="orders-mobile-grid">
                        <div>
                          <span>Entrega</span>
                          <strong>{order.entrega}</strong>
                        </div>
                        <div>
                          <span>Itens</span>
                          <strong>{order.itens}</strong>
                        </div>
                        <div>
                          <span>Estoquista</span>
                          <strong>{order.estoquista}</strong>
                        </div>
                      </div>
                      <ProgressBar value={order.progresso} />
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openOrderAction(order);
                        }}
                      >
                        {order.acao}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="orders-side">
          <div className="card orders-side-card">
            <h2>Atenção do ADMIN</h2>
            <ul className="orders-attention-list">
              <li>3 pedidos em observação</li>
              <li>4 rascunhos não publicados</li>
              <li>7 pedidos com entrega hoje</li>
              <li>2 pedidos parados há mais de 2h</li>
            </ul>
            <button className="btn btn-primary btn-sm" type="button" onClick={handlePriorityClick}>
              Ver prioridades
            </button>
          </div>

          <div className="card orders-selected-card">
            <h2>Pedido selecionado</h2>
            {!selectedOrder ? (
              <p>Selecione um pedido para ver detalhes.</p>
            ) : (
              <>
                <div className="orders-selected-summary">
                  <div><span>DAV</span><strong>{selectedOrder.dav}</strong></div>
                  <div><span>Cliente</span><strong>{selectedOrder.cliente}</strong></div>
                  <div><span>Status</span><OrderStatusBadge status={selectedOrder.status} label={selectedOrder.statusLabel} /></div>
                  <div><span>Estoquista</span><strong>{selectedOrder.estoquista}</strong></div>
                  <div><span>Progresso</span><ProgressBar value={selectedOrder.progresso} /></div>
                  <div><span>Itens totais</span><strong>{selectedOrder.itens}</strong></div>
                  <div><span>Itens coletados</span><strong>{selectedOrder.coletados}</strong></div>
                  <div><span>Itens pendentes</span><strong>{selectedOrder.pendentes}</strong></div>
                </div>
                <div className="orders-events">
                  <h3>Últimos eventos</h3>
                  <ul>
                    {selectedOrder.events.map((event) => (
                      <li key={event}>{event}</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </aside>
      </section>

      {modalOrder && (
        <div
          className="orders-modal-overlay open"
          role="dialog"
          aria-modal="true"
          onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div className="orders-modal card">
            <div className="orders-modal-head">
              <div>
                <h2>{modalOrder.acao}</h2>
                <p>{modalOrder.dav} · {modalOrder.cliente}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="orders-modal-body">
              {modalOrder.acao === 'Revisar' && (
                <div className="orders-modal-section">
                  <p>Este pedido possui pendências antes da publicação.</p>
                  <ul>
                    <li>3 itens sem vínculo com catálogo</li>
                    <li>Lista ainda não publicada para o estoquista</li>
                  </ul>
                  <button className="btn btn-primary" type="button" onClick={() => onNavigate?.('reviews')}>
                    Ir para Revisões
                  </button>
                </div>
              )}

              {modalOrder.acao === 'Acompanhar' && (
                <div className="orders-modal-section">
                  <ProgressBar value={modalOrder.progresso} />
                  <div className="orders-modal-grid">
                    <span>Estoquista</span><strong>{modalOrder.estoquista}</strong>
                    <span>Itens coletados</span><strong>{modalOrder.coletados}</strong>
                    <span>Itens pendentes</span><strong>{modalOrder.pendentes}</strong>
                  </div>
                  <ul>{modalOrder.events.map((event) => <li key={event}>{event}</li>)}</ul>
                </div>
              )}

              {modalOrder.acao === 'Resolver' && (
                <div className="orders-modal-section orders-observation-box">
                  <strong>Item não encontrado: Dobradiça alta pressão</strong>
                  <p>Motivo informado: produto ausente no endereço indicado.</p>
                  <div className="orders-modal-actions">
                    <button type="button" onClick={() => showActionFeedback('Troca autorizada visualmente. Backend será integrado depois.')}>Autorizar troca</button>
                    <button type="button" onClick={() => showActionFeedback('Item removido visualmente da separação. Backend será integrado depois.')}>Remover item da separação</button>
                    <button type="button" onClick={() => showActionFeedback('Nova tentativa solicitada visualmente. Backend será integrado depois.')}>Solicitar nova tentativa</button>
                  </div>
                </div>
              )}

              {modalOrder.acao === 'Ver' && (
                <div className="orders-modal-section">
                  <p>Pedido concluído com todos os itens coletados e registrados.</p>
                  <div className="orders-modal-grid">
                    <span>Itens totais</span><strong>{modalOrder.itens}</strong>
                    <span>Itens coletados</span><strong>{modalOrder.coletados}</strong>
                    <span>Finalização</span><strong>Hoje às 10:12</strong>
                  </div>
                </div>
              )}

              {modalOrder.acao === 'Continuar' && (
                <div className="orders-modal-section">
                  <p>Este pedido ainda está em rascunho. Resolva os vínculos e publique quando estiver pronto.</p>
                  <button className="btn btn-primary" type="button" onClick={() => onNavigate?.('reviews')}>
                    Continuar revisão
                  </button>
                </div>
              )}

              {modalOrder.acao === 'Ver motivo' && (
                <div className="orders-modal-section">
                  <p>Motivo de cancelamento mockado:</p>
                  <strong>Pedido cancelado por solicitação do cliente antes do início da separação.</strong>
                </div>
              )}

              {feedback && (
                <div className="orders-modal-feedback" role="status">
                  {feedback}
                </div>
              )}
            </div>

            <div className="orders-modal-foot">
              <button className="btn btn-secondary" type="button" onClick={closeModal}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
