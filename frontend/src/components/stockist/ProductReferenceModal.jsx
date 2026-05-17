import StockistModal from './StockistModal.jsx';

// Modal exibido ao tocar em "Referência" em um item do picking.
// Mostra a foto de referência cadastrada do produto + ficha técnica.
// IMPORTANTE: essa foto é apenas para o estoquista identificar o produto.
// NÃO é a foto de confirmação da coleta.
export default function ProductReferenceModal({ open, onClose, item }) {
  if (!item) return null;

  const hasRefPhoto = Boolean(item.referencePhotoUrl);

  return (
    <StockistModal
      open={open}
      onClose={onClose}
      title="Referência do produto"
      subtitle="Use esta foto e dados para localizar o item no estoque."
      footerRow={false}
      footer={(
        <button type="button" className="stk-btn stk-btn-primary" onClick={onClose}>
          Entendi
        </button>
      )}
    >
      <div className="stk-ref-photo">
        {hasRefPhoto ? (
          <img src={item.referencePhotoUrl} alt={`Referência: ${item.name}`} />
        ) : (
          <>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 17l-5-5-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="stk-ref-photo-empty-title">Sem foto de referência cadastrada</span>
            <span className="stk-ref-photo-empty-sub">Confirme o produto pelo SKU e pela referência do fabricante abaixo.</span>
          </>
        )}
      </div>

      <h3 style={{ font: '600 15px/1.3 var(--font-display)', margin: '4px 0 6px' }}>
        {item.name}
      </h3>

      <div className="stk-detail-list">
        <div className="stk-detail-row">
          <span className="stk-detail-label">SKU</span>
          <span className="stk-detail-value">{item.sku}</span>
        </div>
        <div className="stk-detail-row">
          <span className="stk-detail-label">Fabricante</span>
          <span className="stk-detail-value">{item.manufacturer}</span>
        </div>
        <div className="stk-detail-row">
          <span className="stk-detail-label">Ref. fabricante</span>
          <span className="stk-detail-value">{item.manufacturerRef}</span>
        </div>
        <div className="stk-detail-row">
          <span className="stk-detail-label">Unidade</span>
          <span className="stk-detail-value">{item.unit}</span>
        </div>
        <div className="stk-detail-row">
          <span className="stk-detail-label">Quantidade solicitada</span>
          <span className="stk-detail-value">{item.quantity} {item.unit}</span>
        </div>
      </div>

      {item.description && (
        <div className="stk-detail-block">
          <div className="stk-detail-block-label">Descrição</div>
          {item.description}
        </div>
      )}

      {item.notes && (
        <div className="stk-detail-block" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
          <div className="stk-detail-block-label" style={{ color: 'var(--warning)' }}>Observações</div>
          {item.notes}
        </div>
      )}

      <div className="stk-info-banner">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
          <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span>
          Esta foto é apenas <b>referência visual</b>. A foto de <b>confirmação</b> da coleta é capturada ao clicar em "Coletar".
        </span>
      </div>
    </StockistModal>
  );
}
