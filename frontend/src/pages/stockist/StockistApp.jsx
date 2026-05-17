import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import StockistOrders from './StockistOrders.jsx';
import StockistPicking from './StockistPicking.jsx';
import StockistOrderSummary from './StockistOrderSummary.jsx';
import { getMyActivePicking } from '../../services/stockistService.js';
import './stockist.css';

// Container do fluxo do estoquista. Não há React Router neste projeto —
// a navegação é feita por estado interno, como na AdminDashboard.
//
// Views:
//   'orders'  → lista de pedidos disponíveis (AGUARDANDO)
//   'picking' → tela de separação do pedido selecionado
//   'summary' → tela de resumo final
//
// Ao montar, consulta o backend para retomar o pedido EM_SEPARACAO
// atualmente atribuído ao estoquista (se houver). Sem mocks: todo dado
// renderizado nesta área vem de chamadas reais à API.
export default function StockistApp() {
  const { user, logout } = useAuth();

  const [view, setView]                   = useState('orders');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(true);

  // Ao abrir, pergunta ao backend se este estoquista já tem pedido em separação.
  useEffect(() => {
    let cancelled = false;
    async function checkActive() {
      try {
        const data = await getMyActivePicking();
        if (cancelled) return;
        if (data?.active) {
          setSelectedOrderId(data.active.id);
          setView('picking');
        }
      } catch {
        // Sem pedido ativo ou erro de rede — usuário pode tentar novamente
        // a partir da listagem. Não bloqueamos a UI por essa consulta.
      } finally {
        if (!cancelled) setResumeLoading(false);
      }
    }
    checkActive();
    return () => { cancelled = true; };
  }, []);

  const handleStart = useCallback((orderId) => {
    setSelectedOrderId(orderId);
    setView('picking');
  }, []);

  const handleFinish = useCallback((orderId) => {
    setSelectedOrderId(orderId);
    setView('summary');
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedOrderId(null);
    setView('orders');
  }, []);

  const handleResume = useCallback(() => {
    setView('picking');
  }, []);

  if (resumeLoading) {
    return (
      <div className="stockist-root">
        <div className="stk-empty" style={{ minHeight: '60vh' }}>
          <p>Carregando…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stockist-root">
      {view === 'orders' && (
        <StockistOrders user={user} onStart={handleStart} onLogout={logout} />
      )}
      {view === 'picking' && selectedOrderId && (
        <StockistPicking
          orderId={selectedOrderId}
          onBack={handleBackToList}
          onFinish={() => handleFinish(selectedOrderId)}
        />
      )}
      {view === 'summary' && selectedOrderId && (
        <StockistOrderSummary
          orderId={selectedOrderId}
          user={user}
          onBackToList={handleBackToList}
          onResume={handleResume}
        />
      )}
    </div>
  );
}
