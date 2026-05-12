import { useRef, useState, useEffect } from 'react';
import { importDav, listOrders } from '../../services/orderService.js';
import './UploadDav.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const STATUS_LABEL = {
  PENDING:     { label: 'Aguardando revisão', cls: 'aguardando-revisao' },
  IN_PROGRESS: { label: 'Em separação',       cls: 'em-separacao' },
  COMPLETED:   { label: 'Concluído',          cls: 'concluido' },
  CANCELLED:   { label: 'Cancelado',          cls: 'observacao' },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const FLOW_STEPS = [
  'Upload do PDF',
  'Extração dos dados do DAV',
  'Comparação com catálogo',
  'Revisão do ADMIN',
  'Publicação para o estoquista',
];

const UPLOAD_RULES = [
  'Formato aceito: PDF',
  'Tamanho máximo: 10 MB',
  'PDFs escaneados podem não ser lidos corretamente',
  'O arquivo será analisado antes de gerar a revisão',
  'Itens sem vínculo irão para revisão ADMIN',
];

function PdfUploadIcon() {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
        stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M14 3v6h6M12 13v5M9.5 15.5 12 13l2.5 2.5"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export default function UploadDav() {
  const fileInputRef = useRef(null);
  const recentDavsRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    listOrders()
      .then(setOrders)
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  }, []);

  function reloadOrders() {
    listOrders().then(setOrders).catch(() => {});
  }

  function showFeedback(type, message) {
    setFeedback({ type, message });
  }

  // Validação do arquivo: apenas um PDF com tamanho máximo de 10 MB.
  function validateAndSetFile(files) {
    setFeedback(null);

    if (!files?.length) return;

    if (files.length > 1) {
      setSelectedFile(null);
      showFeedback('error', 'Envie apenas um PDF por vez.');
      return;
    }

    const incomingFile = files[0];
    const isPdf = incomingFile.type === 'application/pdf' || /\.pdf$/i.test(incomingFile.name);

    if (!isPdf) {
      setSelectedFile(null);
      showFeedback('error', 'Envie apenas arquivos PDF.');
      return;
    }

    if (incomingFile.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      showFeedback('error', 'O arquivo deve ter no máximo 10 MB.');
      return;
    }

    setSelectedFile(incomingFile);
    showFeedback('success', 'Arquivo pronto para processar.');
  }

  function handleInputChange(event) {
    validateAndSetFile(event.target.files);
  }

  function handleSelectClick() {
    fileInputRef.current?.click();
  }

  function handleRemoveFile() {
    setSelectedFile(null);
    setFeedback(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    setIsDragActive(false);
    validateAndSetFile(event.dataTransfer.files);
  }

  async function handleProcessDav() {
    if (!selectedFile || uploading) return;
    setUploading(true);
    setFeedback(null);
    try {
      const data = await importDav(selectedFile);
      showFeedback(
        'success',
        `DAV ${data.orderNumber} importado — ${data.counts.found} vinculados, ${data.counts.unlinked} sem vínculo, ${data.counts.ignored} ignorados.`,
      );
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      reloadOrders();
    } catch (err) {
      showFeedback('error', err.message || 'Erro ao processar DAV');
    } finally {
      setUploading(false);
    }
  }

  function scrollToRecentDavs() {
    recentDavsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const dropzoneClassName = [
    'upload-dav-dropzone',
    isDragActive ? 'drag-active' : '',
    feedback?.type === 'error' ? 'has-error' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="upload-dav-page">
      {/* Estrutura principal da tela */}
      <section className="hero upload-dav-hero">
        <div>
          <h1>Upload DAV</h1>
          <p>
            Envie o PDF do pedido para iniciar a extração dos itens e preparar a lista de picking.
          </p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" type="button" onClick={scrollToRecentDavs}>
            Ver DAVs recentes
          </button>
        </div>
      </section>

      <section className="upload-dav-grid">
        <div className="card upload-dav-main-card">
          <div
            className={dropzoneClassName}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              className="upload-dav-input"
              type="file"
              accept="application/pdf,.pdf"
              onChange={handleInputChange}
              aria-label="Selecionar PDF do DAV"
            />
            <div className="upload-dav-icon">
              <PdfUploadIcon />
            </div>
            <h2>Arraste o PDF do DAV aqui</h2>
            <p>ou clique para selecionar um arquivo</p>
            <span>Apenas arquivos .pdf até 10 MB</span>
            <button className="btn btn-primary" type="button" onClick={handleSelectClick}>
              Selecionar PDF
            </button>
          </div>

          {feedback && (
            <div className={`upload-dav-feedback ${feedback.type}`} role="status">
              {feedback.message}
            </div>
          )}

          {selectedFile && (
            <div className="upload-dav-file-card">
              <div className="upload-dav-file-icon">
                <PdfUploadIcon />
              </div>
              <div className="upload-dav-file-info">
                <strong>{selectedFile.name}</strong>
                <span>{formatFileSize(selectedFile.size)}</span>
              </div>
              <span className="upload-dav-ready-badge">Pronto para processar</span>
              <div className="upload-dav-file-actions">
                <button className="btn btn-secondary btn-sm" type="button" onClick={handleRemoveFile} disabled={uploading}>
                  Remover
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={handleProcessDav} disabled={uploading}>
                  {uploading ? 'Processando…' : 'Processar DAV'}
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="upload-dav-side">
          <div className="card upload-dav-info-card">
            <h2>Como funciona</h2>
            <ol className="upload-dav-flow">
              {FLOW_STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p>
              O sistema transforma o DAV em uma lista de picking validada. Apenas produtos
              cadastrados seguem para o estoquista.
            </p>
          </div>

          <div className="card upload-dav-info-card">
            <h2>Regras do upload</h2>
            <ul className="upload-dav-rules">
              {UPLOAD_RULES.map((rule) => (
                <li key={rule}>{rule}</li>
              ))}
            </ul>
          </div>
        </aside>
      </section>

      <section ref={recentDavsRef} className="card upload-dav-recent-card">
        <div className="upload-dav-table-head">
          <div>
            <h2>DAVs recentes</h2>
            <p>Acompanhe os últimos arquivos enviados para processamento.</p>
          </div>
        </div>

        {ordersLoading ? (
          <div className="upload-dav-empty">Carregando…</div>
        ) : orders.length === 0 ? (
          <div className="upload-dav-empty">Nenhum DAV importado ainda.</div>
        ) : (
          <>
            <table className="upload-dav-table">
              <thead>
                <tr>
                  <th>DAV</th>
                  <th>Cliente</th>
                  <th>Enviado em</th>
                  <th>Status</th>
                  <th>Itens</th>
                  <th>Sem vínculo</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const st = STATUS_LABEL[order.status] ?? { label: order.status, cls: '' };
                  const unlinked = order.totalItems - (order.pickedItems + order.missingItems + order.partialItems);
                  return (
                    <tr key={order.id}>
                      <td><span className="dav-id">{order.orderNumber}</span></td>
                      <td><span className="client-name">{order.customerName}</span></td>
                      <td><span className="upload-dav-date">{formatDate(order.createdAt)}</span></td>
                      <td>
                        <span className={`upload-dav-status ${st.cls}`}>{st.label}</span>
                      </td>
                      <td>
                        <span className="counts">
                          <span className="num">{order.totalItems}</span> itens
                        </span>
                      </td>
                      <td>
                        <span className={`pending-pill${unlinked === 0 ? ' zero' : ''}`}>
                          {unlinked > 0 ? `${unlinked} sem vínculo` : '0'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <div className="upload-dav-mobile-list">
              {orders.map((order) => {
                const st = STATUS_LABEL[order.status] ?? { label: order.status, cls: '' };
                return (
                  <article className="upload-dav-mobile-card" key={order.id}>
                    <div className="upload-dav-mobile-head">
                      <div>
                        <span className="dav-id">{order.orderNumber}</span>
                        <strong>{order.customerName}</strong>
                      </div>
                      <span className={`upload-dav-status ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="upload-dav-mobile-grid">
                      <div>
                        <span>Enviado em</span>
                        <strong>{formatDate(order.createdAt)}</strong>
                      </div>
                      <div>
                        <span>Itens</span>
                        <strong>{order.totalItems}</strong>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
