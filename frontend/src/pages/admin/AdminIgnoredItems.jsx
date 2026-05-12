import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  listIgnoredDavItems,
  createIgnoredDavItem,
  deactivateIgnoredDavItem,
} from '../../services/ignoredDavItemsService.js';
import './AdminIgnoredItems.css';

const FILTERS = [
  { id: 'all',      label: 'Todos' },
  { id: 'active',   label: 'Ativos' },
  { id: 'inactive', label: 'Desativados' },
];

const EMPTY_FORM = { rawSku: '', rawDescription: '', reason: '' };

// Dado temporário usado apenas enquanto a API real não está pronta.
// O backend ainda não possui histórico/auditoria de aplicação das regras.
const TEMP_AUDIT_ITEMS = [
  'SERV-CORTE aplicado no DAV 0000000113110 — Hoje 09:42',
  'FURACAO aplicado no DAV 0000000113108 — Hoje 08:15',
  'FAB-INT aplicado no DAV 0000000113105 — Ontem',
  'BENEF-MDF aplicado no DAV 0000000113098 — 09/05/2026',
];

const STAT_ICON_BLOCK = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 3h12v12M3 9v12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const STAT_ICON_OFF = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

function StatusBadge({ active }) {
  return (
    <span className={`ignored-status ${active ? 'active' : 'inactive'}`}>
      {active ? 'Ativo' : 'Desativado'}
    </span>
  );
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AdminIgnoredItems() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const reload = useCallback(() => {
    setLoading(true);
    listIgnoredDavItems({ includeInactive: true })
      .then(setRules)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const filteredRules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((rule) => {
      const matchesFilter =
        activeFilter === 'all'
        || (activeFilter === 'active'   && rule.active)
        || (activeFilter === 'inactive' && !rule.active);
      const matchesSearch = !q
        || rule.rawSku?.toLowerCase().includes(q)
        || rule.rawDescription?.toLowerCase().includes(q)
        || rule.reason?.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [activeFilter, rules, search]);

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setFormError(null);
    setModal({ type: 'create' });
  }

  function openViewModal(rule) { setModal({ type: 'view', rule }); }
  function openDeactivateModal(rule) { setModal({ type: 'deactivate', rule }); }

  function closeModal() {
    setModal(null);
    setFormError(null);
    setFormLoading(false);
  }

  function handleFormChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function saveRule(e) {
    e.preventDefault();
    setFormError(null);
    if (!formData.rawDescription.trim() || !formData.reason.trim()) {
      setFormError('Preencha a descrição e o motivo.');
      return;
    }
    setFormLoading(true);
    try {
      await createIgnoredDavItem(formData);
      setFeedback('Regra criada com sucesso.');
      closeModal();
      reload();
    } catch (err) {
      setFormError(err.message || 'Erro ao criar regra');
    } finally {
      setFormLoading(false);
    }
  }

  async function confirmDeactivate() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      await deactivateIgnoredDavItem(modal.rule.id);
      setFeedback('Regra desativada.');
      closeModal();
      reload();
    } catch (err) {
      setFeedback(err.message || 'Erro ao desativar regra');
      closeModal();
    }
  }

  function renderActions(rule) {
    return (
      <div className="ignored-actions">
        <button type="button" onClick={() => openViewModal(rule)}>Ver</button>
        {rule.active && (
          <button type="button" onClick={() => openDeactivateModal(rule)}>Desativar</button>
        )}
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
        <StatCard
          icon={STAT_ICON_BLOCK}
          value={rules.filter((r) => r.active).length}
          label="Regras ativas"
          description="Itens ignorados automaticamente"
        />
        <StatCard
          icon={STAT_ICON_OFF}
          value={rules.filter((r) => !r.active).length}
          label="Desativadas"
          description="Regras pausadas"
          iconStyle={{ background: '#ececf5', color: '#6a6a78' }}
        />
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
              {TEMP_AUDIT_ITEMS.map((item) => {
                const [identifier, rest] = item.split(' aplicado ');
                return (
                  <li key={item}>
                    <strong>{identifier}</strong> aplicado {rest}
                  </li>
                );
              })}
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

        {loading ? (
          <div className="ignored-empty"><p>Carregando…</p></div>
        ) : filteredRules.length === 0 ? (
          <div className="ignored-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p>Nenhuma regra encontrada.</p>
          </div>
        ) : (
          <>
            <table className="ignored-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Descrição</th>
                  <th>Motivo</th>
                  <th>Status</th>
                  <th>Criado em</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredRules.map((rule) => (
                  <tr key={rule.id}>
                    <td><span className="dav-id">{rule.rawSku ?? '—'}</span></td>
                    <td><span className="ignored-description">{rule.rawDescription ?? '—'}</span></td>
                    <td><span className="ignored-reason">{rule.reason}</span></td>
                    <td><StatusBadge active={rule.active} /></td>
                    <td><span className="ignored-muted">{formatDate(rule.createdAt)}</span></td>
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
                      <span className="dav-id">{rule.rawSku ?? '—'}</span>
                      <strong>{rule.rawDescription ?? '—'}</strong>
                    </div>
                    <StatusBadge active={rule.active} />
                  </div>
                  <div className="ignored-mobile-grid">
                    <div className="ignored-mobile-wide">
                      <span>Motivo</span>
                      <strong>{rule.reason}</strong>
                    </div>
                    <div>
                      <span>Criado em</span>
                      <strong>{formatDate(rule.createdAt)}</strong>
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
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="ignored-modal card">
            <div className="ignored-modal-head">
              <div>
                <h2>
                  {modal.type === 'create' && 'Nova regra de ignorado'}
                  {modal.type === 'view' && 'Detalhes da regra'}
                  {modal.type === 'deactivate' && 'Desativar regra'}
                </h2>
                <p>
                  {modal.type === 'create' && 'Cadastre um item DAV que não deve ir para o picking.'}
                  {modal.type === 'view' && `${modal.rule.rawSku ?? '—'} · ${modal.rule.rawDescription ?? '—'}`}
                  {modal.type === 'deactivate' && 'Confirme a desativação desta regra.'}
                </p>
              </div>
              <button className="modal-close" type="button" onClick={closeModal} aria-label="Fechar modal">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            {modal.type === 'create' && (
              <form className="ignored-form" onSubmit={saveRule}>
                <div className="ignored-form-grid">
                  <label>
                    <span>SKU (opcional)</span>
                    <input name="rawSku" value={formData.rawSku} onChange={handleFormChange}
                      placeholder="Ex: 00000000000308" />
                  </label>
                  <label className="ignored-form-wide">
                    <span>Descrição original</span>
                    <input name="rawDescription" value={formData.rawDescription} onChange={handleFormChange}
                      placeholder="Ex: FURACAO BROCA 3MM" />
                  </label>
                  <label className="ignored-form-wide">
                    <span>Motivo</span>
                    <textarea name="reason" value={formData.reason} onChange={handleFormChange} rows="3"
                      placeholder="Ex: Serviço da fábrica, não exige separação física" />
                  </label>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={formLoading}>
                    {formLoading ? 'Salvando…' : 'Salvar regra'}
                  </button>
                </div>
              </form>
            )}

            {modal.type === 'view' && (
              <>
                <div className="ignored-modal-body">
                  <div className="ignored-rule-grid">
                    <span>SKU</span><strong>{modal.rule.rawSku ?? '—'}</strong>
                    <span>Descrição</span><strong>{modal.rule.rawDescription ?? '—'}</strong>
                    <span>Motivo</span><strong>{modal.rule.reason}</strong>
                    <span>Status</span><StatusBadge active={modal.rule.active} />
                    <span>Criado em</span><strong>{formatDate(modal.rule.createdAt)}</strong>
                  </div>
                  <p style={{ marginTop: 12, fontSize: 13, color: 'var(--on-surface-variant)' }}>
                    Este item não aparece para o estoquista, mas permanece registrado para auditoria.
                  </p>
                </div>
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
                </div>
              </>
            )}

            {modal.type === 'deactivate' && (
              <>
                <div className="ignored-modal-body">
                  <div className="ignored-confirm-box">
                    <strong>{modal.rule.rawDescription ?? modal.rule.rawSku}</strong>
                    <p>Desativar esta regra impede que ela seja aplicada automaticamente nos próximos PDFs.</p>
                  </div>
                </div>
                <div className="ignored-modal-foot">
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-danger" type="button" onClick={confirmDeactivate} disabled={formLoading}>
                    {formLoading ? 'Desativando…' : 'Desativar'}
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
