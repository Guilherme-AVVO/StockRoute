import { useMemo, useState } from 'react';
import { formatDate } from './mockData.js';
import ProductReferenceModal from '../../components/stockist/ProductReferenceModal.jsx';
import CollectItemModal from '../../components/stockist/CollectItemModal.jsx';
import NotFoundModal from '../../components/stockist/NotFoundModal.jsx';
import './StockistPicking.css';

// Tela 2 — Separação do pedido.
//
// Recebe:
//   - order: o pedido sendo separado;
//   - picking: estado por item { [itemId]: { status, photoUrl?, reason?, note? } };
//   - onUpdateItem(itemId, patch): atualiza o estado no pai (StockistApp);
//   - onBack: volta para a lista de pedidos;
//   - onFinish: navega para a tela de resumo final.
//
// Dados mockados apenas para montar o frontend.
// Na próxima etapa serão substituídos por chamadas reais à API.
export default function StockistPicking({ order, picking, onUpdateItem, onBack, onFinish }) {
  const [refItem,     setRefItem]     = useState(null);
  const [collectItem, setCollectItem] = useState(null);
  const [notFoundItem, setNotFoundItem] = useState(null);
  const [filter,      setFilter]      = useState('TODOS');

  const stats = useMemo(() => {
    let coletados = 0, naoEncontrados = 0, pendentes = 0;
    for (const it of order.items) {
      const s = picking[it.id]?.status || 'PENDENTE';
      if      (s === 'COLETADO')        coletados++;
      else if (s === 'NAO_ENCONTRADO')  naoEncontrados++;
      else                              pendentes++;
    }
    const processed = order.items.length - pendentes;
    const pct = order.items.length === 0 ? 0 : Math.round((processed / order.items.length) * 100);
    return { coletados, naoEncontrados, pendentes, processed, total: order.items.length, pct };
  }, [order.items, picking]);

  const allProcessed = stats.pendentes === 0;
  const hasNotFound  = stats.naoEncontrados > 0;

  const visibleItems = useMemo(() => {
    if (filter === 'TODOS') return order.items;
    return order.items.filter((it) => {
      const s = picking[it.id]?.status || 'PENDENTE';
      return s === filter;
    });
  }, [order.items, picking, filter]);

  function handleCollect({ itemId, photoUrl, capturedAt }) {
    onUpdateItem(itemId, { status: 'COLETADO', photoUrl, capturedAt });
    setCollectItem(null);
  }

  function handleNotFound({ itemId, reason, reasonLabel, note, reportedAt }) {
    onUpdateItem(itemId, { status: 'NAO_ENCONTRADO', reason, reasonLabel, note, reportedAt });
    setNotFoundItem(null);
  }

  function handleUndo(itemId) {
    // libera o objectURL da foto, se houver
    const cur = picking[itemId];
    if (cur?.photoUrl) URL.revokeObjectURL(cur.photoUrl);
    onUpdateItem(itemId, { status: 'PENDENTE', photoUrl: null, capturedAt: null, reason: null, reasonLabel: null, note: null, reportedAt: null });
  }

  return (
    <div className="stockist-shell">
      <header className="stk-header stk-header-picking">
        <div className="stk-header-top">
          <button
            type="button"
            className="stk-header-back"
            onClick={onBack}
            aria-label="Voltar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="stk-badge em-separacao" style={{ background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
            Em separação
          </span>
          <span className="stk-header-user" style={{ marginLeft: 'auto' }}>
            <span>{order.dav}</span>
          </span>
        </div>

        <h1 style={{ fontSize: 20, marginTop: 8 }}>{order.customer}</h1>
        <p className="stk-header-subtitle">
          Entrega {formatDate(order.deliveryDate)} • {order.items.length} itens
        </p>

        {/* Barra de progresso sempre visível */}
        <div className="stk-progress">
          <div className="stk-progress-top">
            <span className="stk-progress-count">
              {stats.processed} <span style={{ opacity: 0.7 }}>de {stats.total} itens processados</span>
            </span>
            <span className="stk-progress-pct">{stats.pct}%</span>
          </div>
          <div className="stk-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stats.pct}>
            <div className="stk-progress-fill stk-progress-fill-coletados"   style={{ width: `${(stats.coletados / stats.total) * 100}%` }} />
            <div className="stk-progress-fill stk-progress-fill-naoencontrados" style={{ width: `${(stats.naoEncontrados / stats.total) * 100}%` }} />
          </div>
          <div className="stk-progress-legend">
            <span><i className="dot ok" /> {stats.coletados} coletados</span>
            <span><i className="dot warn" /> {stats.naoEncontrados} não encontrados</span>
            <span><i className="dot idle" /> {stats.pendentes} pendentes</span>
          </div>
        </div>
      </header>

      <main className="stk-content stk-picking-content">
        {/* Filtros segmentados */}
        <div className="stk-segmented" role="tablist" aria-label="Filtrar itens">
          {[
            { value: 'TODOS',          label: 'Todos',         count: stats.total },
            { value: 'PENDENTE',       label: 'Pendentes',     count: stats.pendentes },
            { value: 'COLETADO',       label: 'Coletados',     count: stats.coletados },
            { value: 'NAO_ENCONTRADO', label: 'Não encontr.',  count: stats.naoEncontrados },
          ].map((opt) => (
            <button
              key={opt.value}
              role="tab"
              aria-selected={filter === opt.value}
              className={`stk-seg-btn${filter === opt.value ? ' active' : ''}`}
              onClick={() => setFilter(opt.value)}
              type="button"
            >
              {opt.label}
              <span className="stk-seg-count">{opt.count}</span>
            </button>
          ))}
        </div>

        <ul className="stk-items-list">
          {visibleItems.length === 0 && (
            <li className="stk-empty">
              <p>Nenhum item neste filtro.</p>
            </li>
          )}

          {visibleItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              state={picking[item.id] || { status: 'PENDENTE' }}
              onOpenRef={() => setRefItem(item)}
              onOpenCollect={() => setCollectItem(item)}
              onOpenNotFound={() => setNotFoundItem(item)}
              onUndo={() => handleUndo(item.id)}
            />
          ))}
        </ul>
      </main>

      {/* Barra fixa inferior — Finalizar pedido */}
      <div className="stk-finish-bar">
        {!allProcessed && (
          <p className="stk-finish-hint">
            Processe todos os itens para finalizar
            <span> ({stats.pendentes} pendente{stats.pendentes === 1 ? '' : 's'})</span>
          </p>
        )}
        {allProcessed && hasNotFound && (
          <p className="stk-finish-hint" style={{ color: 'var(--observacao)' }}>
            Pedido será finalizado com <b>OBSERVAÇÃO</b>
          </p>
        )}
        {allProcessed && !hasNotFound && (
          <p className="stk-finish-hint" style={{ color: 'var(--success)' }}>
            Todos os itens foram coletados
          </p>
        )}
        <button
          type="button"
          className="stk-btn stk-btn-primary stk-finish-btn"
          disabled={!allProcessed}
          aria-disabled={!allProcessed}
          onClick={onFinish}
        >
          Finalizar pedido
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ProductReferenceModal open={Boolean(refItem)} onClose={() => setRefItem(null)} item={refItem} />
      <CollectItemModal     open={Boolean(collectItem)} onClose={() => setCollectItem(null)} item={collectItem} onConfirm={handleCollect} />
      <NotFoundModal        open={Boolean(notFoundItem)} onClose={() => setNotFoundItem(null)} item={notFoundItem} onConfirm={handleNotFound} />
    </div>
  );
}

function ItemCard({ item, state, onOpenRef, onOpenCollect, onOpenNotFound, onUndo }) {
  const status = state.status || 'PENDENTE';
  const isPending  = status === 'PENDENTE';
  const isCollected = status === 'COLETADO';
  const isNotFound = status === 'NAO_ENCONTRADO';

  return (
    <li className={`stk-item stk-item-${status.toLowerCase().replace('_', '-')}`}>
      <div className="stk-item-head">
        <div className="stk-item-thumb">
          {item.referencePhotoUrl ? (
            <img src={item.referencePhotoUrl} alt="" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 17l-5-5-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {/* Selo de status sobre a thumb */}
          {isCollected && (
            <span className="stk-item-stamp ok" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          {isNotFound && (
            <span className="stk-item-stamp warn" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </div>

        <div className="stk-item-info">
          <p className="stk-item-name">{item.name}</p>
          <div className="stk-item-meta">
            <span><b>SKU:</b> {item.sku}</span>
            <span><b>Ref.:</b> {item.manufacturerRef}</span>
            <span className="stk-item-meta-fab">{item.manufacturer}</span>
          </div>
          <div className="stk-item-qty">
            <span className="stk-item-qty-num">{item.quantity}</span>
            <span className="stk-item-qty-unit">{item.unit}</span>
            {isPending  && <span className="stk-badge pendente"      style={{ marginLeft: 'auto' }}>Pendente</span>}
            {isCollected && <span className="stk-badge coletado"      style={{ marginLeft: 'auto' }}>Coletado</span>}
            {isNotFound && <span className="stk-badge nao-encontrado" style={{ marginLeft: 'auto' }}>Não encontrado</span>}
          </div>
        </div>
      </div>

      {/* Painel inferior — muda conforme o status */}
      {isPending && (
        <div className="stk-item-actions">
          <button type="button" className="stk-btn stk-btn-secondary" onClick={onOpenRef}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="8.5" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.8" />
              <path d="M21 17l-5-5-9 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Referência
          </button>
          <button type="button" className="stk-btn stk-btn-success" onClick={onOpenCollect}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
            Coletar
          </button>
          <button type="button" className="stk-btn stk-btn-danger" onClick={onOpenNotFound}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
              <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Não encontrado
          </button>
        </div>
      )}

      {isCollected && (
        <div className="stk-item-status">
          {state.photoUrl && (
            <img src={state.photoUrl} alt="Foto da coleta" className="stk-item-evidence" />
          )}
          <div className="stk-item-status-info">
            <span className="stk-item-status-title ok">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Coletado com foto
            </span>
            <button type="button" className="stk-item-undo" onClick={onUndo}>Desfazer</button>
          </div>
        </div>
      )}

      {isNotFound && (
        <div className="stk-item-status">
          <div className="stk-item-status-info" style={{ flex: 1 }}>
            <span className="stk-item-status-title warn">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {state.reasonLabel || 'Não encontrado'}
            </span>
            {state.note && <p className="stk-item-note">{state.note}</p>}
            <button type="button" className="stk-item-undo" onClick={onUndo}>Desfazer</button>
          </div>
        </div>
      )}
    </li>
  );
}
