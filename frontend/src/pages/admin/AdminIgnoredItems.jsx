// Página ADMIN — Itens ignorados no picking.
// Centraliza ocorrências ocultas, regras reais de ocultação e itens DAV não vinculados.
import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  listIgnoredDavItems,
  createIgnoredDavItem,
  updateIgnoredDavItem,
  setIgnoredDavItemActive,
  deleteIgnoredDavItem,
} from '../../services/ignoredDavItemsService.js';
import {
  listUnlinkedDavItems,
  linkUnlinkedItemToProduct,
  createProductFromUnlinkedItem,
  hideUnlinkedItem,
} from '../../services/unlinkedDavItemsService.js';
import { listProducts } from '../../services/productService.js';
import './AdminIgnoredItems.css';

// ============================================================
// Definições de aba e tipos de regra
// ============================================================

const TABS = [
  { id: 'hidden',    label: 'Ocultos' },
  { id: 'rules',     label: 'Regras de ocultação' },
  { id: 'unlinked',  label: 'Não vinculados' },
];

const RULE_TYPES = [
  { value: 'NAME_CONTAINS',        label: 'Nome contém'         },
  { value: 'MANUFACTURER_NAME_CONTAINS', label: 'Fabricante contém' },
  { value: 'MANUFACTURER_NAME',    label: 'Fabricante igual'    },
];

const RULE_TYPE_LABEL = Object.fromEntries(RULE_TYPES.map((r) => [r.value, r.label]));

const EMPTY_RULE_FORM = { type: 'NAME_CONTAINS', value: '', reason: '' };

// ============================================================
// Utilitários
// ============================================================

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getRuleValue(rule) {
  return (
    rule.rawSku
    ?? rule.rawDescription
    ?? rule.manufacturerReference
    ?? rule.manufacturerName
    ?? '—'
  );
}

function isSupportedRule(rule) {
  return RULE_TYPES.some((type) => type.value === rule.matchType);
}

function getRuleLabel(rule) {
  return RULE_TYPE_LABEL[rule.matchType] ?? 'Tipo antigo/incompatível';
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

function HiddenItemsList({ loading, items, onView }) {
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
            <th>DAV</th>
            <th>Código/Ref.</th>
            <th>Descrição</th>
            <th>Motivo</th>
            <th>Origem</th>
            <th>Criado em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><span className="dav-id">{item.davNumber ?? '—'}</span></td>
              <td><span className="ignored-code-ref">{item.rawSku ?? item.manufacturerReference ?? '—'}</span></td>
              <td><span className="ignored-description">{item.rawDescription ?? '—'}</span></td>
              <td><span className="ignored-reason">{item.ignoredReason ?? item.resolutionNote ?? '—'}</span></td>
              <td><span className="ignored-by-rule-badge">{item.ignoredRuleId ? 'Oculto por regra' : 'Oculto manualmente'}</span></td>
              <td><span className="ignored-muted">{formatDate(item.createdAt)}</span></td>
              <td>
                <div className="ignored-actions">
                  <button type="button" onClick={() => onView(item)}>Ver regra</button>
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
                <span className="dav-id">DAV {item.davNumber ?? '—'}</span>
                <strong style={{ marginTop: 6 }}>{item.rawDescription ?? '—'}</strong>
              </div>
              <span className="ignored-by-rule-badge">{item.ignoredRuleId ? 'Oculto por regra' : 'Oculto manualmente'}</span>
            </div>
            <div className="ignored-mobile-grid">
              <div className="ignored-mobile-wide">
                <span>Motivo</span>
                <strong>{item.ignoredReason ?? item.resolutionNote ?? '—'}</strong>
              </div>
              <div>
                <span>Criado em</span>
                <strong>{formatDate(item.createdAt)}</strong>
              </div>
            </div>
            <div className="ignored-actions">
              <button type="button" onClick={() => onView(item)}>Ver regra</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Lista da aba "Regras de ocultação" — API real
// ============================================================

function RulesList({ rules, onView, onEdit, onToggle, onDelete }) {
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
            <th>Criada em</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((rule) => (
            <tr key={rule.id}>
              <td><span className="ignored-type servico">{getRuleLabel(rule)}</span></td>
              <td><span className="ignored-code-ref">{getRuleValue(rule)}</span></td>
              <td><span className="ignored-reason">{rule.reason}</span></td>
              <td>
                <span className={`ignored-status ${rule.active ? 'active' : 'inactive'}`}>
                  {rule.active ? 'Ativa' : 'Inativa'}
                </span>
              </td>
              <td><span className="ignored-muted">{formatDate(rule.createdAt)}</span></td>
              <td>
                <div className="ignored-actions">
                  <button type="button" onClick={() => onView(rule)}>Ver detalhes</button>
                  {isSupportedRule(rule) && <button type="button" onClick={() => onEdit(rule)}>Editar</button>}
                  {isSupportedRule(rule) && (
                    <button type="button" onClick={() => onToggle(rule)}>
                      {rule.active ? 'Desativar' : 'Ativar'}
                    </button>
                  )}
                  <button type="button" onClick={() => onDelete(rule)}>Apagar</button>
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
                <span className="ignored-type servico">{getRuleLabel(rule)}</span>
                <strong style={{ marginTop: 6 }}>
                  <span className="ignored-code-ref">{getRuleValue(rule)}</span>
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
                <span>Criada em</span>
                <strong>{formatDate(rule.createdAt)}</strong>
              </div>
            </div>
            <div className="ignored-actions">
              <button type="button" onClick={() => onView(rule)}>Ver detalhes</button>
              {isSupportedRule(rule) && <button type="button" onClick={() => onEdit(rule)}>Editar</button>}
              {isSupportedRule(rule) && (
                <button type="button" onClick={() => onToggle(rule)}>
                  {rule.active ? 'Desativar' : 'Ativar'}
                </button>
              )}
              <button type="button" onClick={() => onDelete(rule)}>Apagar</button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

// ============================================================
// Lista da aba "Não vinculados" — API real
// ============================================================

function UnlinkedList({ loading, items, onLink, onRegister, onHide, onCreateRule }) {
  if (loading) return <div className="ignored-empty"><p>Carregando itens não vinculados…</p></div>;

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
            <th>SKU interno</th>
            <th>Ref. fabricante</th>
            <th>Fabricante</th>
            <th>Descrição</th>
            <th>Qtd.</th>
            <th>Un.</th>
            <th>Cliente</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td><span className="dav-id">{item.davNumber}</span></td>
              <td><span className="ignored-code-ref">{item.rawSku || '—'}</span></td>
              <td><span className="ignored-code-ref">{item.manufacturerReference || '—'}</span></td>
              <td><span className="ignored-muted">{item.manufacturerName || '—'}</span></td>
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

  // Aba "Regras" — API real (ignored_dav_items)
  const [rules, setRules] = useState([]);
  const [loadingRules, setLoadingRules] = useState(true);

  // Aba "Ocultos" — ocorrências reais ocultadas em unlinked_dav_items.
  const [hiddenItems, setHiddenItems] = useState([]);
  const [loadingHidden, setLoadingHidden] = useState(true);

  // Aba "Não vinculados" — API real (/unlinked-dav-items)
  const [unlinkedItems, setUnlinkedItems] = useState([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(true);

  // Catálogo carregado sob demanda para o modal de "Vincular"
  const [catalogProducts, setCatalogProducts] = useState([]);
  const [productSearch,   setProductSearch]   = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');

  // Formulário de cadastro rápido a partir de item não vinculado.
  // Inclui referência/fabricante para que o próximo DAV faça match automático.
  const [registerForm, setRegisterForm] = useState({
    sku: '', name: '', unit: 'UN', imageUrl: '',
    manufacturerReference: '', manufacturerName: '',
  });

  // Formulário de motivo para ocultar item não vinculado
  const [hideUnlinkedReason, setHideUnlinkedReason] = useState('');

  // Estado compartilhado de busca/modal/feedback
  const [search,   setSearch]   = useState('');
  const [feedback, setFeedback] = useState(null);
  const [modal,    setModal]    = useState(null);

  // Formulários
  const [ruleForm,     setRuleForm]     = useState(EMPTY_RULE_FORM);
  const [formError,    setFormError]    = useState(null);
  const [formLoading,  setFormLoading]  = useState(false);

  const reloadRules = useCallback(() => {
    setLoadingRules(true);
    listIgnoredDavItems({ includeInactive: true })
      .then(setRules)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoadingRules(false));
  }, []);

  const reloadHidden = useCallback(() => {
    setLoadingHidden(true);
    listUnlinkedDavItems({ status: 'HIDDEN' })
      .then(setHiddenItems)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoadingHidden(false));
  }, []);

  // Recarrega itens não vinculados (status=PENDING) da API real
  const reloadUnlinked = useCallback(() => {
    setLoadingUnlinked(true);
    listUnlinkedDavItems()
      .then(setUnlinkedItems)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoadingUnlinked(false));
  }, []);

  useEffect(() => { reloadRules(); reloadHidden(); reloadUnlinked(); }, [reloadRules, reloadHidden, reloadUnlinked]);

  // Limpa busca ao trocar de aba
  useEffect(() => { setSearch(''); }, [tab]);

  // Contagens
  const activeHiddenCount = hiddenItems.length;
  const activeRulesCount  = rules.filter((r) => r.active && isSupportedRule(r)).length;
  const unlinkedCount     = unlinkedItems.length;

  // Filtros
  const filteredHidden = useMemo(() => {
    const q = search.trim().toLowerCase();
    return hiddenItems.filter((item) => {
      if (!q) return true;
      return (
        item.rawSku?.toLowerCase().includes(q)
        || item.rawDescription?.toLowerCase().includes(q)
        || item.ignoredReason?.toLowerCase().includes(q)
        || item.resolutionNote?.toLowerCase().includes(q)
        || item.davNumber?.toLowerCase().includes(q)
      );
    });
  }, [hiddenItems, search]);

  const filteredRulesPattern = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rules.filter((r) => {
      if (!q) return true;
      const typeLabel = RULE_TYPE_LABEL[r.matchType] ?? r.matchType ?? '';
      const value = getRuleValue(r);
      return (
        value.toLowerCase().includes(q)
        || r.reason.toLowerCase().includes(q)
        || typeLabel.toLowerCase().includes(q)
      );
    });
  }, [rules, search]);

  const filteredUnlinked = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unlinkedItems.filter((u) => {
      if (!q) return true;
      return (
        (u.rawSku ?? '').toLowerCase().includes(q)
        || (u.rawDescription ?? '').toLowerCase().includes(q)
        || (u.customerName ?? '').toLowerCase().includes(q)
        || (u.davNumber ?? '').includes(q)
      );
    });
  }, [unlinkedItems, search]);

  // Handlers de modais
  function openViewModal(item)      { setModal({ type: 'view', item }); }
  function openRuleModal(prefill = {}) {
    setRuleForm({ ...EMPTY_RULE_FORM, ...prefill });
    setFormError(null);
    setModal({ type: 'rule' });
  }
  function openRuleEditModal(rule) {
    setRuleForm({
      type: rule.matchType,
      value: getRuleValue(rule) === '—' ? '' : getRuleValue(rule),
      reason: rule.reason ?? '',
    });
    setFormError(null);
    setModal({ type: 'rule', rule });
  }
  function openRuleViewModal(rule)  { setModal({ type: 'rule-view', rule }); }
  // Handlers reais de "link" e "register" estão em openLinkModalReal / openRegisterModalReal abaixo.

  function closeModal() {
    setModal(null);
    setFormError(null);
    setFormLoading(false);
  }

  async function confirmToggleRuleStatus() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      await setIgnoredDavItemActive(modal.rule.id, !modal.rule.active);
      setFeedback(modal.rule.active
        ? 'Regra desativada. Ela não será aplicada em novos DAVs.'
        : 'Regra ativada com sucesso.');
      closeModal();
      reloadRules();
    } catch (err) {
      setFeedback(err.message || 'Erro ao alterar status da regra');
      closeModal();
    }
  }

  async function confirmDeleteRule() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      await deleteIgnoredDavItem(modal.rule.id);
      setFeedback('Regra apagada com sucesso.');
      closeModal();
      reloadRules();
    } catch (err) {
      setFormError(err.message || 'Erro ao apagar regra');
    } finally {
      setFormLoading(false);
    }
  }

  async function saveRule(e) {
    e.preventDefault();
    setFormError(null);
    if (!ruleForm.value.trim() || !ruleForm.reason.trim()) {
      setFormError('Preencha o valor da regra e o motivo.');
      return;
    }
    setFormLoading(true);
    try {
      const payload = {
        matchType: ruleForm.type,
        reason:    ruleForm.reason.trim(),
      };
      if (ruleForm.type === 'MANUFACTURER_NAME' || ruleForm.type === 'MANUFACTURER_NAME_CONTAINS') {
        payload.manufacturerName = ruleForm.value.trim();
      }
      else payload.rawDescription = ruleForm.value.trim();

      if (modal?.rule) {
        await updateIgnoredDavItem(modal.rule.id, payload);
        setFeedback('Regra editada com sucesso.');
      } else {
        await createIgnoredDavItem(payload);
        setFeedback('Regra de ocultação criada e ativa para os próximos DAVs.');
      }
      closeModal();
      reloadRules();
    } catch (err) {
      setFormError(err.message || 'Erro ao criar regra');
    } finally {
      setFormLoading(false);
    }
  }

  // Aba "Não vinculados" — chamadas reais à API

  // Vincula item a produto já existente no catálogo.
  async function confirmLinkUnlinked(item) {
    if (!selectedProductId) {
      setFormError('Selecione um produto do catálogo.');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      await linkUnlinkedItemToProduct(item.id, selectedProductId);
      setFeedback(`Item "${item.rawDescription}" vinculado com sucesso.`);
      closeModal();
      reloadUnlinked();
    } catch (err) {
      setFormError(err.message || 'Erro ao vincular item');
    } finally {
      setFormLoading(false);
    }
  }

  // Cria produto novo no catálogo a partir do item DAV.
  async function confirmRegisterUnlinked(item) {
    setFormError(null);
    const { sku, name, unit, imageUrl, manufacturerReference, manufacturerName } = registerForm;
    if (!sku.trim() || !name.trim() || !unit.trim()) {
      setFormError('SKU, nome e unidade são obrigatórios.');
      return;
    }
    setFormLoading(true);
    try {
      await createProductFromUnlinkedItem(item.id, {
        sku, name, unit,
        imageUrl: imageUrl || null,
        manufacturerReference: manufacturerReference || null,
        manufacturerName:      manufacturerName      || null,
      });
      setFeedback(`Produto "${name}" cadastrado e item resolvido.`);
      closeModal();
      reloadUnlinked();
    } catch (err) {
      setFormError(err.message || 'Erro ao cadastrar produto');
    } finally {
      setFormLoading(false);
    }
  }

  // Oculta item não vinculado — cria regra em ignored_dav_items.
  async function confirmHideUnlinked(item) {
    setFormError(null);
    if (!hideUnlinkedReason.trim()) {
      setFormError('Informe o motivo da ocultação.');
      return;
    }
    setFormLoading(true);
    try {
      await hideUnlinkedItem(item.id, hideUnlinkedReason);
      setFeedback(`Item "${item.rawDescription}" ocultado e regra criada.`);
      closeModal();
      reloadUnlinked();
      reloadHidden();
      reloadRules();
    } catch (err) {
      setFormError(err.message || 'Erro ao ocultar item');
    } finally {
      setFormLoading(false);
    }
  }

  // Abre modal de "Vincular" carregando catálogo
  function openLinkModalReal(item) {
    setSelectedProductId('');
    setProductSearch('');
    setFormError(null);
    listProducts('').then(setCatalogProducts).catch(() => setCatalogProducts([]));
    setModal({ type: 'link', item });
  }

  // Abre modal "Cadastrar" pré-preenchendo com dados do DAV.
  // manufacturerReference/manufacturerName são essenciais para que o próximo
  // DAV com a mesma referência seja vinculado automaticamente ao produto.
  function openRegisterModalReal(item) {
    setRegisterForm({
      sku:                   item.rawSku ?? '',
      name:                  item.rawDescription ?? '',
      unit:                  ['UN','CX','SC','PC','CT','PR','M'].includes(item.unit) ? item.unit : 'UN',
      imageUrl:              '',
      manufacturerReference: item.manufacturerReference ?? '',
      manufacturerName:      item.manufacturerName      ?? '',
    });
    setFormError(null);
    setModal({ type: 'register', item });
  }

  // Abre modal "Ocultar" do item não vinculado (vai pra ignored_dav_items)
  function openHideUnlinkedModal(item) {
    setHideUnlinkedReason('');
    setFormError(null);
    setModal({ type: 'hide-unlinked', item });
  }

  return (
    <div className="ignored-page">
      <section className="hero ignored-hero">
        <div>
          <h1>Itens ignorados no picking</h1>
          <p>Gerencie itens ocultos, regras reais de ocultação e itens DAV não vinculados.</p>
        </div>
        <div className="hero-actions">
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
          label="Itens ocultos" description="Ocorrências ocultadas, não vão para o picking" />
        <StatCard icon={ICON_RULE} value={activeRulesCount}
          label="Regras ativas" description="Padrões que ocultam itens automaticamente"
          iconStyle={{ background: 'var(--primary-fixed)', color: 'var(--primary)' }} />
        <StatCard icon={ICON_UNLINKED} value={unlinkedCount}
          label="Não vinculados" description="Itens DAV sem produto no catálogo"
          iconStyle={{ background: '#fff2dd', color: '#b75a00' }} />
        <StatCard icon={ICON_HIDDEN} value={rules.filter((r) => !r.active).length}
          label="Regras inativas" description="Não serão aplicadas em novos DAVs"
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
            loading={loadingHidden}
            items={filteredHidden}
            onView={openViewModal}
          />
        )}

        {tab === 'rules' && (
          <RulesList
            rules={filteredRulesPattern}
            onView={openRuleViewModal}
            onEdit={openRuleEditModal}
            onToggle={(rule) => setModal({ type: 'toggle-rule', rule })}
            onDelete={(rule) => setModal({ type: 'delete-rule', rule })}
          />
        )}

        {tab === 'unlinked' && (
          <UnlinkedList
            loading={loadingUnlinked}
            items={filteredUnlinked}
            onLink={openLinkModalReal}
            onRegister={openRegisterModalReal}
            onHide={openHideUnlinkedModal}
            onCreateRule={(item) => openRuleModal({
              type: 'NAME_CONTAINS',
              value: item.rawDescription.split(' ').slice(0, 2).join(' '),
            })}
          />
        )}
      </section>

      {/* Modais */}
      {modal && (
        <ModalOverlay onClose={closeModal}>
          {modal.type === 'view' && (
            <ModalCard title="Detalhes do item oculto"
              subtitle={`DAV ${modal.item.davNumber ?? '—'} · ${modal.item.rawDescription ?? '—'}`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-rule-grid">
                  <span>DAV</span><strong>{modal.item.davNumber ?? '—'}</strong>
                  <span>Código/Ref.</span><strong><span className="ignored-code-ref">{modal.item.rawSku ?? modal.item.manufacturerReference ?? '—'}</span></strong>
                  <span>Descrição</span><strong>{modal.item.rawDescription ?? '—'}</strong>
                  <span>Fabricante</span><strong>{modal.item.manufacturerName ?? '—'}</strong>
                  <span>Quantidade</span><strong>{modal.item.quantity} {modal.item.unit ?? ''}</strong>
                  <span>Motivo</span><strong>{modal.item.ignoredReason ?? modal.item.resolutionNote ?? '—'}</strong>
                  <span>Regra</span><strong>{modal.item.ruleMatchType ?? '—'}</strong>
                  <span>Origem</span><strong>{modal.item.ignoredRuleId ? 'Oculto por regra' : 'Oculto manualmente'}</strong>
                  <span>Criado em</span><strong>{formatDate(modal.item.createdAt)}</strong>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'toggle-rule' && (
            <ModalCard title={modal.rule.active ? 'Desativar regra?' : 'Ativar regra?'}
              subtitle={modal.rule.active
                ? 'A regra não será aplicada nos próximos DAVs. Ocorrências já registradas continuam no histórico.'
                : 'A regra voltará a ser aplicada em novos DAVs.'}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-confirm-box">
                  <strong>{getRuleValue(modal.rule)}</strong>
                  <p>{modal.rule.active
                    ? 'Após desativar, novos itens compatíveis deixam de ser ocultados automaticamente.'
                    : 'Após ativar, novos itens compatíveis serão ocultados automaticamente.'}</p>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" type="button" onClick={confirmToggleRuleStatus} disabled={formLoading}>
                  {formLoading ? 'Salvando…' : (modal.rule.active ? 'Desativar regra' : 'Ativar regra')}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'delete-rule' && (
            <ModalCard title="Tem certeza que deseja apagar esta regra de ocultação?"
              subtitle="Essa ação impede que a regra seja aplicada em novos DAVs."
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-confirm-box">
                  <strong>{getRuleValue(modal.rule)}</strong>
                  <p>A ocorrência histórica de itens já ocultados será preservada para auditoria.</p>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-danger" type="button" onClick={confirmDeleteRule} disabled={formLoading}>
                  {formLoading ? 'Apagando…' : 'Apagar regra'}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'rule' && (
            <ModalCard title={modal.rule ? 'Editar regra de ocultação' : 'Nova regra de ocultação'}
              subtitle="Oculte automaticamente itens que correspondam a nome ou fabricante nos próximos DAVs."
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={saveRule}>
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
                <div className="ignored-modal-foot" style={{ marginTop: 16 }}>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={formLoading}>
                    {formLoading ? 'Salvando…' : (modal.rule ? 'Salvar regra' : 'Criar regra')}
                  </button>
                </div>
              </form>
            </ModalCard>
          )}

          {modal.type === 'rule-view' && (
            <ModalCard title="Detalhes da regra"
              subtitle={`${getRuleLabel(modal.rule)}: "${getRuleValue(modal.rule)}"`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-rule-grid">
                  <span>Tipo</span><strong>{getRuleLabel(modal.rule)}</strong>
                  <span>Valor</span><strong><span className="ignored-code-ref">{getRuleValue(modal.rule)}</span></strong>
                  <span>Motivo</span><strong>{modal.rule.reason}</strong>
                  <span>Status</span><strong>{modal.rule.active ? 'Ativa' : 'Inativa'}</strong>
                  <span>Valor normalizado</span><strong>{modal.rule.normalizedSku ?? modal.rule.normalizedDescription ?? '—'}</strong>
                  <span>Criada em</span><strong>{formatDate(modal.rule.createdAt)}</strong>
                </div>
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Fechar</button>
                {isSupportedRule(modal.rule) && (
                  <button className="btn btn-secondary" type="button" onClick={() => openRuleEditModal(modal.rule)}>
                    Editar
                  </button>
                )}
                {isSupportedRule(modal.rule) && (
                  <button className="btn btn-primary" type="button" onClick={() => setModal({ type: 'toggle-rule', rule: modal.rule })}>
                    {modal.rule.active ? 'Desativar regra' : 'Ativar regra'}
                  </button>
                )}
                <button className="btn btn-danger" type="button" onClick={() => setModal({ type: 'delete-rule', rule: modal.rule })}>
                  Apagar
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'link' && (
            <ModalCard title="Vincular a produto existente"
              subtitle={`${modal.item.rawSku} · ${modal.item.rawDescription}`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-confirm-box" style={{ marginBottom: 12 }}>
                  <strong>Origem do item</strong>
                  <p>DAV {modal.item.davNumber} · {modal.item.customerName} · Qtd. {modal.item.quantity} {modal.item.unit ?? ''}</p>
                </div>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 12, fontWeight: 800, textTransform: 'uppercase', color: 'var(--outline-strong)' }}>
                  Buscar produto no catálogo
                </label>
                <input type="search" value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Filtrar por SKU ou nome…"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1.5px solid var(--outline)', fontSize: 14, marginBottom: 12 }} />
                <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid var(--surface-variant)', borderRadius: 8 }}>
                  {catalogProducts
                    .filter((p) => {
                      const q = productSearch.trim().toLowerCase();
                      return !q || p.sku.toLowerCase().includes(q) || p.name.toLowerCase().includes(q);
                    })
                    .slice(0, 30)
                    .map((p) => (
                      <label key={p.id}
                        style={{
                          display: 'flex', gap: 10, padding: '10px 12px',
                          borderBottom: '1px solid var(--surface-variant)',
                          background: selectedProductId === p.id ? 'var(--primary-fixed)' : 'transparent',
                          cursor: 'pointer', fontSize: 13,
                        }}>
                        <input type="radio" name="catalogProduct" checked={selectedProductId === p.id}
                          onChange={() => setSelectedProductId(p.id)} />
                        <span className="ignored-code-ref">{p.sku}</span>
                        <span style={{ flex: 1 }}>{p.name}</span>
                        <span className="ignored-muted">{p.unit}</span>
                      </label>
                    ))}
                  {catalogProducts.length === 0 && (
                    <div className="ignored-muted" style={{ padding: 16, textAlign: 'center' }}>Carregando catálogo…</div>
                  )}
                </div>
                {formError && <div className="ignored-form-error" style={{ marginTop: 12 }}>{formError}</div>}
              </div>
              <div className="ignored-modal-foot">
                <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                <button className="btn btn-primary" type="button"
                  disabled={!selectedProductId || formLoading}
                  onClick={() => confirmLinkUnlinked(modal.item)}>
                  {formLoading ? 'Vinculando…' : 'Vincular ao produto'}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'register' && (
            <ModalCard title="Cadastrar novo produto"
              subtitle="Os dados do DAV são pré-preenchidos. Ajuste se necessário antes de salvar."
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={(e) => { e.preventDefault(); confirmRegisterUnlinked(modal.item); }}>
                <div className="ignored-form-grid">
                  <label>
                    <span>SKU / Código *</span>
                    <input value={registerForm.sku}
                      onChange={(e) => setRegisterForm({ ...registerForm, sku: e.target.value })}
                      required />
                  </label>
                  <label>
                    <span>Unidade *</span>
                    <select value={registerForm.unit}
                      onChange={(e) => setRegisterForm({ ...registerForm, unit: e.target.value })}>
                      {['UN','CX','SC','PC','CT','PR','M'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </label>
                  <label className="ignored-form-wide">
                    <span>Nome *</span>
                    <input value={registerForm.name}
                      onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                      maxLength={150} required />
                  </label>
                  {/* Referência e fabricante — chave para o matching automático no próximo DAV */}
                  <label>
                    <span>Ref. fabricante</span>
                    <input value={registerForm.manufacturerReference}
                      onChange={(e) => setRegisterForm({ ...registerForm, manufacturerReference: e.target.value })}
                      placeholder="Ex: W070123TX1022N" />
                  </label>
                  <label>
                    <span>Fabricante</span>
                    <input value={registerForm.manufacturerName}
                      onChange={(e) => setRegisterForm({ ...registerForm, manufacturerName: e.target.value })}
                      placeholder="Ex: MULTIMARCA" />
                  </label>
                  <label className="ignored-form-wide">
                    <span>URL da imagem (opcional)</span>
                    <input type="url" value={registerForm.imageUrl}
                      onChange={(e) => setRegisterForm({ ...registerForm, imageUrl: e.target.value })}
                      placeholder="https://…" />
                  </label>
                </div>
                <div className="ignored-confirm-box" style={{ marginTop: 12 }}>
                  <strong>Origem do item</strong>
                  <p>DAV {modal.item.davNumber} · {modal.item.customerName} · Qtd. {modal.item.quantity} {modal.item.unit ?? ''}</p>
                </div>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-modal-foot" style={{ marginTop: 16 }}>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={formLoading}>
                    {formLoading ? 'Cadastrando…' : 'Cadastrar produto'}
                  </button>
                </div>
              </form>
            </ModalCard>
          )}

          {modal.type === 'hide-unlinked' && (
            <ModalCard title="Ocultar item no picking"
              subtitle={`${modal.item.rawSku ?? '—'} · ${modal.item.rawDescription}`}
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={(e) => { e.preventDefault(); confirmHideUnlinked(modal.item); }}>
                <div className="ignored-confirm-box" style={{ marginBottom: 12 }}>
                  <strong>{modal.item.rawDescription}</strong>
                  <p>Origem: DAV {modal.item.davNumber} · {modal.item.customerName}</p>
                </div>
                <label className="ignored-form-wide">
                  <span>Motivo da ocultação *</span>
                  <textarea rows="3" value={hideUnlinkedReason}
                    onChange={(e) => setHideUnlinkedReason(e.target.value)}
                    placeholder="Ex: Serviço da fábrica, não exige separação física" />
                </label>
                {formError && <div className="ignored-form-error">{formError}</div>}
                <div className="ignored-modal-foot" style={{ marginTop: 16 }}>
                  <button className="btn btn-secondary" type="button" onClick={closeModal}>Cancelar</button>
                  <button className="btn btn-primary" type="submit" disabled={formLoading}>
                    {formLoading ? 'Ocultando…' : 'Ocultar e criar regra'}
                  </button>
                </div>
              </form>
            </ModalCard>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}
