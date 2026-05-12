import { useEffect, useState } from 'react';
import StatusBadge from './StatusBadge.jsx';
import { listOrders } from '../../services/orderService.js';
import './RecentDavTable.css';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function RecentDavTable() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card table-card">
      <div className="table-head">
        <div>
          <h2>Últimos DAVs enviados</h2>
          <p>Acompanhe o status e pendências dos pedidos recentes</p>
        </div>
      </div>

      {loading ? (
        <div className="upload-dav-empty">Carregando…</div>
      ) : orders.length === 0 ? (
        <div className="upload-dav-empty">Nenhum DAV importado ainda.</div>
      ) : (
        <>
          <table className="responsive-table">
            <thead>
              <tr>
                <th>DAV</th>
                <th>Cliente</th>
                <th>Importado em</th>
                <th>Status</th>
                <th>Itens</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td><span className="dav-id">{order.orderNumber}</span></td>
                  <td><span className="client-name">{order.customerName}</span></td>
                  <td><span className="delivery">{formatDate(order.createdAt)}</span></td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>
                    <span className="counts">
                      <span className="num">{order.totalItems ?? 0}</span> itens
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-cards">
            {orders.slice(0, 8).map((order) => (
              <div key={order.id} className="dav-mcard">
                <div className="dav-mcard-head">
                  <div>
                    <div className="dav-id">{order.orderNumber}</div>
                    <div className="client-name dav-mcard-client">{order.customerName}</div>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <div className="dav-mcard-grid">
                  <div>
                    <div className="k">Importado em</div>
                    <div className="v">{formatDate(order.createdAt)}</div>
                  </div>
                  <div>
                    <div className="k">Itens</div>
                    <div className="v">{order.totalItems ?? 0}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
