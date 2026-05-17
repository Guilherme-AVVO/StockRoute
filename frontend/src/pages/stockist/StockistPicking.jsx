import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDate } from './stockistFormat.js';
import {
  getPickingOrder,
  collectItem as apiCollect,
  markItemNotFound as apiMarkNotFound,
  finishPicking as apiFinish,
  resolveAssetUrl,
} from '../../services/stockistService.js';
import ProductReferenceModal from '../../components/stockist/ProductReferenceModal.jsx';
import CollectItemModal from '../../components/stockist/CollectItemModal.jsx';
import NotFoundModal from '../../components/stockist/NotFoundModal.jsx';
import './StockistPicking.css';

// Tela 2 — Separação do pedido.
// Carrega o pedido + itens reais pelo orderId. Cada ação (coletar/marcar não
// encontrado/finalizar) chama o backend e refresca o estado local com a resposta.
export default function StockistPicking({ orderId, onBack, onFinish }) {
  const [order, setOrder]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy]         = useState(false);

  const [refItem,     setRefItem]     = useState(null);
  const [collectItem, setCollectItem] = useState(null);
  const [notFoundItem, setNotFoundItem] = useState(null);
  const [filter,      setFilter]      = useState('TODOS');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getPickingOrder(orderId);
      setOrder(data);
    } catch (err) {
      setLoadError(err.message || 'Não foi possível carregar o pedido.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => { load(); }, [load]);

  const items = order?.items ?? [];

  const stats = useMemo(() => {
    let coletados = 0, naoEncontrados = 0, pendentes = 0;
    for (const it of items) {
      if (it.status === 'COLETADO')             coletados++;
      else if (it.status === 'NAO_ENCONTRADO')  naoEncontrados++;
      else                                       pendentes++;
    }
    const total = items.length;
    const processed = total - pendentes;
    const pct = total === 0 ? 0 : Math.round((processed / total) * 100);
    return { coletados, naoEncontrados, pendentes, processed, total, pct };
  }, [items]);

  const allProcessed = stats.total > 0 && stats.pendentes === 0;
  const hasNotFound  = stats.naoEncontrados > 0;

  const visibleItems = useMemo(() => {
    if (filter === 'TODOS') return items;
    return items.filter((it) => it.status === filter);
  }, [items, filter]);

  // Atualiza um item específico no estado local sem refazer o GET completo.
  function patchItem(itemId, patch) {
    setOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      };
    });
  }

  async function handleCollect({ itemId, photoFile }) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiCollect(itemId, photoFile);
      patchItem(itemId, {
        status: 'COLETADO',
        rawStatus: updated.rawStatus,
        confirmationPhotoUrl: updated.confirmationPhotoUrl,
        collectedAt: updated.collectedAt,
        reason: null,
        notes: null,
      });
      setCollectItem(null);
    } catch (err) {
      setActionError(err.message || 'Não foi possível registrar a coleta.');
    } finally {
      setBusy(false);
    }
  }

  async function handleNotFound({ itemId, reason, notes }) {
    setBusy(true);
    setActionError(null);
    try {
      const updated = await apiMarkNotFound(itemId, { reason, notes });
      patchItem(itemId, {
        status: 'NAO_ENCONTRADO',
        rawStatus: updated.rawStatus,
        reason: updated.reason,
        notes: updated.notes,
        confirmationPhotoUrl: null,
        collectedAt: null,
      });
      setNotFoundItem(null);
    } catch (err) {
      setActionError(err.message || 'Não foi possível registrar o item.');
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    if (!allProcessed || busy) return;
    setBusy(true);
    setActionError(null);
    try {
      await apiFinish(orderId);
      onFinish?.();
    } catch (err) {
      setActionError(err.message || 'Não foi possível finalizar o pedido.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="stockist-shell">
        <div className="stk-empty"><p>Carregando pedido…</p></div>
      </div>
    );
  }

  if (loadError || !order) {
    return (
      <div className="stockist-shell">
        <div className="stk-empty stk-empty-error">
          <h2>Erro ao carregar pedido</h2>
          <p>{loadError || 'Pedido não encontrado.'}</p>
          <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={load}>Tentar de novo</button>
          <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={onBack}>Voltar</button>
        </div>
      </div>
    );
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
            <span>{order.davNumber}</span>
          </span>
        </div>

        <h1 style={{ fontSize: 20, marginTop: 8 }}>{order.clientName}</h1>
        <p className="stk-header-subtitle">
          Entrega {formatDate(order.deliveryDate)} • {stats.total} itens
        </p>

        <div className="stk-progress">
          <div className="stk-progress-top">
            <span className="stk-progress-count">
              {stats.processed} <span style={{ opacity: 0.7 }}>de {stats.total} itens processados</span>
            </span>
            <span className="stk-progress-pct">{stats.pct}%</span>
          </div>
          <div className="stk-progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={stats.pct}>
            <div className="stk-progress-fill stk-progress-fill-coletados"   style={{ width: stats.total ? `${(stats.coletados / stats.total) * 100}%` : 0 }} />
            <div className="stk-progress-fill stk-progress-fill-naoencontrados" style={{ width: stats.total ? `${(stats.naoEncontrados / stats.total) * 100}%` : 0 }} />
          </div>
          <div className="stk-progress-legend">
            <span><i className="dot ok" /> {stats.coletados} coletados</span>
            <span><i className="dot warn" /> {stats.naoEncontrados} não encontrados</span>
            <span><i className="dot idle" /> {stats.pendentes} pendentes</span>
          </div>
        </div>
      </header>

      <main className="stk-content stk-picking-content">
        {actionError && (
          <div className="stk-empty stk-empty-error" style={{ marginBottom: 12 }}>
            <p>{actionError}</p>
            <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={() => setActionError(null)}>
              Ok
            </button>
          </div>
        )}

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
              onOpenRef={() => setRefItem(item)}
              onOpenCollect={() => setCollectItem(item)}
              onOpenNotFound={() => setNotFoundItem(item)}
            />
          ))}
        </ul>
      </main>

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
          disabled={!allProcessed || busy}
          aria-disabled={!allProcessed || busy}
          onClick={handleFinish}
        >
          {busy ? 'Finalizando…' : 'Finalizar pedido'}
          {!busy && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      <ProductReferenceModal open={Boolean(refItem)} onClose={() => setRefItem(null)} item={refItem} />
      <CollectItemModal open={Boolean(collectItem)} onClose={() => setCollectItem(null)} item={collectItem} onConfirm={handleCollect} busy={busy} />
      <NotFoundModal    open={Boolean(notFoundItem)} onClose={() => setNotFoundItem(null)} item={notFoundItem} onConfirm={handleNotFound} busy={busy} />
    </div>
  );
}

function ItemCard({ item, onOpenRef, onOpenCollect, onOpenNotFound }) {
  const status = item.status || 'PENDENTE';
  const isPending  = status === 'PENDENTE';
  const isCollected = status === 'COLETADO';
  const isNotFound = status === 'NAO_ENCONTRADO';

  const referenceUrl    = resolveAssetUrl(item.productPhotoUrl);
  const confirmationUrl = resolveAssetUrl(item.confirmationPhotoUrl);

  return (
    <li className={`stk-item stk-item-${status.toLowerCase().replace('_', '-')}`}>
      <div className="stk-item-head">
        <div className="stk-item-thumb">
          {referenceUrl ? (
            <img src={referenceUrl} alt="" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 17l-5-5-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
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
          <p className="stk-item-name">{item.productName}</p>
          <div className="stk-item-meta">
            <span><b>SKU:</b> {item.sku}</span>
            {item.manufacturerReference && <span><b>Ref.:</b> {item.manufacturerReference}</span>}
            {item.manufacturerName && <span className="stk-item-meta-fab">{item.manufacturerName}</span>}
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
          {confirmationUrl && (
            <img src={confirmationUrl} alt="Foto da coleta" className="stk-item-evidence" />
          )}
          <div className="stk-item-status-info">
            <span className="stk-item-status-title ok">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Coletado com foto
            </span>
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
              {item.reason || 'Não encontrado'}
            </span>
            {item.notes && <p className="stk-item-note">{item.notes}</p>}
          </div>
        </div>
      )}
    </li>
  );
}
