// Componente de badge de status para pedidos/DAVs.
// Mapeia a string de status para a classe CSS correspondente do design.
import './StatusBadge.css';

// Mapa de status → classe CSS e texto exibido.
// Aceita tanto statuses do banco (PENDING, IN_PROGRESS, COMPLETED, CANCELLED)
// quanto as strings legadas da UI (aguardando, em-separacao, etc.).
const STATUS_MAP = {
  PENDING:        { label: 'Aguardando revisão', cls: 'aguardando' },
  IN_PROGRESS:    { label: 'Em separação',       cls: 'em-separacao' },
  COMPLETED:      { label: 'Concluído',          cls: 'concluido' },
  CANCELLED:      { label: 'Cancelado',          cls: 'cancelado' },
  rascunho:       { label: 'Rascunho',           cls: 'rascunho' },
  aguardando:     { label: 'Aguardando',         cls: 'aguardando' },
  'em-separacao': { label: 'Em separação',       cls: 'em-separacao' },
  concluido:      { label: 'Concluído',          cls: 'concluido' },
  observacao:     { label: 'Observação',         cls: 'observacao' },
  cancelado:      { label: 'Cancelado',          cls: 'cancelado' },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] ?? { label: status, cls: '' };
  return (
    <span className={`badge ${info.cls ?? status}`}>
      {info.label}
    </span>
  );
}
