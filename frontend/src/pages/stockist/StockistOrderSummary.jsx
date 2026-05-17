import { useMemo } from 'react';
import { formatDate, formatDateTime, formatDuration } from './mockData.js';
import './StockistOrderSummary.css';

// Tela 3 — Resumo final do pedido.
// - status final: CONCLUIDO (todos coletados) ou OBSERVACAO (algum não encontrado);
// - mostra duração, contagens, miniaturas das fotos e motivos.
export default function StockistOrderSummary({ order, picking, user, sessionStart, sessionEnd, onBackToList, onResume }) {
  const stats = useMemo(() => {
    const collected = [];
    const notFound  = [];
    for (const it of order.items) {
      const s = picking[it.id] || {};
      if (s.status === 'COLETADO')        collected.push({ ...it, ...s });
      else if (s.status === 'NAO_ENCONTRADO') notFound.push({ ...it, ...s });
    }
    const total      = order.items.length;
    const hasIssues  = notFound.length > 0;
    const finalStatus = hasIssues ? 'OBSERVACAO' : 'CONCLUIDO';
    const duration   = sessionStart && sessionEnd ? new Date(sessionEnd) - new Date(sessionStart) : null;
    return { collected, notFound, total, finalStatus, duration };
  }, [order.items, picking, sessionStart, sessionEnd]);

  const isObservacao = stats.finalStatus === 'OBSERVACAO';

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
          {order.dav} • {order.customer}
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

        {/* KPIs */}
        <section className="stk-summary-kpis">
          <KpiCard label="Itens totais"      value={stats.total} tone="neutral" />
          <KpiCard label="Coletados"         value={stats.collected.length} tone="success" />
          <KpiCard label="Não encontrados"   value={stats.notFound.length}  tone={stats.notFound.length > 0 ? 'observacao' : 'neutral'} />
          <KpiCard label="Fotos anexadas"    value={stats.collected.filter((c) => c.photoUrl).length} tone="primary" />
        </section>

        {/* Bloco de identificação */}
        <section className="stk-card stk-summary-block">
          <h2 className="stk-summary-block-title">Identificação</h2>
          <div className="stk-detail-list">
            <div className="stk-detail-row"><span className="stk-detail-label">DAV</span>                 <span className="stk-detail-value">{order.dav}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Cliente</span>             <span className="stk-detail-value">{order.customer}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Entrega</span>             <span className="stk-detail-value">{formatDate(order.deliveryDate)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Estoquista</span>          <span className="stk-detail-value">{user?.name || '—'}</span></div>
          </div>
        </section>

        {/* Tempos */}
        <section className="stk-card stk-summary-block">
          <h2 className="stk-summary-block-title">Tempos da separação</h2>
          <div className="stk-detail-list">
            <div className="stk-detail-row"><span className="stk-detail-label">Início</span>              <span className="stk-detail-value">{formatDateTime(sessionStart)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Fim</span>                 <span className="stk-detail-value">{formatDateTime(sessionEnd)}</span></div>
            <div className="stk-detail-row"><span className="stk-detail-label">Duração</span>             <span className="stk-detail-value">{formatDuration(stats.duration)}</span></div>
          </div>
        </section>

        {/* Fotos da coleta */}
        {stats.collected.length > 0 && (
          <section className="stk-card stk-summary-block">
            <h2 className="stk-summary-block-title">Fotos anexadas ({stats.collected.filter((c) => c.photoUrl).length})</h2>
            <div className="stk-photo-grid">
              {stats.collected.map((c) => (
                <figure key={c.id} className="stk-photo-tile">
                  {c.photoUrl ? (
                    <img src={c.photoUrl} alt={`Coleta: ${c.name}`} />
                  ) : (
                    <div className="stk-photo-tile-placeholder">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <figcaption>
                    <span>{c.sku}</span>
                    <small>{c.quantity} {c.unit}</small>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* Itens não encontrados */}
        {stats.notFound.length > 0 && (
          <section className="stk-card stk-summary-block stk-summary-block-warn">
            <h2 className="stk-summary-block-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ verticalAlign: -3, marginRight: 4 }}>
                <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Itens não encontrados ({stats.notFound.length})
            </h2>
            <ul className="stk-not-found-list">
              {stats.notFound.map((n) => (
                <li key={n.id} className="stk-not-found-item">
                  <div className="stk-not-found-head">
                    <span className="stk-not-found-name">{n.name}</span>
                    <span className="stk-badge nao-encontrado">{n.reasonLabel || 'Não encontrado'}</span>
                  </div>
                  <div className="stk-item-meta" style={{ marginBottom: n.note ? 6 : 0 }}>
                    <span><b>SKU:</b> {n.sku}</span>
                    <span><b>Fab.:</b> {n.manufacturer}</span>
                    <span><b>Ref.:</b> {n.manufacturerRef}</span>
                    <span><b>Qtd:</b> {n.quantity} {n.unit}</span>
                  </div>
                  {n.note && <p className="stk-not-found-note">"{n.note}"</p>}
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
