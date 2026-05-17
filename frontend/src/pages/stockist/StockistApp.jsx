import { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import StockistOrders from './StockistOrders.jsx';
import StockistPicking from './StockistPicking.jsx';
import StockistOrderSummary from './StockistOrderSummary.jsx';
import { MOCK_ORDERS } from './mockData.js';
import './stockist.css';

// Container do fluxo do estoquista — segue o padrão de navegação
// por estado interno usado pela AdminDashboard.jsx (não há React Router no projeto).
//
// Views possíveis:
//   'orders'  → lista de pedidos disponíveis
//   'picking' → tela de separação do pedido selecionado
//   'summary' → tela de resumo final
//
// Estado de picking persiste em memória entre navegações picking ↔ summary,
// e é resetado quando o estoquista volta para a lista.
//
// Dados mockados apenas para montar o frontend.
// Na próxima etapa serão substituídos por chamadas reais à API.
export default function StockistApp() {
  const { user, logout } = useAuth();

  const [view, setView]                 = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [pickingByOrder, setPickingByOrder]   = useState({}); // { [orderId]: { [itemId]: {...} } }
  const [sessionsByOrder, setSessionsByOrder] = useState({}); // { [orderId]: { start, end? } }

  const selectedOrder = MOCK_ORDERS.find((o) => o.id === selectedOrderId);
  const picking       = pickingByOrder[selectedOrderId] || {};
  const session       = sessionsByOrder[selectedOrderId] || {};

  const handleStart = useCallback((orderId) => {
    setSelectedOrderId(orderId);
    setSessionsByOrder((prev) => ({
      ...prev,
      [orderId]: prev[orderId] || { start: new Date().toISOString(), end: null },
    }));
    setView('picking');
  }, []);

  const handleUpdateItem = useCallback((itemId, patch) => {
    setPickingByOrder((prev) => ({
      ...prev,
      [selectedOrderId]: {
        ...(prev[selectedOrderId] || {}),
        [itemId]: { ...(prev[selectedOrderId]?.[itemId] || {}), ...patch },
      },
    }));
  }, [selectedOrderId]);

  const handleFinish = useCallback(() => {
    setSessionsByOrder((prev) => ({
      ...prev,
      [selectedOrderId]: { ...(prev[selectedOrderId] || {}), end: new Date().toISOString() },
    }));
    setView('summary');
  }, [selectedOrderId]);

  const handleBackToList = useCallback(() => {
    setView('orders');
    setSelectedOrderId(null);
  }, []);

  const handleResume = useCallback(() => {
    setView('picking');
  }, []);

  return (
    <div className="stockist-root">
      {view === 'orders' && (
        <StockistOrders user={user} onStart={handleStart} onLogout={logout} />
      )}
      {view === 'picking' && selectedOrder && (
        <StockistPicking
          order={selectedOrder}
          picking={picking}
          onUpdateItem={handleUpdateItem}
          onBack={handleBackToList}
          onFinish={handleFinish}
        />
      )}
      {view === 'summary' && selectedOrder && (
        <StockistOrderSummary
          order={selectedOrder}
          picking={picking}
          user={user}
          sessionStart={session.start}
          sessionEnd={session.end}
          onBackToList={handleBackToList}
          onResume={handleResume}
        />
      )}
    </div>
  );
}
