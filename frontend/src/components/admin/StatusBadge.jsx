// Componente de badge de status para pedidos/DAVs.
// Mapeia a string de status para a classe CSS correspondente do design.
import './StatusBadge.css';

// Mapa de status → classe CSS e texto exibido
const STATUS_MAP = {
  rascunho:      { label: 'Rascunho' },
  aguardando:    { label: 'Aguardando' },
  'em-separacao':{ label: 'Em separação' },
  concluido:     { label: 'Concluído' },
  observacao:    { label: 'Observação' },
  cancelado:     { label: 'Cancelado' },
};

export default function StatusBadge({ status }) {
  const info = STATUS_MAP[status] ?? { label: status };
  return (
    <span className={`badge ${status}`}>
      {info.label}
    </span>
  );
}
