import { useState, useEffect } from 'react';
import StockistModal from './StockistModal.jsx';
import { NOT_FOUND_REASONS } from '../../pages/stockist/stockistFormat.js';

// Modal de "Não encontrado".
// - motivo é obrigatório;
// - se motivo for "Outro", a observação textual também é obrigatória;
// - o item só é marcado como NAO_ENCONTRADO após o sucesso da chamada à API
//   (a responsabilidade do envio fica no pai, via onConfirm).
export default function NotFoundModal({ open, onClose, item, onConfirm, busy }) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!open) {
      setReason('');
      setNote('');
    }
  }, [open, item?.id]);

  if (!item) return null;

  const reasonOther = reason === 'Outro';
  const canConfirm = !!reason && (!reasonOther || note.trim().length >= 3) && !busy;

  function handleConfirm() {
    if (!canConfirm) return;
    onConfirm?.({
      itemId: item.id,
      reason,
      notes: note.trim(),
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
          <button type="button" className="stk-btn stk-btn-secondary" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button
            type="button"
            className="stk-btn stk-btn-primary"
            onClick={handleConfirm}
            disabled={!canConfirm}
            aria-disabled={!canConfirm}
          >
            {busy ? 'Enviando…' : 'Confirmar'}
          </button>
        </>
      )}
    >
      <div className="stk-product-block">
        <div className="stk-product-block-info">
          <p className="stk-product-block-name">{item.productName}</p>
          <div className="stk-product-block-meta">
            <span><b>Qtd:</b> {item.quantity} {item.unit}</span>
            <span><b>SKU:</b> {item.sku}</span>
            {item.manufacturerName      && <span><b>Fab.:</b> {item.manufacturerName}</span>}
            {item.manufacturerReference && <span><b>Ref.:</b> {item.manufacturerReference}</span>}
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
