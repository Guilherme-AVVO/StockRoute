// Tabela de DAVs recentes com versão desktop (table) e mobile (cards).
// TODO: substituir MOCK_DAVS por chamada real à API quando endpoint estiver disponível.
import StatusBadge from './StatusBadge.jsx';
import './RecentDavTable.css';

// Dados mockados — integração real pendente
const MOCK_DAVS = [
  {
    id: '0000000113110',
    cliente: 'Projete Planejados',
    entrega: '13/05/2026',
    status: 'aguardando',
    itens: 16,
    pendencia: '3 sem vínculo',
    acao: 'Revisar →',
  },
  {
    id: '0000000113108',
    cliente: 'Marcenaria Lopes',
    entrega: '12/05/2026',
    status: 'em-separacao',
    itens: 22,
    pendencia: null,
    acao: 'Acompanhar →',
  },
  {
    id: '0000000113105',
    cliente: 'Móveis Sob Medida ME',
    entrega: '12/05/2026',
    status: 'observacao',
    itens: 9,
    pendencia: '1 item ausente',
    acao: 'Resolver →',
  },
  {
    id: '0000000113101',
    cliente: 'Casa & Cia Decorações',
    entrega: '11/05/2026',
    status: 'concluido',
    itens: 31,
    pendencia: null,
    acao: 'Ver →',
  },
  {
    id: '0000000113098',
    cliente: 'Fragoso Móveis Planejados',
    entrega: '11/05/2026',
    status: 'rascunho',
    itens: 7,
    pendencia: '2 sem vínculo',
    acao: 'Continuar →',
  },
];

// Filtros de status para a tabela
const FILTERS = ['Todos', 'Aguardando', 'Em separação', 'Observação'];

export default function RecentDavTable() {
  return (
    <div className="card table-card">
      <div className="table-head">
        <div>
          <h2>Últimos DAVs enviados</h2>
          <p>Acompanhe o status e pendências dos pedidos recentes</p>
        </div>
        <div className="table-filters">
          {FILTERS.map((f, i) => (
            <button key={f} className={`chip-filter${i === 0 ? ' active' : ''}`} type="button">
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Versão desktop */}
      <table className="responsive-table">
        <thead>
          <tr>
            <th>DAV</th>
            <th>Cliente</th>
            <th>Entrega</th>
            <th>Status</th>
            <th>Itens</th>
            <th>Pendências</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {MOCK_DAVS.map((dav) => (
            <tr key={dav.id}>
              <td><span className="dav-id">{dav.id}</span></td>
              <td><span className="client-name">{dav.cliente}</span></td>
              <td><span className="delivery">{dav.entrega}</span></td>
              <td><StatusBadge status={dav.status} /></td>
              <td>
                <span className="counts">
                  <span className="num">{dav.itens}</span> itens
                </span>
              </td>
              <td>
                {dav.pendencia ? (
                  <span className="pending-pill">{dav.pendencia}</span>
                ) : (
                  <span className="pending-pill zero">0</span>
                )}
              </td>
              <td><a className="action-link" href="#action">{dav.acao}</a></td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Versão mobile — cards */}
      <div className="mobile-cards">
        {MOCK_DAVS.map((dav) => (
          <div key={dav.id} className="dav-mcard">
            <div className="dav-mcard-head">
              <div>
                <div className="dav-id">{dav.id}</div>
                <div className="client-name dav-mcard-client">{dav.cliente}</div>
              </div>
              <StatusBadge status={dav.status} />
            </div>
            <div className="dav-mcard-grid">
              <div>
                <div className="k">Entrega</div>
                <div className="v">{dav.entrega}</div>
              </div>
              <div>
                <div className="k">Itens</div>
                <div className="v">{dav.itens}</div>
              </div>
              {dav.pendencia && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div className="k">Pendências</div>
                  <div className="v">
                    <span className="pending-pill">{dav.pendencia}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="dav-mcard-actions">
              <button className="btn btn-primary btn-sm" type="button">
                {dav.acao.replace(' →', '')}
              </button>
              <button className="btn btn-secondary btn-sm" type="button">Detalhes</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
