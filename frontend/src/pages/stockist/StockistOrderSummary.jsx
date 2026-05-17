import { useCallback, useEffect, useState } from 'react';
import { formatDate, formatDateTime, formatDuration } from './stockistFormat.js';
import { getOrderSummary, resolveAssetUrl } from '../../services/stockistService.js';
import './StockistOrderSummary.css';

// Tela 3 — Resumo final do pedido.
// Carrega GET /stockist/orders/:id/summary e mostra os dados reais:
// identificação, tempos, fotos anexadas e itens não encontrados com motivo.
export default function StockistOrderSummary({ orderId, user, onBackToList, onResume }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getOrderSummary(orderId);
      setSummary(data);
    } catch (err) {
      setError(err.message || 'Não foi possível carregar o resumo.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="stockist-shell">
        <div className="stk-empty"><p>Carregando resumo…</p></div>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="stockist-shell">
        <div className="stk-empty stk-empty-error">
          <h2>Erro ao carregar resumo</h2>
          <p>{error || 'Resumo indisponível.'}</p>
          <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={load}>Tentar de novo</button>
          <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={onBackToList}>Voltar</button>
        </div>
      </div>
    );
  }

  const isObservacao = summary.finalStatus === 'OBSERVACAO';
  const totalPhotos  = summary.photos?.length ?? 0;

  return (
    <div className="stockist-shell">
      <header className={`stk-header stk-header-summary ${isObservacao ? 'observacao' : 'concluido'}`}>
        <div className="stk-header-top">
          <button
            type="button"
            className="stk-header-back"
            onClick={onBackToList}
            aria-label="Voltar para pedidos"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="stk-summary-final-badge">
            {isObservacao ? 'OBSERVAÇÃO' : 'CONCLUÍDO'}
          </span>
        </div>

        <div className="stk-summary-trophy" aria-hidden="true">
          {isObservacao ? (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.6" />
              <path d="m7 12 4 4 6-7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <h1>Resumo do pedido</h1>
        <p className="stk-header-subtitle">
          {summary.order.davNumber} • {summary.order.clientName}
        </p>
      </header>

      <main className="stk-content">
        {isObservacao && (
          <div className="stk-alert">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
              <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <div>
              <p className="stk-alert-title">Pedido enviado para OBSERVAÇÃO</p>
              <p className="stk-alert-text">O ADMIN precisa revisar as pendências antes de liberar o pedido.</p>
            </div>
          </div>
        )}

        <section className="stk-summary-kpis">
          <KpiCard label="Itens totais"    value={summary.totalItems} tone="neutral" />
          <KpiCard label="Coletados"       value={summary.collectedItems} tone="success" />
          <KpiCard label="Não encontrados" value={summary.notFoundItems}  tone={summary.notFoundItems > 0 ? 'observacao' : 'neutral'} />
          <KpiCard label="Fotos anexadas"  value={totalPhotos} tone="primary" />
        </section>

        <section className="stk-card stk-summary-block">
          <h2 className="stk-summary-block-title">Identificação</h2>
          <div className="stk-detail-list">
            <div className="stk-detail-row"><span className="stk-detail-label">DAV</span>        <span className="stk-detail-value">{summary.order.davNumber}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Cliente</span>    <span className="stk-detail-value">{summary.order.clientName}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Entrega</span>    <span className="stk-detail-value">{formatDate(summary.order.deliveryDate)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Estoquista</span> <span className="stk-detail-value">{summary.order.assignedName || user?.name || '—'}</span></div>
          </div>
        </section>

        <section className="stk-card stk-summary-block">
          <h2 className="stk-summary-block-title">Tempos da separação</h2>
          <div className="stk-detail-list">
            <div className="stk-detail-row"><span className="stk-detail-label">Início</span>   <span className="stk-detail-value">{formatDateTime(summary.startedAt)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Fim</span>      <span className="stk-detail-value">{formatDateTime(summary.finishedAt)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Duração</span>  <span className="stk-detail-value">{formatDuration(summary.durationMs)}</span></div>
          </div>
        </section>

        {totalPhotos > 0 && (
          <section className="stk-card stk-summary-block">
            <h2 className="stk-summary-block-title">Fotos anexadas ({totalPhotos})</h2>
            <div className="stk-photo-grid">
              {summary.photos.map((photo) => {
                const url = resolveAssetUrl(photo.url);
                return (
                  <figure key={photo.itemId} className="stk-photo-tile">
                    {url ? (
                      <img src={url} alt={`Coleta: ${photo.productName}`} />
                    ) : (
                      <div className="stk-photo-tile-placeholder">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    <figcaption>
                      <span>{photo.sku}</span>
                      <small>{photo.quantity} {photo.unit}</small>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        )}

        {summary.reasons.length > 0 && (
          <section className="stk-card stk-summary-block stk-summary-block-warn">
            <h2 className="stk-summary-block-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: -3, marginRight: 4 }}>
                <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Itens não encontrados ({summary.reasons.length})
            </h2>
            <ul className="stk-not-found-list">
              {summary.reasons.map((n) => (
                <li key={n.itemId} className="stk-not-found-item">
                  <div className="stk-not-found-head">
                    <span className="stk-not-found-name">{n.productName}</span>
                    <span className="stk-badge nao-encontrado">{n.reason || 'Não encontrado'}</span>
                  </div>
                  <div className="stk-item-meta" style={{ marginBottom: n.notes ? 6 : 0 }}>
                    <span><b>SKU:</b> {n.sku}</span>
                    {n.manufacturerName      && <span><b>Fab.:</b> {n.manufacturerName}</span>}
                    {n.manufacturerReference && <span><b>Ref.:</b> {n.manufacturerReference}</span>}
                    <span><b>Qtd:</b> {n.quantity} {n.unit}</span>
                  </div>
                  {n.notes && <p className="stk-not-found-note">"{n.notes}"</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="stk-summary-actions">
          {isObservacao && (
            <button type="button" className="stk-btn stk-btn-secondary" onClick={onResume}>
              Revisar separação
            </button>
          )}
          <button type="button" className="stk-btn stk-btn-primary" onClick={onBackToList}>
            Voltar para pedidos
          </button>
        </div>
      </main>
    </div>
  );
}

function KpiCard({ label, value, tone }) {
  return (
    <div className={`stk-kpi stk-kpi-${tone}`}>
      <span className="stk-kpi-value">{value}</span>
      <span className="stk-kpi-label">{label}</span>
    </div>
  );
}
