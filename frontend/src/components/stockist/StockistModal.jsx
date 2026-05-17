import { useEffect } from 'react';
import './StockistModal.css';

// Wrapper genérico de modal/bottom-sheet usado por todos os modais do estoquista.
// Fecha com ESC e com clique no backdrop.
export default function StockistModal({ open, onClose, title, subtitle, children, footer, footerRow = true }) {
  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose?.(); }
    document.addEventListener('keydown', onKey);
    // trava scroll do body enquanto o modal está aberto
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="stk-modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="stk-modal">
        <div className="stk-modal-grabber" />
        <div className="stk-modal-header">
          <div style={{ flex: 1 }}>
            <h2 className="stk-modal-title">{title}</h2>
            {subtitle && <p className="stk-modal-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="stk-modal-close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="stk-modal-body">{children}</div>

        {footer && (
          <div className={`stk-modal-footer${footerRow ? ' row' : ''}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
