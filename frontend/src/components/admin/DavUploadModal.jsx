// Modal de upload de DAV com drag-and-drop.
// Validações: apenas PDF, máximo 10 MB.
// TODO: implementar envio real para o backend quando endpoint estiver disponível.
import { useState, useRef, useEffect, useCallback } from 'react';
import './DavUploadModal.css';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

// Formata bytes em string legível (KB / MB)
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// Ícone de PDF reutilizável
function PdfIcon({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

export default function DavUploadModal({ isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);       // mensagem de erro de validação
  const [success, setSuccess] = useState(false);   // flag de envio simulado
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Fecha com ESC
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Trava o scroll do body enquanto o modal estiver aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Limpa estado ao fechar
  function handleClose() {
    setFile(null);
    setError(null);
    setSuccess(false);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    onClose();
  }

  // Valida e aplica o arquivo escolhido
  const handleFile = useCallback((incoming) => {
    setError(null);
    setSuccess(false);

    const isPdf = incoming.type === 'application/pdf' || /\.pdf$/i.test(incoming.name);
    if (!isPdf) {
      setFile(null);
      setError('Envie apenas arquivos PDF.');
      return;
    }
    if (incoming.size > MAX_SIZE) {
      setFile(null);
      setError('O arquivo deve ter no máximo 10 MB.');
      return;
    }

    setFile(incoming);
  }, []);

  // Input de arquivo
  function onInputChange(e) {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  }

  // Remove arquivo selecionado
  function resetFile() {
    setFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  // Drag events no dropzone
  function onDragEnter(e) { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }
  function onDragOver(e)  { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }
  function onDragLeave(e) { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }
  function onDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (!files?.length) return;
    if (files.length > 1) { setError('Envie apenas um PDF por vez.'); return; }
    handleFile(files[0]);
  }

  // Envio simulado — integrar com API real futuramente
  function submitDav() {
    if (!file) return;
    setSuccess(true);
    setTimeout(handleClose, 1800);
  }

  const dropzoneClass = [
    'dropzone',
    isDragOver    ? 'dragover'  : '',
    error && !file ? 'has-error' : '',
  ].filter(Boolean).join(' ');

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-title"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" id="upload-modal">
        {/* Cabeçalho */}
        <div className="modal-head">
          <div>
            <h2 id="upload-title">Enviar novo DAV</h2>
            <div className="sub">
              Arraste o PDF do pedido ou selecione um arquivo para iniciar a extração.
            </div>
          </div>
          <button className="modal-close" type="button" onClick={handleClose} aria-label="Fechar modal">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Corpo */}
        <div className="modal-body">
          {/* Dropzone — oculto quando há arquivo válido */}
          {!file && (
            <div
              className={dropzoneClass}
              onDragEnter={onDragEnter}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              tabIndex={0}
            >
              <div className="dz-icon"><PdfIcon size={28} /></div>
              <div className="dz-title">Arraste o PDF aqui</div>
              <div className="dz-sub">ou clique para selecionar um arquivo</div>
              <div className="dz-hint">Apenas arquivos .pdf até 10 MB</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                aria-label="Selecionar PDF do DAV"
                onChange={onInputChange}
              />
            </div>
          )}

          {/* Card do arquivo selecionado */}
          {file && (
            <div className="file-card">
              <span className="file-icon"><PdfIcon size={22} /></span>
              <div>
                <div className="file-name">{file.name}</div>
                <div className="file-meta">
                  <span>{formatSize(file.size)}</span>
                  <span>·</span>
                  <span className="file-status">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Arquivo pronto para envio
                  </span>
                </div>
              </div>
              <button className="file-remove" type="button" onClick={resetFile} aria-label="Remover arquivo">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          )}

          {/* Mensagem de erro de validação */}
          {error && (
            <div className="modal-error">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Mensagem de sucesso (envio simulado) */}
          {success && (
            <div className="modal-success">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              PDF selecionado com sucesso. Upload real será integrado na próxima etapa.
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="modal-foot">
          <button className="btn btn-secondary" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={!file || success}
            onClick={submitDav}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Enviar DAV
          </button>
        </div>
      </div>
    </div>
  );
}
