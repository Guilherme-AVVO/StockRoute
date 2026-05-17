import { useState, useEffect, useRef } from 'react';
import StockistModal from './StockistModal.jsx';

// Modal de confirmação de coleta com captura de foto.
// - usa <input type="file" accept="image/*" capture="environment"> para abrir
//   diretamente a câmera traseira no celular;
// - botão "Confirmar coleta" fica desabilitado enquanto não houver foto;
// - permite trocar a foto antes de confirmar;
// - nesta etapa a foto NÃO é enviada para o backend, fica apenas no state local.
export default function CollectItemModal({ open, onClose, item, onConfirm }) {
  const [photoUrl, setPhotoUrl] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const inputRef = useRef(null);

  // Limpa o estado interno toda vez que o modal fecha ou troca de item.
  useEffect(() => {
    if (!open) {
      // libera o objectURL para não vazar memória
      if (photoUrl) URL.revokeObjectURL(photoUrl);
      setPhotoUrl(null);
      setPhotoFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item?.id]);

  if (!item) return null;

  function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    setPhotoFile(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function handleReplace() {
    inputRef.current?.click();
  }

  function handleConfirm() {
    if (!photoFile) return;
    onConfirm?.({
      itemId: item.id,
      photoFile,
      photoUrl,
      capturedAt: new Date().toISOString(),
    });
  }

  const canConfirm = Boolean(photoFile);

  return (
    <StockistModal
      open={open}
      onClose={onClose}
      title="Confirmar coleta"
      subtitle="Tire uma foto do item coletado para registrar evidência."
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Confirmar coleta
          </button>
        </>
      )}
    >
      <div className="stk-product-block">
        <div className="stk-product-block-thumb">
          {item.referencePhotoUrl ? (
            <img src={item.referencePhotoUrl} alt="" />
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="8.5" cy="10.5" r="1.6" stroke="currentColor" strokeWidth="1.6" />
              <path d="M21 17l-5-5-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
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

      {!photoUrl ? (
        <label className="stk-photo-capture stk-photo-trigger">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePick}
          />
          <span className="stk-photo-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </span>
          <span className="stk-photo-title">Tirar foto da coleta</span>
          <span className="stk-photo-sub">Abre a câmera traseira do celular. A foto vale como evidência da coleta.</span>
          <span className="stk-btn stk-btn-secondary stk-btn-sm" style={{ marginTop: 4 }}>
            Selecionar foto
          </span>
        </label>
      ) : (
        <div className="stk-photo-capture has-photo">
          <img src={photoUrl} alt="Prévia da foto de coleta" />
          <div className="stk-photo-capture-actions">
            <button type="button" className="stk-btn stk-btn-secondary stk-btn-sm" onClick={handleReplace}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Trocar foto
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePick}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      )}

      {!canConfirm && (
        <p className="stk-field-hint" style={{ marginTop: 10 }}>
          A foto é obrigatória para confirmar a coleta.
        </p>
      )}
    </StockistModal>
  );
}
