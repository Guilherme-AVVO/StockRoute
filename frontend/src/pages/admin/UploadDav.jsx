// Página ADMIN para upload visual de DAV.
// Nesta etapa, o processamento é simulado até existir endpoint real no backend.
import { useRef, useState } from 'react';
import './UploadDav.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Dados temporários usados apenas para montar a tela.
// Quando a API de upload DAV estiver pronta, substituir por chamada real ao backend.
const RECENT_DAVS = [
  {
    dav: '0000000113110',
    cliente: 'Projete Planejados',
    enviadoEm: 'Hoje 09:42',
    status: 'Aguardando revisão',
    statusClass: 'aguardando-revisao',
    itens: 16,
    pendencias: '3 sem vínculo',
    acao: 'Revisar',
  },
  {
    dav: '0000000113108',
    cliente: 'Marcenaria Lopes',
    enviadoEm: 'Hoje 08:15',
    status: 'Em separação',
    statusClass: 'em-separacao',
    itens: 22,
    pendencias: '0',
    acao: 'Acompanhar',
  },
  {
    dav: '0000000113105',
    cliente: 'Móveis Sob Medida ME',
    enviadoEm: 'Ontem',
    status: 'Observação',
    statusClass: 'observacao',
    itens: 9,
    pendencias: '1 item ausente',
    acao: 'Resolver',
  },
  {
    dav: '0000000113101',
    cliente: 'Casa & Cia Decorações',
    enviadoEm: '11/05/2026',
    status: 'Concluído',
    statusClass: 'concluido',
    itens: 31,
    pendencias: '0',
    acao: 'Ver',
  },
];

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

  // Estado do arquivo selecionado pelo botão ou pelo drag-and-drop.
  const [selectedFile, setSelectedFile] = useState(null);

  // Estado de drag ativo para destacar visualmente a área de upload.
  const [isDragActive, setIsDragActive] = useState(false);
  const [feedback, setFeedback] = useState(null);

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

  // Simulação temporária do processamento; integrar com a chamada real quando o endpoint existir.
  function handleProcessDav() {
    if (!selectedFile) return;
    showFeedback(
      'success',
      'PDF selecionado com sucesso. A integração com o processamento real será feita na próxima etapa.',
    );
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
                <button className="btn btn-secondary btn-sm" type="button" onClick={handleRemoveFile}>
                  Remover
                </button>
                <button className="btn btn-primary btn-sm" type="button" onClick={handleProcessDav}>
                  Processar DAV
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

        <table className="upload-dav-table">
          <thead>
            <tr>
              <th>DAV</th>
              <th>Cliente</th>
              <th>Enviado em</th>
              <th>Status</th>
              <th>Itens</th>
              <th>Pendências</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_DAVS.map((dav) => (
              <tr key={dav.dav}>
                <td><span className="dav-id">{dav.dav}</span></td>
                <td><span className="client-name">{dav.cliente}</span></td>
                <td><span className="upload-dav-date">{dav.enviadoEm}</span></td>
                <td>
                  <span className={`upload-dav-status ${dav.statusClass}`}>
                    {dav.status}
                  </span>
                </td>
                <td>
                  <span className="counts">
                    <span className="num">{dav.itens}</span> itens
                  </span>
                </td>
                <td>
                  <span className={`pending-pill${dav.pendencias === '0' ? ' zero' : ''}`}>
                    {dav.pendencias}
                  </span>
                </td>
                <td>
                  <button className="upload-dav-action" type="button">
                    {dav.acao}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="upload-dav-mobile-list">
          {RECENT_DAVS.map((dav) => (
            <article className="upload-dav-mobile-card" key={dav.dav}>
              <div className="upload-dav-mobile-head">
                <div>
                  <span className="dav-id">{dav.dav}</span>
                  <strong>{dav.cliente}</strong>
                </div>
                <span className={`upload-dav-status ${dav.statusClass}`}>
                  {dav.status}
                </span>
              </div>
              <div className="upload-dav-mobile-grid">
                <div>
                  <span>Enviado em</span>
                  <strong>{dav.enviadoEm}</strong>
                </div>
                <div>
                  <span>Itens</span>
                  <strong>{dav.itens}</strong>
                </div>
                <div>
                  <span>Pendências</span>
                  <strong>{dav.pendencias}</strong>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" type="button">
                {dav.acao}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
