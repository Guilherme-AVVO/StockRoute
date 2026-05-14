import { useCallback, useEffect, useMemo, useState } from 'react';
import { listOrders, getOrder, publishOrder } from '../../services/orderService.js';
import './AdminReviews.css';

const ITEM_STATUS_LABEL = {
  PENDING: { label: 'Aguardando separação', cls: 'pending' },
  PICKED:  { label: 'Coletado',             cls: 'found' },
  PARTIAL: { label: 'Parcial',              cls: 'found' },
  MISSING: { label: 'Não encontrado',       cls: 'unlinked' },
  HIDDEN:  { label: 'Oculto por regra',     cls: 'ignored' },
};

function ReviewStatusBadge({ status }) {
  const info = ITEM_STATUS_LABEL[status] ?? { label: status, cls: '' };
  return <span className={`review-status ${info.cls}`}>{info.label}</span>;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminReviews({ onNavigate }) {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [orderDetail, setOrderDetail]     = useState(null);
  const [loadingOrders,  setLoadingOrders]  = useState(true);
  const [loadingDetail,  setLoadingDetail]  = useState(false);
  const [publishing,     setPublishing]     = useState(false);
  const [feedback,       setFeedback]       = useState(null);
  const [search,         setSearch]         = useState('');
  const [modal,          setModal]          = useState(null);
  const [showHiddenItems, setShowHiddenItems] = useState(false);

  const loadPending = useCallback(() => {
    setLoadingOrders(true);
    listOrders({ status: 'PENDING' })
      .then((orders) => {
        setPendingOrders(orders);
        if (orders.length > 0 && !selectedOrderId) {
          setSelectedOrderId(orders[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [selectedOrderId]);

  useEffect(() => { loadPending(); }, []);

  useEffect(() => {
    if (!selectedOrderId) { setOrderDetail(null); return; }
    setLoadingDetail(true);
    getOrder(selectedOrderId, { includeHidden: showHiddenItems })
      .then(setOrderDetail)
      .catch(() => setOrderDetail(null))
      .finally(() => setLoadingDetail(false));
  }, [selectedOrderId, showHiddenItems]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!orderDetail?.items) return [];
    return orderDetail.items.filter((item) =>
      !q || item.product.sku.toLowerCase().includes(q) || item.product.name.toLowerCase().includes(q)
    );
  }, [orderDetail, search]);

  const filteredHiddenItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!showHiddenItems || !orderDetail?.hiddenItems) return [];
    return orderDetail.hiddenItems.filter((item) =>
      !q
      || (item.rawSku ?? '').toLowerCase().includes(q)
      || (item.rawDescription ?? '').toLowerCase().includes(q)
      || (item.manufacturerReference ?? '').toLowerCase().includes(q)
      || (item.manufacturerName ?? '').toLowerCase().includes(q)
    );
  }, [orderDetail, search, showHiddenItems]);

  async function handlePublish() {
    if (!selectedOrderId) return;
    setPublishing(true);
    setFeedback(null);
    try {
      await publishOrder(selectedOrderId);
      setFeedback('Pedido publicado com sucesso! Estoquista já pode ver a lista.');
      loadPending();
      setSelectedOrderId(null);
      setOrderDetail(null);
    } catch (err) {
      setFeedback(err.message || 'Erro ao publicar pedido');
    } finally {
      setPublishing(false);
    }
  }

  const selectedMeta = pendingOrders.find((o) => o.id === selectedOrderId);
  const totalItems   = orderDetail?.items?.length ?? 0;
  const hiddenItemsCount = orderDetail?.hiddenItems?.length ?? 0;

  return (
    <div className="reviews-page">
      <section className="hero reviews-hero">
        <div>
          <h1>Revisões</h1>
          <p>Valide os itens extraídos do DAV e publique para iniciar a separação.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button"
            disabled={!selectedOrderId || publishing}
            onClick={handlePublish}>
            {publishing ? 'Publicando…' : 'Publicar pedido'}
          </button>
          <button className="btn btn-secondary" type="button" onClick={() => onNavigate?.('uploadDav')}>
            Voltar para uploads
          </button>
        </div>
      </section>

      {feedback && <div className="reviews-feedback" role="status">{feedback}</div>}

      {loadingOrders ? (
        <div className="reviews-feedback">Carregando pedidos…</div>
      ) : pendingOrders.length === 0 ? (
        <div className="card" style={{ padding: '32px', textAlign: 'center' }}>
          <p>Nenhum pedido aguardando revisão.</p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} type="button"
            onClick={() => onNavigate?.('uploadDav')}>
            Enviar novo DAV
          </button>
        </div>
      ) : (
        <>
          {pendingOrders.length > 1 && (
            <section className="card" style={{ padding: '16px 20px', marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 14 }}>
                <strong>DAV em revisão:</strong>
                <select
                  value={selectedOrderId ?? ''}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--outline)', fontSize: 14 }}
                >
                  {pendingOrders.map((o) => (
                    <option key={o.id} value={o.id}>
                      DAV {o.orderNumber} — {o.customerName} ({o.totalItems ?? 0} itens)
                    </option>
                  ))}
                </select>
              </label>
            </section>
          )}

          <section className="reviews-top-grid">
            <div className="card reviews-summary-card">
              <div className="reviews-card-head">
                <h2>DAV em revisão</h2>
                <p>Resumo do pedido extraído antes da publicação para o estoque.</p>
              </div>
              <div className="reviews-summary-grid">
                <div className="reviews-summary-item"><span>DAV</span><strong>{selectedMeta?.orderNumber ?? '—'}</strong></div>
                <div className="reviews-summary-item"><span>Cliente</span><strong>{selectedMeta?.customerName ?? '—'}</strong></div>
                <div className="reviews-summary-item"><span>Importado em</span><strong>{formatDate(selectedMeta?.createdAt)}</strong></div>
                <div className="reviews-summary-item"><span>Itens vinculados</span><strong>{totalItems}</strong></div>
                <div className="reviews-summary-item"><span>Itens ocultos</span><strong>{hiddenItemsCount}</strong></div>
                <div className="reviews-summary-item">
                  <span>Status</span>
                  <strong className="reviews-draft-badge">AGUARDANDO REVISÃO</strong>
                </div>
              </div>
            </div>

            <aside className="reviews-side">
              <div className="card reviews-side-card">
                <h2>Próximos passos</h2>
                <ul className="reviews-pending-list">
                  <li>{totalItems} {totalItems === 1 ? 'item vinculado' : 'itens vinculados'} ao catálogo</li>
                  <li>Verifique os itens antes de publicar</li>
                  <li>Ao publicar, o estoquista recebe a lista</li>
                </ul>
                <button className="btn btn-primary btn-sm" type="button"
                  disabled={!selectedOrderId || publishing}
                  onClick={handlePublish}>
                  {publishing ? 'Publicando…' : 'Publicar agora'}
                </button>
              </div>
              <div className="card reviews-side-card">
                <h2>Regra importante</h2>
                <p>
                  Apenas itens vinculados ao catálogo entram na lista do estoquista.
                  Itens ignorados e sem vínculo ficam registrados para auditoria.
                </p>
                <label className="reviews-hidden-toggle">
                  <input
                    type="checkbox"
                    checked={showHiddenItems}
                    onChange={(e) => setShowHiddenItems(e.target.checked)}
                  />
                  <span>Mostrar itens ocultos</span>
                </label>
                <p className="reviews-hidden-help">
                  Itens ocultos não vão para o picking, mas permanecem registrados para auditoria.
                </p>
              </div>
            </aside>
          </section>

          <section className="card reviews-table-card">
            <div className="reviews-toolbar">
              <label className="reviews-search">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                <input type="search" placeholder="Buscar por SKU ou descrição…"
                  value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>
            </div>

            {loadingDetail ? (
              <div className="reviews-feedback">Carregando itens…</div>
            ) : filteredItems.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--on-surface-variant)' }}>
                Nenhum item encontrado.
              </div>
            ) : (
              <>
                <table className="reviews-table">
                  <thead>
                    <tr>
                      <th>SKU</th>
                      <th>Produto</th>
                      <th>Quantidade</th>
                      <th>Unidade</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <tr key={item.id}>
                        <td><span className="dav-id">{item.product.sku}</span></td>
                        <td><span className="review-description">{item.product.name}</span></td>
                        <td><span className="counts"><span className="num">{item.quantity}</span></span></td>
                        <td><span className="review-unit">{item.product.unit}</span></td>
                        <td><ReviewStatusBadge status={item.status} /></td>
                        <td>
                          <div className="review-actions">
                            <button className="review-action" type="button"
                              onClick={() => setModal({ item })}>
                              Ver
                            </button>
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
                          <span className="dav-id">{item.product.sku}</span>
                          <strong>{item.product.name}</strong>
                        </div>
                        <ReviewStatusBadge status={item.status} />
                      </div>
                      <div className="reviews-mobile-grid">
                        <div><span>Quantidade</span><strong>{item.quantity}</strong></div>
                        <div><span>Unidade</span><strong>{item.product.unit}</strong></div>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </section>

          {showHiddenItems && (
            <section className="card reviews-hidden-card">
              <div className="reviews-hidden-head">
                <div>
                  <h2>Itens ocultos deste pedido</h2>
                  <p>Ocultados por regra antes do vínculo com produto e fora da lista do estoquista.</p>
                </div>
                <ReviewStatusBadge status="HIDDEN" />
              </div>

              {loadingDetail ? (
                <div className="reviews-feedback">Carregando itens ocultos…</div>
              ) : filteredHiddenItems.length === 0 ? (
                <div className="reviews-hidden-empty">Nenhum item oculto encontrado para este filtro.</div>
              ) : (
                <div className="reviews-hidden-list">
                  {filteredHiddenItems.map((item) => (
                    <article className="reviews-hidden-item" key={item.id}>
                      <div>
                        <span className="dav-id">{item.rawSku ?? item.manufacturerReference ?? '—'}</span>
                        <strong>{item.rawDescription}</strong>
                        <p>
                          {item.ignoredReason ?? 'Sem motivo informado'}
                          {item.ruleMatchType ? ` · Regra: ${item.ruleMatchType}` : ''}
                        </p>
                      </div>
                      <div className="reviews-hidden-meta">
                        <span>{item.quantity} {item.unit ?? ''}</span>
                        <ReviewStatusBadge status="HIDDEN" />
                        <button className="review-action" type="button" onClick={() => setModal({ item, hidden: true })}>
                          Ver regra
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="card reviews-footer-actions">
            <div>
              <h2>{totalItems} {totalItems === 1 ? 'item pronto' : 'itens prontos'} para picking</h2>
              <p>Publique para enviar a lista ao estoquista.</p>
            </div>
            <div className="reviews-footer-buttons">
              <button className="btn btn-primary" type="button"
                disabled={!selectedOrderId || publishing}
                onClick={handlePublish}>
                {publishing ? 'Publicando…' : 'Publicar pedido'}
              </button>
            </div>
          </section>
        </>
      )}

      {modal && (
        <div className="review-modal-overlay open" role="dialog" aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="review-modal card">
            <div className="review-modal-head">
              <div>
                <h2>Detalhes do item</h2>
                <p>
                  {modal.hidden
                    ? `${modal.item.rawSku ?? '—'} · ${modal.item.rawDescription ?? '—'}`
                    : `${modal.item.product.sku} · ${modal.item.product.name}`}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModal(null)} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="review-modal-body">
              <div className="review-rule-grid">
                {modal.hidden ? (
                  <>
                    <span>SKU DAV</span><strong>{modal.item.rawSku ?? '—'}</strong>
                    <span>Descrição</span><strong>{modal.item.rawDescription ?? '—'}</strong>
                    <span>Ref. fabricante</span><strong>{modal.item.manufacturerReference ?? '—'}</strong>
                    <span>Fabricante</span><strong>{modal.item.manufacturerName ?? '—'}</strong>
                    <span>Quantidade</span><strong>{modal.item.quantity} {modal.item.unit ?? ''}</strong>
                    <span>Regra</span><strong>{modal.item.ruleMatchType ?? '—'}</strong>
                    <span>Motivo</span><strong>{modal.item.ignoredReason ?? '—'}</strong>
                    <span>Status</span><ReviewStatusBadge status="HIDDEN" />
                  </>
                ) : (
                  <>
                    <span>SKU</span><strong>{modal.item.product.sku}</strong>
                    <span>Produto</span><strong>{modal.item.product.name}</strong>
                    <span>Unidade</span><strong>{modal.item.product.unit}</strong>
                    <span>Quantidade</span><strong>{modal.item.quantity}</strong>
                    <span>Status</span><ReviewStatusBadge status={modal.item.status} />
                  </>
                )}
              </div>
            </div>
            <div className="review-modal-foot">
              <button className="btn btn-secondary" type="button" onClick={() => setModal(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
