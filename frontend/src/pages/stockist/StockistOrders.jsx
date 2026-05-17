import { useCallback, useEffect, useMemo, useState } from 'react';
import { classifyDelivery, formatDate } from './stockistFormat.js';
import {
  listAvailableOrders,
  startPicking,
} from '../../services/stockistService.js';
import './StockistOrders.css';

// Tela 1 — Pedidos disponíveis para separação.
// Dados 100% reais: chamamos GET /stockist/orders e tratamos loading/erro/vazio.
// O backend já filtra por status=IN_PROGRESS e assigned_to IS NULL e ordena por
// delivery_date (mais próxima primeiro).
export default function StockistOrders({ user, onStart, onLogout }) {
  const [orders, setOrders]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [query, setQuery]     = useState('');
  const [starting, setStarting] = useState(null); // orderId em transição

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAvailableOrders();
      setOrders(data.items ?? []);
    } catch (err) {
      setError(err.message || 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtro client-side por DAV ou cliente.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((o) =>
      (o.davNumber ?? '').toLowerCase().includes(q) ||
      (o.clientName ?? '').toLowerCase().includes(q)
    );
  }, [orders, query]);

  async function handleStart(orderId) {
    setStarting(orderId);
    setError(null);
    try {
      const order = await startPicking(orderId);
      onStart?.(order.id);
    } catch (err) {
      if (err.status === 409) {
        // Estoquista já tem outro pedido em separação — orienta a retomá-lo.
        setError('Você já possui um pedido em separação. Finalize ou retome o pedido atual.');
        if (err.data?.activeOrderId) {
          onStart?.(err.data.activeOrderId);
          return;
        }
      } else {
        setError(err.message || 'Não foi possível iniciar a separação.');
      }
    } finally {
      setStarting(null);
    }
  }

  return (
    <div className="stockist-shell">
      <header className="stk-header">
        <div className="stk-header-top">
          <div className="stk-header-user">
            <span className="stk-header-avatar">{(user?.name || 'E').charAt(0)}</span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontWeight: 600, color: '#fff' }}>{user?.name || 'Estoquista'}</span>
              <span>ESTOQUISTA</span>
            </div>
          </div>
          <button
            type="button"
            className="stk-header-back"
            onClick={onLogout}
            aria-label="Sair"
            title="Sair"
            style={{ marginLeft: 'auto' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <h1>Pedidos para separação</h1>
        <p className="stk-header-subtitle">
          {filtered.length} pedido{filtered.length === 1 ? '' : 's'} aguardando • toque em um card para iniciar.
        </p>

        <div className="stk-search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Buscar por DAV ou cliente"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar pedido"
          />
          {query && (
            <button
              type="button"
              className="stk-search-clear"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </header>

      <main className="stk-content">
        {loading && <OrdersSkeleton />}

        {!loading && error && (
          <div className="stk-empty stk-empty-error">
            <div className="stk-empty-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <path d="M12 10v5M12 18h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <h2>Erro ao carregar pedidos</h2>
            <p>{error}</p>
            <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={load}>
              Tentar de novo
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="stk-empty">
            <div className="stk-empty-icon stk-empty-icon-ok">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>{query ? 'Nenhum resultado' : 'Tudo em dia!'}</h2>
            <p>
              {query
                ? 'Nenhum pedido bate com a sua busca. Tente outro termo.'
                : 'Não há pedidos aguardando separação no momento.'}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <ul className="stk-orders-list">
            {filtered.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onStart={() => handleStart(order.id)}
                starting={starting === order.id}
                disabled={starting !== null && starting !== order.id}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

function OrderCard({ order, onStart, starting, disabled }) {
  const delivery = classifyDelivery(order.deliveryDate);
  return (
    <li className={`stk-order-card stk-order-${delivery.kind}`}>
      <div className="stk-order-head">
        <div>
          <span className="stk-order-dav">{order.davNumber}</span>
          <h3 className="stk-order-customer">{order.clientName}</h3>
        </div>
        <span className="stk-badge aguardando">Aguardando</span>
      </div>

      <div className="stk-order-meta">
        <div className="stk-order-meta-item">
          <span className="stk-order-meta-label">Entrega</span>
          <span className="stk-order-meta-value">{formatDate(order.deliveryDate)}</span>
        </div>
        <div className="stk-order-meta-item">
          <span className="stk-order-meta-label">Itens</span>
          <span className="stk-order-meta-value">{order.itemsCount ?? 0}</span>
        </div>
        <div className="stk-order-meta-item">
          <span className="stk-order-meta-label">Recebido</span>
          <span className="stk-order-meta-value">{formatDate(order.createdAt)}</span>
        </div>
      </div>

      <div className="stk-order-foot">
        <span className={`stk-pill ${delivery.kind}`}>
          {delivery.kind === 'atrasado' && (
            <svg viewBox="0 0 24 24" fill="none"><path d="M12 3 2 21h20L12 3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>
          )}
          {delivery.kind === 'hoje' && (
            <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          )}
          {delivery.kind === 'proxima' && (
            <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" /><path d="M3 9h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          )}
          {order.urgencyLabel || delivery.label}
        </span>
        <button
          type="button"
          className="stk-btn stk-btn-primary"
          onClick={onStart}
          disabled={disabled || starting}
          aria-disabled={disabled || starting}
        >
          {starting ? 'Iniciando…' : 'Iniciar separação'}
          {!starting && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </li>
  );
}

function OrdersSkeleton() {
  return (
    <ul className="stk-orders-list" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <li key={i} className="stk-order-card stk-order-skeleton">
          <div className="stk-skel-line w60" />
          <div className="stk-skel-line w90" />
          <div className="stk-skel-row">
            <div className="stk-skel-line w30" />
            <div className="stk-skel-line w30" />
            <div className="stk-skel-line w30" />
          </div>
          <div className="stk-skel-line w100 tall" />
        </li>
      ))}
    </ul>
  );
}
