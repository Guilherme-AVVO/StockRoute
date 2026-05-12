// Página ADMIN — Itens ignorados no picking.
// Centraliza: itens ocultos manualmente (API real), regras de ocultação por padrão
// de nome/SKU (MOCK — backend ainda não suporta) e itens não vinculados vindos
// do DAV (MOCK — não persistidos no banco hoje).
import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  listIgnoredDavItems,
  createIgnoredDavItem,
  deactivateIgnoredDavItem,
} from '../../services/ignoredDavItemsService.js';
import './AdminIgnoredItems.css';

// ============================================================
// Definições de aba e tipos de regra
// ============================================================

const TABS = [
  { id: 'hidden',    label: 'Ocultos' },
  { id: 'rules',     label: 'Regras de ocultação' },
  { id: 'unlinked',  label: 'Não vinculados' },
];

// Tipos de regra suportados visualmente.
// Backend ainda não tem match por padrão — isso é UI/MOCK por enquanto.
const RULE_TYPES = [
  { value: 'NAME_CONTAINS',        label: 'Nome contém'         },
  { value: 'SKU_CONTAINS',         label: 'SKU contém'          },
  { value: 'DESCRIPTION_CONTAINS', label: 'Descrição contém'    },
  { value: 'SKU_PREFIX',           label: 'Prefixo do SKU'      },
  { value: 'CATEGORY',             label: 'Categoria/termo'     },
];

const RULE_TYPE_LABEL = Object.fromEntries(RULE_TYPES.map((r) => [r.value, r.label]));

// ============================================================
// Dados mockados temporários — substituir quando houver API
// ============================================================

// MOCK: regras de ocultação por padrão.
// Endpoint futuro sugerido: GET/POST/DELETE /hide-rules (ou expandir ignored_dav_items)
const INITIAL_RULES = [
  {
    id:        'r1',
    type:      'NAME_CONTAINS',
    value:     'INST.',
    reason:    'Ocultar itens de instalação vindos do DAV (não exigem separação física)',
    active:    true,
    createdAt: '2026-05-10T09:00:00Z',
    appliedTo: 4,
  },
  {
    id:        'r2',
    type:      'SKU_PREFIX',
    value:     '0000000000074',
    reason:    'Itens de usinagem especial — fábrica, não vai para o estoquista',
    active:    true,
    createdAt: '2026-05-09T14:20:00Z',
    appliedTo: 1,
  },
  {
    id:        'r3',
    type:      'NAME_CONTAINS',
    value:     'CORTE',
    reason:    'Serviço de corte — executado na fábrica',
    active:    false,
    createdAt: '2026-05-05T11:30:00Z',
    appliedTo: 0,
  },
];

// MOCK: itens não vinculados de DAVs já importados.
// Hoje o backend só persiste itens com produto cadastrado (order_items.product_id NOT NULL).
// Para virar real precisa de nova tabela `unlinked_dav_items` ou tornar product_id nulo.
const INITIAL_UNLINKED = [
  {
    id:             'u1',
    davNumber:      '113364',
    customerName:   'REVITALIZE PLANEJADOS',
    rawSku:         '00000000000368',
    rawDescription: 'CANTONEIRA CAPA BRANCA REFORCADA + BUCHAS + PARAFUSOS (C/10 UND)',
    quantity:       1,
    unit:           'KT',
    createdAt:      '2026-05-12T10:30:00Z',
  },
  {
    id:             'u2',
    davNumber:      '113347',
    customerName:   'DREAMS HOME MOVEIS E DECORACOES LTDA',
    rawSku:         '00000000000368',
    rawDescription: 'CANTONEIRA CAPA BRANCA REFORCADA + BUCHAS + PARAFUSOS (C/10 UND)',
    quantity:       2,
    unit:           'KT',
    createdAt:      '2026-05-12T10:35:00Z',
  },
];

const EMPTY_HIDE_FORM = { rawSku: '', rawDescription: '', reason: '' };
const EMPTY_RULE_FORM = { type: 'NAME_CONTAINS', value: '', reason: '' };

// ============================================================
// Utilitários
// ============================================================

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Ícones SVG dos cards de resumo
const ICON_HIDDEN = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M9 3h12v12M3 9v12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const ICON_RULE = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const ICON_UNLINKED = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M10 14a5 5 0 0 1 0-7l3-3a5 5 0 0 1 7 7l-1 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M14 10a5 5 0 0 1 0 7l-3 3a5 5 0 0 1-7-7l1-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

// ============================================================
// Componentes auxiliares de modal
// ============================================================

function ModalOverlay({ children, onClose }) {
  return (
    <div className="ignored-modal-overlay open" role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      {children}
    </div>
  );
}

function ModalCard({ title, subtitle, onClose, children }) {
  return (
    <div className="ignored-modal card">
      <div className="ignored-modal-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar modal">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      {children}
    </div>
  );
}

// ============================================================
// Lista da aba "Ocultos" — API real
// ============================================================

function HiddenItemsList({ loading, items, onView, onUnhide }) {
  if (loading) return <div className="ignored-empty"><p>Carregando…</p></div>;

  if (items.length === 0) {
    return (
      <div className="ignored-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.6" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <p>Nenhum item oculto encontrado.</p>
      </div>
    );
  }

  return (
    <>
      <table className="ignored-table">
        <thead>
          <tr>
            <th>Código/Ref.</th>
            <th>Descrição</th>
            <th>Motivo</th>
            <th>Status</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((rule) => (
            <tr key={rule.id}>
              <td><span className="ignored-code-ref">{rule.rawSku ?? '—'}</span></td>
              <td><span className="ignored-description">{rule.rawDescription ?? '—'}</span></td>
              <td><span className="ignored-reason">{rule.reason}</span></td>
              <td><span className={`ignored-status ${rule.active ? 'active' : 'inactive'}`}>
                {rule.active ? 'Oculto' : 'Desocultado'}
              </span></td>
              <td><span className="ignored-muted">{formatDate(rule.createdAt)}</span></td>
              <td>
                <div className="ignored-actions">
                  <button type="button" onClick={() => onView(rule)}>Ver motivo</button>
                  {rule.active && (
                    <button type="button" onClick={() => onUnhide(rule)}>Desocultar</button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ignored-mobile-list">
        {items.map((rule) => (
          <article className="ignored-mobile-card" key={rule.id}>
            <div className="ignored-mobile-head">
              <div>
                <span className="ignored-code-ref">{rule.rawSku ?? '—'}</span>
                <strong style={{ marginTop: 6 }}>{rule.rawDescription ?? '—'}</strong>
              </div>
              <span className={`ignored-status ${rule.active ? 'active' : 'inactive'}`}>
                {rule.active ? 'Oculto' : 'Desocultado'}
              </span>
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
            <div className="ignored-actions">
              <button type="button" onClick={() => onView(rule)}>Ver motivo</button>
              {rule.active && <button type="button" onClick={() => onUnhide(rule)}>Desocultar</button>}
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Lista da aba "Regras de ocultação" — MOCK local
// ============================================================

function RulesList({ rules, onView, onToggle }) {
  if (rules.length === 0) {
    return (
      <div className="ignored-empty">
        <p>Nenhuma regra cadastrada ainda.</p>
      </div>
    );
  }

  return (
    <>
      <table className="ignored-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Motivo</th>
            <th>Status</th>
            <th>Itens afetados</th>
            <th>Criada em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td><span className="ignored-type servico">{RULE_TYPE_LABEL[rule.type]}</span></td>
              <td><span className="ignored-code-ref">{rule.value}</span></td>
              <td><span className="ignored-reason">{rule.reason}</span></td>
              <td>
                <span className={`ignored-status ${rule.active ? 'active' : 'inactive'}`}>
                  {rule.active ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td><span className="ignored-muted">{rule.appliedTo} itens</span></td>
              <td><span className="ignored-muted">{formatDate(rule.createdAt)}</span></td>
              <td>
                <div className="ignored-actions">
                  <button type="button" onClick={() => onView(rule)}>Ver detalhes</button>
                  <button type="button" onClick={() => onToggle(rule.id)}>
                    {rule.active ? 'Desativar' : 'Reativar'}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ignored-mobile-list">
        {rules.map((rule) => (
          <article className="ignored-mobile-card" key={rule.id}>
            <div className="ignored-mobile-head">
              <div>
                <span className="ignored-type servico">{RULE_TYPE_LABEL[rule.type]}</span>
                <strong style={{ marginTop: 6 }}>
                  <span className="ignored-code-ref">{rule.value}</span>
                </strong>
              </div>
              <span className={`ignored-status ${rule.active ? 'active' : 'inactive'}`}>
                {rule.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            <div className="ignored-mobile-grid">
              <div className="ignored-mobile-wide">
                <span>Motivo</span>
                <strong>{rule.reason}</strong>
              </div>
              <div>
                <span>Itens afetados</span>
                <strong>{rule.appliedTo}</strong>
              </div>
              <div>
                <span>Criada em</span>
                <strong>{formatDate(rule.createdAt)}</strong>
              </div>
            </div>
            <div className="ignored-actions">
              <button type="button" onClick={() => onView(rule)}>Ver detalhes</button>
              <button type="button" onClick={() => onToggle(rule.id)}>
                {rule.active ? 'Desativar' : 'Reativar'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Lista da aba "Não vinculados" — MOCK local
// ============================================================

function UnlinkedList({ items, onLink, onRegister, onHide, onCreateRule }) {
  if (items.length === 0) {
    return (
      <div className="ignored-empty">
        <p>Tudo certo — nenhum item DAV sem vínculo.</p>
      </div>
    );
  }

  return (
    <>
      <table className="ignored-table">
        <thead>
          <tr>
            <th>DAV</th>
            <th>Código/Ref.</th>
            <th>Descrição</th>
            <th>Qtd.</th>
            <th>Unidade</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><span className="dav-id">{item.davNumber}</span></td>
              <td><span className="ignored-code-ref">{item.rawSku}</span></td>
              <td><span className="ignored-description">{item.rawDescription}</span></td>
              <td><span className="counts"><span className="num">{item.quantity}</span></span></td>
              <td><span className="ignored-muted">{item.unit}</span></td>
              <td><span className="client-name">{item.customerName}</span></td>
              <td><span className="ignored-unlinked-badge">Não vinculado</span></td>
              <td>
                <div className="ignored-actions">
                  <button type="button" onClick={() => onLink(item)}>Vincular</button>
                  <button type="button" onClick={() => onRegister(item)}>Cadastrar</button>
                  <button type="button" onClick={() => onHide(item)}>Ocultar</button>
                  <button type="button" onClick={() => onCreateRule(item)}>Criar regra</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="ignored-mobile-list">
        {items.map((item) => (
          <article className="ignored-mobile-card" key={item.id}>
            <div className="ignored-mobile-head">
              <div>
                <span className="dav-id">DAV {item.davNumber}</span>
                <strong style={{ marginTop: 4 }}>
                  <span className="ignored-code-ref">{item.rawSku}</span>
                </strong>
                <span className="ignored-source-line">{item.customerName}</span>
              </div>
              <span className="ignored-unlinked-badge">Não vinculado</span>
            </div>
            <div className="ignored-mobile-grid">
              <div className="ignored-mobile-wide">
                <span>Descrição</span>
                <strong>{item.rawDescription}</strong>
              </div>
              <div>
                <span>Qtd.</span>
                <strong>{item.quantity}</strong>
              </div>
              <div>
                <span>Unidade</span>
                <strong>{item.unit}</strong>
              </div>
            </div>
            <div className="ignored-actions">
              <button type="button" onClick={() => onLink(item)}>Vincular</button>
              <button type="button" onClick={() => onRegister(item)}>Cadastrar</button>
              <button type="button" onClick={() => onHide(item)}>Ocultar</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Componente principal
// ============================================================

export default function AdminIgnoredItems() {
  const [tab, setTab] = useState('hidden');

  // Aba "Ocultos" — API real
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Aba "Regras de ocultação" — MOCK local
  const [hideRules, setHideRules] = useState(INITIAL_RULES);

  // Aba "Não vinculados" — MOCK local
  const [unlinkedItems, setUnlinkedItems] = useState(INITIAL_UNLINKED);

  // Estado compartilhado de busca/modal/feedback
  const [search,   setSearch]   = useState('');
  const [feedback, setFeedback] = useState(null);
  const [modal,    setModal]    = useState(null);

  // Formulários
  const [hideForm,     setHideForm]     = useState(EMPTY_HIDE_FORM);
  const [ruleForm,     setRuleForm]     = useState(EMPTY_RULE_FORM);
  const [formError,    setFormError]    = useState(null);
  const [formLoading,  setFormLoading]  = useState(false);

  // Recarrega itens ocultos da API
  const reloadHidden = useCallback(() => {
    setLoadingRules(true);
    listIgnoredDavItems({ includeInactive: true })
      .then(setRules)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoadingRules(false));
  }, []);

  useEffect(() => { reloadHidden(); }, [reloadHidden]);

  // Limpa busca ao trocar de aba
  useEffect(() => { setSearch(''); }, [tab]);

  // Contagens
  const activeHiddenCount = rules.filter((r) => r.active).length;
  const activeRulesCount  = hideRules.filter((r) => r.active).length;
  const unlinkedCount     = unlinkedItems.length;

  // Filtros
  const filteredHidden = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((rule) => {
      if (!q) return true;
      return (
        rule.rawSku?.toLowerCase().includes(q)
        || rule.rawDescription?.toLowerCase().includes(q)
        || rule.reason?.toLowerCase().includes(q)
      );
    });
  }, [rules, search]);

  const filteredRulesPattern = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hideRules.filter((r) => {
      if (!q) return true;
      return (
        r.value.toLowerCase().includes(q)
        || r.reason.toLowerCase().includes(q)
        || RULE_TYPE_LABEL[r.type].toLowerCase().includes(q)
      );
    });
  }, [hideRules, search]);

  const filteredUnlinked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unlinkedItems.filter((u) => {
      if (!q) return true;
      return (
        u.rawSku.toLowerCase().includes(q)
        || u.rawDescription.toLowerCase().includes(q)
        || u.customerName.toLowerCase().includes(q)
        || u.davNumber.includes(q)
      );
    });
  }, [unlinkedItems, search]);

  // Handlers de modais
  function openHideModal(prefill = {}) {
    setHideForm({ ...EMPTY_HIDE_FORM, ...prefill });
    setFormError(null);
    setModal({ type: 'hide' });
  }
  function openViewModal(rule)      { setModal({ type: 'view', rule }); }
  function openUnhideModal(rule)    { setModal({ type: 'unhide', rule }); }
  function openRuleModal(prefill = {}) {
    setRuleForm({ ...EMPTY_RULE_FORM, ...prefill });
    setFormError(null);
    setModal({ type: 'rule' });
  }
  function openRuleViewModal(rule)  { setModal({ type: 'rule-view', rule }); }
  function openLinkModal(item)      { setModal({ type: 'link',     item }); }
  function openRegisterModal(item)  { setModal({ type: 'register', item }); }

  function closeModal() {
    setModal(null);
    setFormError(null);
    setFormLoading(false);
  }

  // Aba "Ocultos" — chamadas reais
  async function saveHideRule(e) {
    e.preventDefault();
    setFormError(null);
    if (!hideForm.rawDescription.trim() || !hideForm.reason.trim()) {
      setFormError('Preencha a descrição e o motivo.');
      return;
    }
    setFormLoading(true);
    try {
      await createIgnoredDavItem(hideForm);
      setFeedback('Item ocultado no picking. Continua registrado para auditoria.');
      closeModal();
      reloadHidden();
    } catch (err) {
      setFormError(err.message || 'Erro ao ocultar item');
    } finally {
      setFormLoading(false);
    }
  }

  async function confirmUnhide() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      await deactivateIgnoredDavItem(modal.rule.id);
      setFeedback('Item desocultado. Volta a aparecer para o estoquista.');
      closeModal();
      reloadHidden();
    } catch (err) {
      setFeedback(err.message || 'Erro ao desocultar item');
      closeModal();
    }
  }

  // Aba "Regras" — MOCK
  function saveRuleMock(e) {
    e.preventDefault();
    setFormError(null);
    if (!ruleForm.value.trim() || !ruleForm.reason.trim()) {
      setFormError('Preencha o valor da regra e o motivo.');
      return;
    }
    const newRule = {
      id:        `r-${Date.now()}`,
      type:      ruleForm.type,
      value:     ruleForm.value.trim(),
      reason:    ruleForm.reason.trim(),
      active:    true,
      createdAt: new Date().toISOString(),
      appliedTo: 0,
    };
    setHideRules((prev) => [newRule, ...prev]);
    setFeedback('Regra criada localmente. (Mock — backend ainda não persiste regras por padrão.)');
    closeModal();
  }

  function toggleRuleActive(id) {
    setHideRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
    setFeedback('Status da regra alternado localmente. (Mock — sem persistência.)');
  }

  // Aba "Não vinculados" — MOCK
  function linkUnlinkedMock(item) {
    setUnlinkedItems((prev) => prev.filter((u) => u.id !== item.id));
    setFeedback(`Vínculo simulado para "${item.rawDescription}". (Mock — endpoint não existe.)`);
    closeModal();
  }

  function registerUnlinkedMock(item) {
    setUnlinkedItems((prev) => prev.filter((u) => u.id !== item.id));
    setFeedback(`Cadastro rápido simulado para SKU ${item.rawSku}. (Mock — endpoint não existe.)`);
    closeModal();
  }

  return (
    <div className="ignored-page">
      <section className="hero ignored-hero">
        <div>
          <h1>Itens ignorados no picking</h1>
          <p>Gerencie itens ocultos manualmente, regras por padrão e itens DAV não vinculados.</p>
        </div>
        <div className="hero-actions">
          {tab === 'hidden' && (
            <button className="btn btn-primary" type="button" onClick={() => openHideModal()}>
              + Ocultar novo item
            </button>
          )}
          {tab === 'rules' && (
            <button className="btn btn-primary" type="button" onClick={() => openRuleModal()}>
              + Nova regra de ocultação
            </button>
          )}
        </div>
      </section>

      {feedback && (
        <div className="ignored-feedback" role="status">{feedback}</div>
      )}

      <section className="ignored-stats-grid">
        <StatCard icon={ICON_HIDDEN} value={activeHiddenCount}
          label="Itens ocultos" description="Ocultados manualmente, não vão para o picking" />
        <StatCard icon={ICON_RULE} value={activeRulesCount}
          label="Regras ativas" description="Padrões que ocultam itens automaticamente"
          iconStyle={{ background: 'var(--primary-fixed)', color: 'var(--primary)' }} />
        <StatCard icon={ICON_UNLINKED} value={unlinkedCount}
          label="Não vinculados" description="Itens DAV sem produto no catálogo"
          iconStyle={{ background: '#fff2dd', color: '#b75a00' }} />
        <StatCard icon={ICON_HIDDEN} value={rules.filter((r) => !r.active).length}
          label="Desocultados" description="Voltaram para o fluxo do estoquista"
          iconStyle={{ background: '#ececf5', color: '#6a6a78' }} />
      </section>

      {/* Card explicativo */}
      <section className="ignored-top-grid">
        <div className="card ignored-flow-card">
          <div>
            <h2>Como funciona</h2>
            <p>
              Itens da fábrica, serviços e processos internos podem ser ocultados do picking.
              O item continua registrado para auditoria — nada é apagado silenciosamente.
            </p>
          </div>
          <div className="ignored-flow">
            <span>DAV recebido</span>
            <span>item extraído</span>
            <span>regra/oculto aplicado</span>
            <span>oculto no picking</span>
            <span>registrado no histórico</span>
          </div>
        </div>

        <aside className="ignored-side">
          <div className="card ignored-side-card ignored-safety-card">
            <h2>Regra de segurança operacional</h2>
            <p>
              Nenhum item deve ser ocultado silenciosamente. Toda ocultação precisa ter motivo
              e permanecer auditável.
            </p>
          </div>
        </aside>
      </section>

      {/* Abas */}
      <section className="card ignored-table-card">
        <div className="ignored-toolbar">
          <div className="ignored-tabs" role="tablist" aria-label="Abas de itens ignorados">
            {TABS.map((t) => (
              <button key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`ignored-tab${tab === t.id ? ' active' : ''}`}
                type="button"
                onClick={() => setTab(t.id)}
              >
                {t.label}
                <span className="tab-count">
                  {t.id === 'hidden'  ? activeHiddenCount
                  : t.id === 'rules'  ? activeRulesCount
                  :                     unlinkedCount}
                </span>
              </button>
            ))}
          </div>

          <label className="ignored-search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
              <path d="m20 20-3-3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input type="search"
              placeholder={
                tab === 'hidden'   ? 'Buscar por SKU, descrição ou motivo…'
                : tab === 'rules'  ? 'Buscar regra por valor, motivo ou tipo…'
                :                    'Buscar por DAV, SKU, descrição ou cliente…'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)} />
          </label>
        </div>

        {tab === 'hidden' && (
          <HiddenItemsList
            loading={loadingRules}
            items={filteredHidden}
            onView={openViewModal}
            onUnhide={openUnhideModal}
          />
        )}

        {tab === 'rules' && (
          <RulesList
            rules={filteredRulesPattern}
            onView={openRuleViewModal}
            onToggle={toggleRuleActive}
          />
        )}

        {tab === 'unlinked' && (
          <UnlinkedList
            items={filteredUnlinked}
            onLink={openLinkModal}
            onRegister={openRegisterModal}
            onHide={(item) => openHideModal({ rawSku: item.rawSku, rawDescription: item.rawDescription })}
            onCreateRule={(item) => openRuleModal({
              type: 'DESCRIPTION_CONTAINS',
              value: item.rawDescription.split(' ').slice(0, 2).join(' '),
            })}
          />
        )}
      </section>

      {/* Modais */}
      {modal && (
        <ModalOverlay onClose={closeModal}>
          {modal.type === 'hide' && (
            <ModalCard title="Ocultar item no picking"
              subtitle="O item não irá para o estoquista, mas continuará registrado para auditoria."
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={saveHideRule}>
                <div className="ignored-form-grid">
                  <label>
                    <span>SKU / Código (opcional)</span>
                    <input value={hideForm.rawSku}
                      onChange={(e) => setHideForm({ ...hideForm, rawSku: e.target.value })}
                      placeholder="Ex: 00000000000308" />
                  </label>
                  <label className="ignored-form-wide">
                    <span>Descrição do item</span>
                    <input value={hideForm.rawDescription}
                      onChange={(e) => setHideForm({ ...hideForm, rawDescription: e.target.value })}
                      placeholder="Ex: FURACAO BROCA 3MM" />
                  </label>
                  <label className="ignored-form-wide">
                    <span>Motivo da ocultação</span>
                    <textarea rows="3" value={hideForm.reason}
                      onChange={(e) => setHideForm({ ...hideForm, reason: e.target.value })}
                      placeholder="Ex: Serviço da fábrica, não exige separação física" />
                  </label>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-modal-foot" style={{ marginTop: 16 }}>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={formLoading}>
                    {formLoading ? 'Salvando…' : 'Ocultar no picking'}
                  </button>
                </div>
              </form>
            </ModalCard>
          )}

          {modal.type === 'view' && (
            <ModalCard title="Detalhes do item oculto"
              subtitle={`${modal.rule.rawSku ?? '—'} · ${modal.rule.rawDescription ?? '—'}`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-rule-grid">
                  <span>Código/Ref.</span><strong><span className="ignored-code-ref">{modal.rule.rawSku ?? '—'}</span></strong>
                  <span>Descrição</span><strong>{modal.rule.rawDescription ?? '—'}</strong>
                  <span>Motivo</span><strong>{modal.rule.reason}</strong>
                  <span>Origem</span><strong>Ocultação manual</strong>
                  <span>Status</span>
                  <strong>
                    <span className={`ignored-status ${modal.rule.active ? 'active' : 'inactive'}`}>
                      {modal.rule.active ? 'Oculto' : 'Desocultado'}
                    </span>
                  </strong>
                  <span>Criado em</span><strong>{formatDate(modal.rule.createdAt)}</strong>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'unhide' && (
            <ModalCard title="Desocultar item?"
              subtitle="O item voltará a aparecer no fluxo do estoquista nos próximos DAVs."
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-confirm-box">
                  <strong>{modal.rule.rawDescription ?? modal.rule.rawSku}</strong>
                  <p>Após desocultar, o item será incluído normalmente na lista de picking dos próximos pedidos.</p>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-danger" type="button" onClick={confirmUnhide} disabled={formLoading}>
                  {formLoading ? 'Desocultando…' : 'Desocultar'}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'rule' && (
            <ModalCard title="Nova regra de ocultação"
              subtitle="Oculte automaticamente itens que correspondam a um padrão. (Mock — backend pendente.)"
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={saveRuleMock}>
                <div className="ignored-form-grid">
                  <div className="ignored-form-wide">
                    <span style={{
                      display: 'block', fontSize: 12, fontWeight: 800, letterSpacing: '0.04em',
                      textTransform: 'uppercase', color: 'var(--outline-strong)', marginBottom: 8
                    }}>
                      Tipo de regra
                    </span>
                    <div className="ignored-rule-type-grid">
                      {RULE_TYPES.map((rt) => (
                        <label key={rt.value}
                          className={`ignored-rule-type-option${ruleForm.type === rt.value ? ' selected' : ''}`}>
                          <input type="radio" name="ruleType"
                            checked={ruleForm.type === rt.value}
                            onChange={() => setRuleForm({ ...ruleForm, type: rt.value })} />
                          {rt.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="ignored-form-wide">
                    <span>Valor da regra</span>
                    <input value={ruleForm.value}
                      onChange={(e) => setRuleForm({ ...ruleForm, value: e.target.value })}
                      placeholder="Ex: INST." />
                  </label>
                  <label className="ignored-form-wide">
                    <span>Motivo</span>
                    <textarea rows="3" value={ruleForm.reason}
                      onChange={(e) => setRuleForm({ ...ruleForm, reason: e.target.value })}
                      placeholder="Ex: Item relacionado à instalação/fábrica, não exige separação física" />
                  </label>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-mock-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Mock visual: regras por padrão ainda não são persistidas pelo backend.
                </div>
                <div className="ignored-modal-foot" style={{ marginTop: 16 }}>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit">Criar regra</button>
                </div>
              </form>
            </ModalCard>
          )}

          {modal.type === 'rule-view' && (
            <ModalCard title="Detalhes da regra"
              subtitle={`${RULE_TYPE_LABEL[modal.rule.type]}: "${modal.rule.value}"`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-rule-grid">
                  <span>Tipo</span><strong>{RULE_TYPE_LABEL[modal.rule.type]}</strong>
                  <span>Valor</span><strong><span className="ignored-code-ref">{modal.rule.value}</span></strong>
                  <span>Motivo</span><strong>{modal.rule.reason}</strong>
                  <span>Status</span><strong>{modal.rule.active ? 'Ativa' : 'Inativa'}</strong>
                  <span>Itens afetados</span><strong>{modal.rule.appliedTo} itens</strong>
                  <span>Criada em</span><strong>{formatDate(modal.rule.createdAt)}</strong>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
                <button className="btn btn-primary" type="button"
                  onClick={() => { toggleRuleActive(modal.rule.id); closeModal(); }}>
                  {modal.rule.active ? 'Desativar regra' : 'Reativar regra'}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'link' && (
            <ModalCard title="Vincular a produto existente"
              subtitle={`${modal.item.rawSku} · ${modal.item.rawDescription}`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <p style={{ color: 'var(--on-surface-variant)', fontSize: 13, marginBottom: 12 }}>
                  Selecione um produto do catálogo para vincular a este item. (Mock — busca real ainda não implementada.)
                </p>
                <div className="ignored-confirm-box">
                  <strong>Origem do item</strong>
                  <p>DAV {modal.item.davNumber} · {modal.item.customerName}</p>
                </div>
                <div className="ignored-mock-warning">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Vínculo mockado: backend não persiste itens não vinculados hoje.
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={() => linkUnlinkedMock(modal.item)}>
                  Simular vínculo
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'register' && (
            <ModalCard title="Cadastrar novo produto"
              subtitle="Os dados do DAV são pré-preenchidos. (Mock — sem chamada real.)"
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-rule-grid">
                  <span>Código/Ref.</span><strong><span className="ignored-code-ref">{modal.item.rawSku}</span></strong>
                  <span>Descrição</span><strong>{modal.item.rawDescription}</strong>
                  <span>Unidade</span><strong>{modal.item.unit}</strong>
                  <span>Quantidade no DAV</span><strong>{modal.item.quantity}</strong>
                </div>
                <div className="ignored-mock-warning" style={{ marginTop: 12 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                    <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Para cadastrar de fato, use a tela de Produtos. (Cadastro rápido será real quando o endpoint estiver pronto.)
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={() => registerUnlinkedMock(modal.item)}>
                  Simular cadastro
                </button>
              </div>
            </ModalCard>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}
