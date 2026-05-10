// Card de itens ignorados do DAV — exibição para auditoria do ADMIN.
// Regra: itens ignorados nunca são enviados ao estoquista, mas ficam registrados.
// TODO: substituir dados mockados por chamada real à API de ignored_dav_items.
import './IgnoredDavItemsCard.css';

// Dados mockados — integração real pendente (endpoint /admin/ignored-dav-items)
const MOCK_IGNORED = [
  { code: 'SERV-CORTE', desc: 'Serviço de corte sob medida', tag: 'Auto' },
  { code: 'FAB-INT',    desc: 'Item interno de fábrica',     tag: 'Auto' },
  { code: 'PROC-EMB',  desc: 'Processo de embalagem',       tag: 'Auto' },
];

export default function IgnoredDavItemsCard() {
  return (
    <div className="card side-card ignored-card">
      <div className="ignored-header">
        <div>
          <h3>Itens ignorados do DAV</h3>
          <div className="sub">
            Itens de fábrica ou serviços que não vão para o estoquista, mas continuam
            registrados para auditoria.
          </div>
        </div>
      </div>

      {MOCK_IGNORED.map((item) => (
        <div key={item.code} className="ignored-item">
          <div>
            <div className="ignored-code">{item.code}</div>
            <div className="ignored-desc">{item.desc}</div>
          </div>
          <span className="ignored-tag">{item.tag}</span>
        </div>
      ))}

      <button className="btn btn-secondary btn-sm ignored-manage-btn" type="button">
        Gerenciar ignorados
      </button>
    </div>
  );
}
