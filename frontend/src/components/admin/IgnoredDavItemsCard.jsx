import { useEffect, useState } from 'react';
import { listIgnoredDavItems } from '../../services/ignoredDavItemsService.js';
import './IgnoredDavItemsCard.css';

export default function IgnoredDavItemsCard({ onNavigate }) {
  const [items, setItems] = useState([]);

  useEffect(() => {
    listIgnoredDavItems({ includeInactive: false })
      .then(setItems)
      .catch(() => {});
  }, []);

  return (
    <div className="card side-card ignored-card">
      <div className="ignored-header">
        <div>
          <h3>Itens ignorados do DAV</h3>
          <div className="sub">
            Serviços e processos que não vão para o estoquista, mas ficam registrados para auditoria.
          </div>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="sub" style={{ padding: '8px 0' }}>Nenhuma regra ativa.</div>
      ) : (
        items.slice(0, 3).map((item) => (
          <div key={item.id} className="ignored-item">
            <div>
              <div className="ignored-code">{item.rawSku ?? '—'}</div>
              <div className="ignored-desc">{item.rawDescription ?? item.rawSku ?? '—'}</div>
            </div>
            <span className="ignored-tag">Auto</span>
          </div>
        ))
      )}

      {items.length > 3 && (
        <div className="sub" style={{ padding: '4px 0' }}>+ {items.length - 3} outras regras ativas</div>
      )}

      <button
        className="btn btn-secondary btn-sm ignored-manage-btn"
        type="button"
        onClick={() => onNavigate?.('ignoredItems')}
      >
        Gerenciar ignorados
      </button>
    </div>
  );
}
