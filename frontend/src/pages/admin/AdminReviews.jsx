// Página ADMIN de Revisões.
// Permite validar visualmente itens extraídos do DAV antes da publicação.
import { useMemo, useState } from 'react';
import './AdminReviews.css';

// Dados temporários usados apenas para montar a tela de Revisões.
// Quando as APIs estiverem prontas, substituir por chamadas reais ao backend.
const REVIEW_ITEMS = [
  {
    id: 1,
    sku: 'MDF-BR-18',
    descricao: 'MDF Branco 18mm',
    quantidade: 4,
    unidade: 'UN',
    status: 'found',
    statusLabel: 'Encontrado',
    produto: 'MDF Branco 18mm',
    actions: ['Ver', 'Trocar vínculo'],
  },
  {
    id: 2,
    sku: 'SERV-CORTE',
    descricao: 'Serviço de corte sob medida',
    quantidade: 1,
    unidade: 'UN',
    status: 'ignored',
    statusLabel: 'Ignorado automaticamente',
    produto: '—',
    actions: ['Ver regra', 'Incluir mesmo assim'],
  },
  {
    id: 3,
    sku: 'XXX-901',
    descricao: 'Produto não identificado',
    quantidade: 2,
    unidade: 'UN',
    status: 'unlinked',
    statusLabel: 'Sem vínculo',
    produto: '—',
    actions: ['Resolver'],
  },
  {
    id: 4,
    sku: 'FITA-BR-22',
    descricao: 'Fita de borda branca 22mm',
    quantidade: 8,
    unidade: 'M',
    status: 'found',
    statusLabel: 'Encontrado',
    produto: 'Fita Borda Branca 22mm',
    actions: ['Ver', 'Trocar vínculo'],
  },
  {
    id: 5,
    sku: 'FAB-INT',
    descricao: 'Item interno de fábrica',
    quantidade: 1,
    unidade: 'UN',
    status: 'ignored',
    statusLabel: 'Ignorado automaticamente',
    produto: '—',
    actions: ['Ver regra'],
  },
  {
    id: 6,
    sku: 'PARAF-35',
    descricao: 'Parafuso 3.5mm',
    quantidade: 2,
    unidade: 'CX',
    status: 'found',
    statusLabel: 'Encontrado',
    produto: 'Parafuso 3.5mm',
    actions: ['Ver'],
  },
  {
    id: 7,
    sku: 'DOB-ALTA',
    descricao: 'Dobradiça alta pressão',
    quantidade: 12,
    unidade: 'UN',
    status: 'unlinked',
    statusLabel: 'Sem vínculo',
    produto: '—',
    actions: ['Resolver'],
  },
  {
    id: 8,
    sku: 'COLA-MAD',
    descricao: 'Cola para madeira',
    quantidade: 3,
    unidade: 'UN',
    status: 'found',
    statusLabel: 'Encontrado',
    produto: 'Cola para madeira',
    actions: ['Ver'],
  },
  {
    id: 9,
    sku: 'PUX-INOX',
    descricao: 'Puxador inox',
    quantidade: 6,
    unidade: 'UN',
    status: 'pending',
    statusLabel: 'Pendente',
    produto: '—',
    actions: ['Resolver'],
  },
];

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'found', label: 'Encontrados' },
  { id: 'unlinked', label: 'Sem vínculo' },
  { id: 'ignored', label: 'Ignorados' },
  { id: 'pending', label: 'Pendentes' },
];

const REVIEW_SUMMARY = [
  { label: 'DAV', value: '0000000113110' },
  { label: 'Cliente', value: 'Projete Planejados' },
  { label: 'Entrega', value: '13/05/2026' },
  { label: 'Total de itens extraídos', value: '16' },
  { label: 'Itens vinculados', value: '11' },
  { label: 'Sem vínculo', value: '3' },
  { label: 'Ignorados automaticamente', value: '2' },
  { label: 'Status', value: 'RASCUNHO', badge: true },
];

const ACTION_FEEDBACK = 'Essa ação será integrada ao backend na próxima etapa.';

function ReviewStatusBadge({ status, label }) {
  return (
    <span className={`review-status ${status}`}>
      {label}
    </span>
  );
}

export default function AdminReviews({ onNavigate }) {
  // Filtros e busca locais com dados mockados, sem chamadas ao backend.
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modais de ação usados para simular resolução, regra de ignorado e vínculo.
  const [modal, setModal] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const filteredItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return REVIEW_ITEMS.filter((item) => {
      const matchesFilter = activeFilter === 'all' || item.status === activeFilter;
      const matchesSearch = !normalizedSearch
        || item.sku.toLowerCase().includes(normalizedSearch)
        || item.descricao.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, search]);

  function openActionModal(item, type) {
    setFeedback(null);
    setModal({ item, type });
  }

  function closeModal() {
    setModal(null);
    setFeedback(null);
  }

  function showTemporaryFeedback() {
    setFeedback(ACTION_FEEDBACK);
  }

  function handleResolvePending() {
    setActiveFilter('unlinked');
    setFeedback('Filtro "Sem vínculo" aplicado para focar nas pendências.');
  }

  function renderActionButton(item, action) {
    const modalType = item.status === 'unlinked' || action === 'Resolver'
      ? 'resolve'
      : item.status === 'ignored' || action === 'Ver regra'
        ? 'rule'
        : 'linked';

    return (
      <button
        className="review-action"
        key={`${item.id}-${action}`}
        type="button"
        onClick={() => openActionModal(item, modalType)}
      >
        {action}
      </button>
    );
  }

  const hasBlockingIssues = true;

  return (
    <div className="reviews-page">
      {/* Integração visual com sidebar: esta página é renderizada pela seção ativa "reviews". */}
      <section className="hero reviews-hero">
        <div>
          <h1>Revisões</h1>
          <p>
            Valide os itens extraídos do DAV, corrija vínculos e defina o que entra na lista de picking.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" disabled={hasBlockingIssues}>
            Publicar pedido
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate?.('uploadDav')}>
            Voltar para uploads
          </button>
        </div>
      </section>

      {feedback && (
        <div className="reviews-feedback" role="status">
          {feedback}
        </div>
      )}

      <section className="reviews-top-grid">
        <div className="card reviews-summary-card">
          <div className="reviews-card-head">
            <h2>DAV em revisão</h2>
            <p>Resumo do pedido extraído antes da publicação para o estoque.</p>
          </div>
          <div className="reviews-summary-grid">
            {REVIEW_SUMMARY.map((item) => (
              <div className="reviews-summary-item" key={item.label}>
                <span>{item.label}</span>
                {item.badge ? (
                  <strong className="reviews-draft-badge">{item.value}</strong>
                ) : (
                  <strong>{item.value}</strong>
                )}
              </div>
            ))}
          </div>
        </div>

        <aside className="reviews-side">
          <div className="card reviews-side-card">
            <h2>Pendências da revisão</h2>
            <ul className="reviews-pending-list">
              <li>3 itens sem vínculo com catálogo</li>
              <li>2 itens ignorados automaticamente</li>
              <li>1 item com quantidade suspeita</li>
              <li>Pedido ainda não publicado</li>
            </ul>
            <button className="btn btn-primary btn-sm" type="button" onClick={handleResolvePending}>
              Resolver pendências
            </button>
          </div>

          <div className="card reviews-side-card">
            <h2>Regra importante</h2>
            <p>
              Apenas itens vinculados ao catálogo e aprovados na revisão entram na lista do
              estoquista. Itens ignorados continuam registrados no histórico para auditoria.
            </p>
          </div>
        </aside>
      </section>

      <section className="card reviews-progress-card">
        <div className="reviews-card-head">
          <h2>13 de 16 itens resolvidos</h2>
          <p>Progresso da validação antes da publicação.</p>
        </div>
        <div className="reviews-progress-track" aria-label="Progresso da revisão">
          <span className="reviews-progress-segment found" style={{ width: '68.75%' }} />
          <span className="reviews-progress-segment ignored" style={{ width: '12.5%' }} />
          <span className="reviews-progress-segment unlinked" style={{ width: '18.75%' }} />
        </div>
        <div className="reviews-progress-legend">
          <span><i className="found" /> Encontrados</span>
          <span><i className="unlinked" /> Sem vínculo</span>
          <span><i className="ignored" /> Ignorados</span>
          <span><i className="pending" /> Pendentes</span>
        </div>
      </section>

      <section className="card reviews-table-card">
        <div className="reviews-toolbar">
          {/* Filtros visuais locais */}
          <div className="reviews-filters" aria-label="Filtros da revisão">
            {FILTERS.map((filter) => (
              <button
                className={`chip-filter${activeFilter === filter.id ? ' active' : ''}`}
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Busca local em SKU e descrição */}
          <label className="reviews-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por SKU ou descrição..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        <table className="reviews-table">
          <thead>
            <tr>
              <th>SKU extraído</th>
              <th>Descrição do DAV</th>
              <th>Quantidade</th>
              <th>Unidade</th>
              <th>Status</th>
              <th>Produto vinculado</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td><span className="dav-id">{item.sku}</span></td>
                <td><span className="review-description">{item.descricao}</span></td>
                <td><span className="counts"><span className="num">{item.quantidade}</span></span></td>
                <td><span className="review-unit">{item.unidade}</span></td>
                <td><ReviewStatusBadge status={item.status} label={item.statusLabel} /></td>
                <td><span className="review-linked-product">{item.produto}</span></td>
                <td>
                  <div className="review-actions">
                    {item.actions.map((action) => renderActionButton(item, action))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="reviews-mobile-list">
          {filteredItems.map((item) => (
            <article className="reviews-mobile-card" key={item.id}>
              <div className="reviews-mobile-head">
                <div>
                  <span className="dav-id">{item.sku}</span>
                  <strong>{item.descricao}</strong>
                </div>
                <ReviewStatusBadge status={item.status} label={item.statusLabel} />
              </div>
              <div className="reviews-mobile-grid">
                <div>
                  <span>Quantidade</span>
                  <strong>{item.quantidade}</strong>
                </div>
                <div>
                  <span>Unidade</span>
                  <strong>{item.unidade}</strong>
                </div>
                <div>
                  <span>Produto vinculado</span>
                  <strong>{item.produto}</strong>
                </div>
              </div>
              <div className="review-actions">
                {item.actions.map((action) => renderActionButton(item, action))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="card reviews-footer-actions">
        <div>
          <h2>Revisão ainda em rascunho</h2>
          <p>Resolva os itens sem vínculo antes de publicar.</p>
        </div>
        <div className="reviews-footer-buttons">
          <button className="btn btn-secondary" type="button" onClick={showTemporaryFeedback}>
            Salvar rascunho
          </button>
          <button className="btn btn-primary" type="button" disabled={hasBlockingIssues}>
            Publicar pedido
          </button>
        </div>
      </section>

      {modal && (
        <div
          className="review-modal-overlay open"
          role="dialog"
          aria-modal="true"
          onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div className="review-modal card">
            <div className="review-modal-head">
              <div>
                <h2>
                  {modal.type === 'resolve' && 'Resolver item sem vínculo'}
                  {modal.type === 'rule' && 'Regra de item ignorado'}
                  {modal.type === 'linked' && 'Produto vinculado'}
                </h2>
                <p>{modal.item.sku} · {modal.item.descricao}</p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="review-modal-body">
              {modal.type === 'resolve' && (
                <>
                  <p className="review-modal-copy">
                    Escolha como este item deve ser tratado na revisão do DAV.
                  </p>
                  <div className="review-modal-options">
                    <button type="button" onClick={showTemporaryFeedback}>Vincular a produto existente</button>
                    <button type="button" onClick={showTemporaryFeedback}>Cadastrar novo produto</button>
                    <button type="button" onClick={showTemporaryFeedback}>Ignorar apenas neste pedido</button>
                    <button type="button" onClick={showTemporaryFeedback}>Ignorar sempre no picking</button>
                  </div>
                </>
              )}

              {modal.type === 'rule' && (
                <div className="review-rule-grid">
                  <span>SKU/identificador</span><strong>{modal.item.sku}</strong>
                  <span>Descrição</span><strong>{modal.item.descricao}</strong>
                  <span>Motivo</span><strong>Serviço ou processo interno sem separação física</strong>
                  <span>Criado por</span><strong>Administrador</strong>
                  <span>Uso em pedidos</span><strong>8 ocorrências</strong>
                  <p>
                    Este item não aparece para o estoquista, mas permanece registrado para auditoria.
                  </p>
                </div>
              )}

              {modal.type === 'linked' && (
                <div className="review-rule-grid">
                  <span>Produto vinculado</span><strong>{modal.item.produto}</strong>
                  <span>SKU</span><strong>{modal.item.sku}</strong>
                  <span>Quantidade</span><strong>{modal.item.quantidade} {modal.item.unidade}</strong>
                  <p>
                    Troca de vínculo será conectada ao backend posteriormente.
                  </p>
                </div>
              )}

              {feedback && (
                <div className="review-modal-feedback" role="status">
                  {feedback}
                </div>
              )}
            </div>

            <div className="review-modal-foot">
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
