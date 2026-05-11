// Página ADMIN de Itens ignorados.
// Gerencia visualmente regras que impedem itens DAV de irem para o picking.
import { useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import './AdminIgnoredItems.css';

// Dados temporários usados apenas para montar a interface.
// Quando as APIs estiverem prontas, substituir por chamadas reais ao backend.
const INITIAL_RULES = [
  {
    id: 1,
    sku: 'SERV-CORTE',
    descricao: 'Serviço de corte sob medida',
    tipo: 'Serviço',
    tipoKey: 'servico',
    motivo: 'Item da fábrica, não exige separação física',
    criadoPor: 'Rafael Costa',
    usadoEm: 28,
    status: 'Ativo',
    ultimoUso: 'Hoje 09:42',
  },
  {
    id: 2,
    sku: 'FAB-INT',
    descricao: 'Item interno de fábrica',
    tipo: 'Fábrica',
    tipoKey: 'fabrica',
    motivo: 'Processo interno da produção',
    criadoPor: 'Rafael Costa',
    usadoEm: 17,
    status: 'Ativo',
    ultimoUso: 'Ontem',
  },
  {
    id: 3,
    sku: 'FURACAO',
    descricao: 'Serviço de furação',
    tipo: 'Serviço',
    tipoKey: 'servico',
    motivo: 'Serviço executado na fábrica',
    criadoPor: 'ADMIN',
    usadoEm: 9,
    status: 'Ativo',
    ultimoUso: '10/05/2026',
  },
  {
    id: 4,
    sku: 'BENEF-MDF',
    descricao: 'Beneficiamento MDF',
    tipo: 'Processo interno',
    tipoKey: 'processo',
    motivo: 'Não é item físico de estoque',
    criadoPor: 'ADMIN',
    usadoEm: 12,
    status: 'Ativo',
    ultimoUso: '09/05/2026',
  },
  {
    id: 5,
    sku: 'ENTREGA-LOCAL',
    descricao: 'Taxa de entrega local',
    tipo: 'Outro',
    tipoKey: 'outro',
    motivo: 'Não deve entrar no picking',
    criadoPor: 'Rafael Costa',
    usadoEm: 4,
    status: 'Desativado',
    ultimoUso: '01/05/2026',
  },
];

const TYPE_OPTIONS = ['Serviço', 'Fábrica', 'Processo interno', 'Outro'];

const FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Ativos' },
  { id: 'inactive', label: 'Desativados' },
  { id: 'servico', label: 'Serviços' },
  { id: 'fabrica', label: 'Fábrica' },
  { id: 'processo', label: 'Processo interno' },
  { id: 'most-used', label: 'Mais usados' },
];

const EMPTY_FORM = {
  sku: '',
  descricao: '',
  tipo: 'Serviço',
  motivo: '',
  active: true,
};

const IGNORED_STATS = [
  {
    label: 'Regras ativas',
    value: '84',
    description: 'Itens ignorados automaticamente',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M9 3h12v12M3 9v12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: 'Ignorados hoje',
    value: '14',
    description: 'Ocorrências em DAVs processados',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    label: 'Criadas este mês',
    value: '8',
    description: 'Novas regras cadastradas',
    iconStyle: { background: 'var(--primary-fixed)', color: 'var(--primary)' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'Desativadas',
    value: '3',
    description: 'Regras pausadas',
    iconStyle: { background: '#ececf5', color: '#6a6a78' },
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
];

function getTipoKey(tipo) {
  if (tipo === 'Serviço') return 'servico';
  if (tipo === 'Fábrica') return 'fabrica';
  if (tipo === 'Processo interno') return 'processo';
  return 'outro';
}

function TypeBadge({ type, typeKey }) {
  return <span className={`ignored-type ${typeKey}`}>{type}</span>;
}

function StatusBadge({ status }) {
  const statusKey = status === 'Ativo' ? 'active' : 'inactive';
  return <span className={`ignored-status ${statusKey}`}>{status}</span>;
}

export default function AdminIgnoredItems() {
  // Lista local permite simular criação, edição e mudança de status sem backend.
  const [rules, setRules] = useState(INITIAL_RULES);

  // Filtros e busca locais.
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modais de criação, edição, visualização e confirmação.
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [feedback, setFeedback] = useState(null);

  const filteredRules = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rules.filter((rule) => {
      const matchesFilter =
        activeFilter === 'all'
        || (activeFilter === 'active' && rule.status === 'Ativo')
        || (activeFilter === 'inactive' && rule.status === 'Desativado')
        || (activeFilter === 'most-used' && rule.usadoEm >= 10)
        || rule.tipoKey === activeFilter;

      const matchesSearch = !normalizedSearch
        || rule.sku.toLowerCase().includes(normalizedSearch)
        || rule.descricao.toLowerCase().includes(normalizedSearch)
        || rule.motivo.toLowerCase().includes(normalizedSearch);

      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, rules, search]);

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setFeedback(null);
    setModal({ type: 'create' });
  }

  function openEditModal(rule) {
    setFormData({
      sku: rule.sku,
      descricao: rule.descricao,
      tipo: rule.tipo,
      motivo: rule.motivo,
      active: rule.status === 'Ativo',
    });
    setFormError(null);
    setFeedback(null);
    setModal({ type: 'edit', rule });
  }

  function openViewModal(rule) {
    setFeedback(null);
    setModal({ type: 'view', rule });
  }

  function openStatusModal(rule) {
    setFeedback(null);
    setModal({ type: 'status', rule });
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  function handleFormChange(event) {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  // Ações visuais mantêm auditoria: motivo é obrigatório e nada é removido silenciosamente.
  function saveRule(event) {
    event.preventDefault();
    setFormError(null);

    if (!formData.sku.trim() || !formData.descricao.trim() || !formData.motivo.trim()) {
      setFormError('Preencha SKU/identificador, descrição e motivo.');
      return;
    }

    if (modal?.type === 'edit') {
      setRules((current) => current.map((rule) => (
        rule.id === modal.rule.id
          ? {
              ...rule,
              sku: formData.sku.trim(),
              descricao: formData.descricao.trim(),
              tipo: formData.tipo,
              tipoKey: getTipoKey(formData.tipo),
              motivo: formData.motivo.trim(),
              status: formData.active ? 'Ativo' : 'Desativado',
            }
          : rule
      )));
      setFeedback('Regra atualizada visualmente. Integração com backend será feita na próxima etapa.');
      closeModal();
      return;
    }

    const newRule = {
      id: Date.now(),
      sku: formData.sku.trim(),
      descricao: formData.descricao.trim(),
      tipo: formData.tipo,
      tipoKey: getTipoKey(formData.tipo),
      motivo: formData.motivo.trim(),
      criadoPor: 'ADMIN',
      usadoEm: 0,
      status: formData.active ? 'Ativo' : 'Desativado',
      ultimoUso: 'Ainda não usada',
    };

    setRules((current) => [newRule, ...current]);
    setFeedback('Regra criada visualmente. Integração com backend será feita na próxima etapa.');
    closeModal();
  }

  function toggleStatus(rule) {
    const nextStatus = rule.status === 'Ativo' ? 'Desativado' : 'Ativo';
    setRules((current) => current.map((item) => (
      item.id === rule.id ? { ...item, status: nextStatus } : item
    )));
    setFeedback(`Regra ${nextStatus === 'Ativo' ? 'reativada' : 'desativada'} visualmente.`);
    closeModal();
  }

  function renderActions(rule) {
    return (
      <div className="ignored-actions">
        <button type="button" onClick={() => openViewModal(rule)}>Ver</button>
        {rule.status === 'Ativo' && (
          <button type="button" onClick={() => openEditModal(rule)}>Editar</button>
        )}
        <button type="button" onClick={() => openStatusModal(rule)}>
          {rule.status === 'Ativo' ? 'Desativar' : 'Reativar'}
        </button>
      </div>
    );
  }

  return (
    <div className="ignored-page">
      {/* Integração visual com sidebar: renderizada pela seção ativa "ignoredItems". */}
      <section className="hero ignored-hero">
        <div>
          <h1>Itens ignorados</h1>
          <p>Gerencie itens do DAV que não exigem separação física no estoque.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-primary" type="button" onClick={openCreateModal}>
            + Nova regra de ignorado
          </button>
        </div>
      </section>

      {feedback && (
        <div className="ignored-feedback" role="status">
          {feedback}
        </div>
      )}

      <section className="ignored-stats-grid">
        {IGNORED_STATS.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            value={stat.value}
            label={stat.label}
            description={stat.description}
            iconStyle={stat.iconStyle}
          />
        ))}
      </section>

      <section className="ignored-top-grid">
        <div className="card ignored-flow-card">
          <div>
            <h2>Como funciona</h2>
            <p>
              Quando um item do DAV está nesta lista, ele não será enviado para o estoquista,
              mas continuará registrado no pedido para auditoria.
            </p>
          </div>
          <div className="ignored-flow">
            <span>DAV recebido</span>
            <span>item extraído</span>
            <span>regra encontrada</span>
            <span>ignorado no picking</span>
            <span>registrado no histórico</span>
          </div>
        </div>

        <aside className="ignored-side">
          <div className="card ignored-side-card">
            <h2>Últimas aplicações</h2>
            <ul className="ignored-audit-list">
              <li><strong>SERV-CORTE</strong> aplicado no DAV 0000000113110 — Hoje 09:42</li>
              <li><strong>FURACAO</strong> aplicado no DAV 0000000113108 — Hoje 08:15</li>
              <li><strong>FAB-INT</strong> aplicado no DAV 0000000113105 — Ontem</li>
              <li><strong>BENEF-MDF</strong> aplicado no DAV 0000000113098 — 09/05/2026</li>
            </ul>
            <p>Itens ignorados não somem do sistema. Eles ficam registrados no histórico do pedido.</p>
          </div>

          <div className="card ignored-side-card ignored-safety-card">
            <h2>Regra de segurança operacional</h2>
            <p>
              Nenhum item deve ser ignorado silenciosamente. Toda regra precisa ter motivo e
              permanecer auditável.
            </p>
          </div>
        </aside>
      </section>

      <section className="card ignored-table-card">
        <div className="ignored-toolbar">
          {/* Filtros visuais locais */}
          <div className="ignored-filters" aria-label="Filtros de itens ignorados">
            {FILTERS.map((filter) => (
              <button
                className={`chip-filter${activeFilter === filter.id ? ' active' : ''}`}
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Busca local por SKU, descrição ou motivo */}
          <label className="ignored-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Buscar por SKU, descrição ou motivo..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {filteredRules.length === 0 ? (
          <div className="ignored-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p>Nenhuma regra encontrada para esta busca.</p>
          </div>
        ) : (
          <>
            <table className="ignored-table">
              <thead>
                <tr>
                  <th>SKU/Identificador</th>
                  <th>Descrição original</th>
                  <th>Tipo</th>
                  <th>Motivo</th>
                  <th>Criado por</th>
                  <th>Usado em pedidos</th>
                  <th>Status</th>
                  <th>Último uso</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td><span className="dav-id">{rule.sku}</span></td>
                    <td><span className="ignored-description">{rule.descricao}</span></td>
                    <td><TypeBadge type={rule.tipo} typeKey={rule.tipoKey} /></td>
                    <td><span className="ignored-reason">{rule.motivo}</span></td>
                    <td><span className="ignored-muted">{rule.criadoPor}</span></td>
                    <td><span className="counts"><span className="num">{rule.usadoEm}</span> pedidos</span></td>
                    <td><StatusBadge status={rule.status} /></td>
                    <td><span className="ignored-muted">{rule.ultimoUso}</span></td>
                    <td>{renderActions(rule)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ignored-mobile-list">
              {filteredRules.map((rule) => (
                <article className="ignored-mobile-card" key={rule.id}>
                  <div className="ignored-mobile-head">
                    <div>
                      <span className="dav-id">{rule.sku}</span>
                      <strong>{rule.descricao}</strong>
                    </div>
                    <StatusBadge status={rule.status} />
                  </div>
                  <div className="ignored-mobile-grid">
                    <div>
                      <span>Tipo</span>
                      <TypeBadge type={rule.tipo} typeKey={rule.tipoKey} />
                    </div>
                    <div>
                      <span>Usado em</span>
                      <strong>{rule.usadoEm} pedidos</strong>
                    </div>
                    <div>
                      <span>Último uso</span>
                      <strong>{rule.ultimoUso}</strong>
                    </div>
                    <div className="ignored-mobile-wide">
                      <span>Motivo</span>
                      <strong>{rule.motivo}</strong>
                    </div>
                  </div>
                  {renderActions(rule)}
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {modal && (
        <div
          className="ignored-modal-overlay open"
          role="dialog"
          aria-modal="true"
          onClick={(event) => { if (event.target === event.currentTarget) closeModal(); }}
        >
          <div className="ignored-modal card">
            <div className="ignored-modal-head">
              <div>
                <h2>
                  {modal.type === 'create' && 'Nova regra de ignorado'}
                  {modal.type === 'edit' && 'Editar regra'}
                  {modal.type === 'view' && 'Ver regra'}
                  {modal.type === 'status' && (modal.rule.status === 'Ativo' ? 'Desativar regra' : 'Reativar regra')}
                </h2>
                <p>
                  {modal.type === 'create' && 'Cadastre um item DAV que não deve ir para o picking.'}
                  {modal.type === 'edit' && `${modal.rule.sku} · ${modal.rule.descricao}`}
                  {modal.type === 'view' && `${modal.rule.sku} · ${modal.rule.descricao}`}
                  {modal.type === 'status' && 'Confirme a alteração visual de status desta regra.'}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {(modal.type === 'create' || modal.type === 'edit') && (
              <form className="ignored-form" onSubmit={saveRule}>
                <div className="ignored-form-grid">
                  <label>
                    <span>SKU/identificador</span>
                    <input name="sku" value={formData.sku} onChange={handleFormChange} />
                  </label>
                  <label>
                    <span>Descrição original</span>
                    <input name="descricao" value={formData.descricao} onChange={handleFormChange} />
                  </label>
                  <label>
                    <span>Tipo</span>
                    <select name="tipo" value={formData.tipo} onChange={handleFormChange}>
                      {TYPE_OPTIONS.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>
                  <label className="ignored-toggle">
                    <input
                      name="active"
                      type="checkbox"
                      checked={formData.active}
                      onChange={handleFormChange}
                    />
                    <span>Status ativo</span>
                  </label>
                  <label className="ignored-form-wide">
                    <span>Motivo</span>
                    <textarea name="motivo" value={formData.motivo} onChange={handleFormChange} rows="3" />
                  </label>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit">Salvar regra</button>
                </div>
              </form>
            )}

            {modal.type === 'view' && (
              <>
                <div className="ignored-modal-body">
                  <div className="ignored-rule-grid">
                    <span>SKU/identificador</span><strong>{modal.rule.sku}</strong>
                    <span>Descrição</span><strong>{modal.rule.descricao}</strong>
                    <span>Tipo</span><TypeBadge type={modal.rule.tipo} typeKey={modal.rule.tipoKey} />
                    <span>Motivo</span><strong>{modal.rule.motivo}</strong>
                    <span>Status</span><StatusBadge status={modal.rule.status} />
                    <span>Criado por</span><strong>{modal.rule.criadoPor}</strong>
                    <span>Aplicações</span><strong>{modal.rule.usadoEm} vezes</strong>
                    <span>Último uso</span><strong>{modal.rule.ultimoUso}</strong>
                    <p>
                      Este item não aparece para o estoquista, mas permanece registrado para auditoria.
                    </p>
                  </div>
                </div>
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
                </div>
              </>
            )}

            {modal.type === 'status' && (
              <>
                <div className="ignored-modal-body">
                  <div className="ignored-confirm-box">
                    <strong>{modal.rule.sku}</strong>
                    <p>
                      {modal.rule.status === 'Ativo'
                        ? 'Desativar uma regra impede que ela seja aplicada automaticamente nos próximos PDFs.'
                        : 'Reativar uma regra volta a aplicá-la automaticamente nos próximos PDFs.'}
                    </p>
                  </div>
                </div>
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="button" onClick={() => toggleStatus(modal.rule)}>
                    {modal.rule.status === 'Ativo' ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
