import { useState, useEffect } from 'react';
import StockistModal from './StockistModal.jsx';
import { NOT_FOUND_REASONS } from '../../pages/stockist/mockData.js';

// Modal exibido ao tocar em "Não encontrado" em um item.
// - motivo é obrigatório;
// - se motivo for OUTRO, a observação textual também é obrigatória.
export default function NotFoundModal({ open, onClose, item, onConfirm }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setNote('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const reasonOther = reason === 'OUTRO';
  const canConfirm = reason && (!reasonOther || note.trim().length >= 3);

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm?.({
      itemId: item.id,
      reason,
      reasonLabel: NOT_FOUND_REASONS.find((r) => r.value === reason)?.label ?? reason,
      note: note.trim(),
      reportedAt: new Date().toISOString(),
    });
  }

  return (
    <StockistModal
      open={open}
      onClose={onClose}
      title="Item não encontrado"
      subtitle="Registre o motivo. O administrador revisará as pendências."
      footerRow={true}
      footer={(
        <>
          <button type="button" className="stk-btn stk-btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="stk-btn stk-btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
          >
            Confirmar
          </button>
        </>
      )}
    >
      <div className="stk-product-block">
        <div className="stk-product-block-info">
          <p className="stk-product-block-name">{item.name}</p>
          <div className="stk-product-block-meta">
            <span><b>Qtd:</b> {item.quantity} {item.unit}</span>
            <span><b>SKU:</b> {item.sku}</span>
            <span><b>Fab.:</b> {item.manufacturer}</span>
            <span><b>Ref.:</b> {item.manufacturerRef}</span>
          </div>
        </div>
      </div>

      <div className="stk-field">
        <span className="stk-field-label">
          Motivo<span className="stk-required-mark">*</span>
        </span>
        <div className="stk-radio-group" role="radiogroup" aria-label="Motivo">
          {NOT_FOUND_REASONS.map((opt) => (
            <label
              key={opt.value}
              className={`stk-radio${reason === opt.value ? ' checked' : ''}`}
            >
              <input
                type="radio"
                name="not-found-reason"
                value={opt.value}
                checked={reason === opt.value}
                onChange={() => setReason(opt.value)}
              />
              <span className="stk-radio-dot" aria-hidden="true" />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="stk-field">
        <span className="stk-field-label">
          Observação{reasonOther && <span className="stk-required-mark">*</span>}
        </span>
        <textarea
          className="stk-textarea"
          placeholder={reasonOther ? 'Descreva o motivo (obrigatório).' : 'Detalhes opcionais sobre o item.'}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={400}
        />
        <span className="stk-field-hint">{note.length}/400</span>
      </div>
    </StockistModal>
  );
}
