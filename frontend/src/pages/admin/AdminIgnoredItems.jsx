// Página ADMIN — Itens ignorados no picking.
// Centraliza ocorrências ocultas, regras reais de ocultação e itens DAV não vinculados.
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  listIgnoredDavItems,
  createIgnoredDavItem,
  updateIgnoredDavItem,
  setIgnoredDavItemActive,
  deleteIgnoredDavItem,
  formatReapplySummary,
} from '../../services/ignoredDavItemsService.js';
import {
  listUnlinkedDavItems,
  listUnlinkedDavItemGroups,
  registerProductFromGroup,
  linkGroupToProduct,
  hideUnlinkedGroup,
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
              <td><span className="ignored-by-rule-badge">{item.hiddenManually ? 'Oculto manualmente' : 'Oculto por regra'}</span></td>
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
              <span className="ignored-by-rule-badge">{item.hiddenManually ? 'Oculto manualmente' : 'Oculto por regra'}</span>
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

// Lista de GRUPOS de itens não vinculados.
// Cada linha representa um produto não cadastrado que aparece em 1..N pedidos.
function UnlinkedList({ loading, groups, expandedKey, onToggleExpand, onLink, onRegister, onHide, onCreateRule }) {
  if (loading) return <div className="ignored-empty"><p>Carregando itens não vinculados…</p></div>;

  if (groups.length === 0) {
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
            <th>Descrição</th>
            <th>Ref. fabricante</th>
            <th>Fabricante</th>
            <th>SKU interno</th>
            <th>Un.</th>
            <th>Ocorrências</th>
            <th>Qtd. total</th>
            <th>Pedidos</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.groupKey}>
              <tr>
                <td><span className="ignored-description">{g.rawDescription || '—'}</span></td>
                <td><span className="ignored-code-ref">{g.manufacturerReference || '—'}</span></td>
                <td><span className="ignored-muted">{g.manufacturerName || '—'}</span></td>
                <td><span className="ignored-code-ref">{g.sku || '—'}</span></td>
                <td><span className="ignored-muted">{g.unit || '—'}</span></td>
                <td><span className="counts"><span className="num">{g.occurrences}</span></span></td>
                <td><span className="counts"><span className="num">{g.totalQuantity}</span></span></td>
                <td>
                  <button type="button" className="link-like" onClick={() => onToggleExpand(g.groupKey)}>
                    {g.affectedOrdersCount} {g.affectedOrdersCount === 1 ? 'pedido' : 'pedidos'} {expandedKey === g.groupKey ? '▴' : '▾'}
                  </button>
                </td>
                <td>
                  <div className="ignored-actions">
                    <button type="button" onClick={() => onRegister(g)}>Cadastrar</button>
                    <button type="button" onClick={() => onLink(g)}>Vincular</button>
                    <button type="button" onClick={() => onHide(g)}>Ocultar</button>
                    <button type="button" onClick={() => onCreateRule(g)}>Criar regra</button>
                  </div>
                </td>
              </tr>
              {expandedKey === g.groupKey && (
                <tr className="ignored-group-orders-row">
                  <td colSpan="9">
                    <div className="ignored-group-orders">
                      <strong>Pedidos afetados:</strong>
                      <ul>
                        {g.orders.map((o) => (
                          <li key={o.orderId}>
                            DAV <span className="dav-id">{o.davNumber}</span> — {o.clientName} — qtd <strong>{o.quantity}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div className="ignored-mobile-list">
        {groups.map((g) => (
          <article className="ignored-mobile-card" key={g.groupKey}>
            <div className="ignored-mobile-head">
              <div>
                <strong>{g.rawDescription || '—'}</strong>
                <span className="ignored-source-line">Ref.: {g.manufacturerReference || '—'} · Fabricante: {g.manufacturerName || '—'}</span>
              </div>
              <span className="ignored-unlinked-badge">Não vinculado</span>
            </div>
            <div className="ignored-mobile-grid">
              <div>
                <span>Ocorrências</span>
                <strong>{g.occurrences} item(ns) em {g.affectedOrdersCount} pedido(s)</strong>
              </div>
              <div>
                <span>Qtd. total</span>
                <strong>{g.totalQuantity} {g.unit ?? ''}</strong>
              </div>
            </div>
            <div className="ignored-group-orders" style={{ marginTop: 8 }}>
              <strong>Pedidos afetados:</strong>
              <ul>
                {g.orders.map((o) => (
                  <li key={o.orderId}>DAV {o.davNumber} — {o.clientName} — qtd {o.quantity}</li>
                ))}
              </ul>
            </div>
            <div className="ignored-actions">
              <button type="button" onClick={() => onRegister(g)}>Cadastrar</button>
              <button type="button" onClick={() => onLink(g)}>Vincular</button>
              <button type="button" onClick={() => onHide(g)}>Ocultar</button>
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

  // Aba "Não vinculados" — grupos retornados pelo backend
  // (itens iguais em pedidos diferentes ficam sob a mesma entrada).
  const [unlinkedGroups, setUnlinkedGroups] = useState([]);
  const [loadingUnlinked, setLoadingUnlinked] = useState(true);
  const [expandedGroupKey, setExpandedGroupKey] = useState(null);

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

  // Recarrega aba "Não vinculados" — agora pede GRUPOS agrupados por produto
  // ao backend em vez de itens flat.
  const reloadUnlinked = useCallback(() => {
    setLoadingUnlinked(true);
    listUnlinkedDavItemGroups()
      .then(setUnlinkedGroups)
      .catch((err) => setFeedback(err.message))
      .finally(() => setLoadingUnlinked(false));
  }, []);

  useEffect(() => { reloadRules(); reloadHidden(); reloadUnlinked(); }, [reloadRules, reloadHidden, reloadUnlinked]);

  // Limpa busca ao trocar de aba
  useEffect(() => { setSearch(''); }, [tab]);

  // Contagens
  const activeHiddenCount = hiddenItems.length;
  const activeRulesCount  = rules.filter((r) => r.active && isSupportedRule(r)).length;
  // Em grupos, conta o número de "produtos" distintos não vinculados — é o
  // que o ADMIN precisa resolver. (Não somamos occurrences porque a aba
  // mostra um card por grupo.)
  const unlinkedCount     = unlinkedGroups.length;

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
    return unlinkedGroups.filter((g) => {
      if (!q) return true;
      const inOrders = (g.orders ?? []).some(
        (o) =>
          (o.davNumber ?? '').toLowerCase().includes(q)
          || (o.clientName ?? '').toLowerCase().includes(q),
      );
      return (
        (g.sku ?? '').toLowerCase().includes(q)
        || (g.manufacturerReference ?? '').toLowerCase().includes(q)
        || (g.manufacturerName ?? '').toLowerCase().includes(q)
        || (g.rawDescription ?? '').toLowerCase().includes(q)
        || inOrders
      );
    });
  }, [unlinkedGroups, search]);

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

  // Recarrega todas as listas afetadas por uma reaplicação de regras
  // (rules, ocultos e não vinculados podem mudar simultaneamente).
  const reloadAllAfterReapply = useCallback(() => {
    reloadRules();
    reloadHidden();
    reloadUnlinked();
  }, [reloadRules, reloadHidden, reloadUnlinked]);

  async function confirmToggleRuleStatus() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      setFeedback('Reaplicando regras aos itens existentes…');
      const { reapplySummary } = await setIgnoredDavItemActive(modal.rule.id, !modal.rule.active);
      const summaryText = formatReapplySummary(reapplySummary);
      const head = modal.rule.active
        ? 'Regra desativada.'
        : 'Regra ativada.';
      setFeedback(summaryText ? `${head} ${summaryText}` : head);
      closeModal();
      reloadAllAfterReapply();
    } catch (err) {
      setFeedback(err.message || 'Erro ao alterar status da regra');
      closeModal();
    }
  }

  async function confirmDeleteRule() {
    if (!modal?.rule) return;
    setFormLoading(true);
    try {
      setFeedback('Reaplicando regras aos itens existentes…');
      const { reapplySummary } = await deleteIgnoredDavItem(modal.rule.id);
      const summaryText = formatReapplySummary(reapplySummary);
      setFeedback(summaryText ? `Regra apagada. ${summaryText}` : 'Regra apagada com sucesso.');
      closeModal();
      reloadAllAfterReapply();
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

      setFeedback('Reaplicando regras aos itens existentes…');
      const isEdit = !!modal?.rule;
      const response = isEdit
        ? await updateIgnoredDavItem(modal.rule.id, payload)
        : await createIgnoredDavItem(payload);
      const summaryText = formatReapplySummary(response?.reapplySummary);
      const head = isEdit ? 'Regra editada.' : 'Regra de ocultação criada.';
      setFeedback(summaryText ? `${head} ${summaryText}` : head);
      closeModal();
      reloadAllAfterReapply();
    } catch (err) {
      setFormError(err.message || 'Erro ao criar regra');
    } finally {
      setFormLoading(false);
    }
  }

  // Aba "Não vinculados" — chamadas reais à API operando sobre GRUPOS.
  // Cada ação afeta todos os itens iguais em todos os pedidos ao mesmo tempo.

  // Vincula o grupo inteiro a um produto já existente do catálogo.
  async function confirmLinkUnlinked(group) {
    if (!selectedProductId) {
      setFormError('Selecione um produto do catálogo.');
      return;
    }
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await linkGroupToProduct({ groupKey: group.groupKey, productId: selectedProductId });
      setFeedback(`${res.linkedItemsCount} item(ns) vinculado(s) ao produto em ${res.affectedOrdersCount} pedido(s).`);
      closeModal();
      reloadUnlinked();
    } catch (err) {
      setFormError(err.message || 'Erro ao vincular grupo');
    } finally {
      setFormLoading(false);
    }
  }

  // Cadastra produto a partir do grupo e vincula todos os itens.
  async function confirmRegisterUnlinked(group) {
    setFormError(null);
    const { sku, name, unit, imageUrl, manufacturerReference, manufacturerName } = registerForm;
    if (!sku.trim() || !name.trim() || !unit.trim()) {
      setFormError('SKU, nome e unidade são obrigatórios.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await registerProductFromGroup({
        groupKey: group.groupKey,
        sku, name, unit,
        imageUrl: imageUrl || null,
        manufacturerReference: manufacturerReference || null,
        manufacturerName:      manufacturerName      || null,
      });
      setFeedback(`Produto "${name}" cadastrado e vinculado a ${res.linkedItemsCount} item(ns) em ${res.affectedOrdersCount} pedido(s).`);
      closeModal();
      reloadUnlinked();
    } catch (err) {
      setFormError(err.message || 'Erro ao cadastrar produto');
    } finally {
      setFormLoading(false);
    }
  }

  // Oculta o grupo inteiro: cria uma regra e marca todos os itens como HIDDEN.
  async function confirmHideUnlinked(group) {
    setFormError(null);
    if (!hideUnlinkedReason.trim()) {
      setFormError('Informe o motivo da ocultação.');
      return;
    }
    setFormLoading(true);
    try {
      const res = await hideUnlinkedGroup({ groupKey: group.groupKey, reason: hideUnlinkedReason });
      setFeedback(`Grupo ocultado: ${res.hiddenItemsCount} item(ns) em ${res.affectedOrdersCount} pedido(s).`);
      closeModal();
      reloadUnlinked();
      reloadHidden();
      reloadRules();
    } catch (err) {
      setFormError(err.message || 'Erro ao ocultar grupo');
    } finally {
      setFormLoading(false);
    }
  }

  // Abre modal de "Vincular" carregando catálogo. Agora opera sobre o GRUPO.
  function openLinkModalReal(group) {
    setSelectedProductId('');
    setProductSearch('');
    setFormError(null);
    listProducts('').then(setCatalogProducts).catch(() => setCatalogProducts([]));
    setModal({ type: 'link', group });
  }

  // Abre modal "Cadastrar" pré-preenchendo com dados do grupo (sample).
  // manufacturerReference/manufacturerName são essenciais para que os
  // próximos DAVs com a mesma referência sejam vinculados automaticamente.
  function openRegisterModalReal(group) {
    setRegisterForm({
      sku:                   group.sku ?? '',
      name:                  group.rawDescription ?? '',
      unit:                  ['UN','CX','SC','PC','CT','PR','M'].includes(group.unit) ? group.unit : 'UN',
      imageUrl:              '',
      manufacturerReference: group.manufacturerReference ?? '',
      manufacturerName:      group.manufacturerName      ?? '',
    });
    setFormError(null);
    setModal({ type: 'register', group });
  }

  // Abre modal "Ocultar" do grupo
  function openHideUnlinkedModal(group) {
    setHideUnlinkedReason('');
    setFormError(null);
    setModal({ type: 'hide-unlinked', group });
  }

  function toggleExpandGroup(key) {
    setExpandedGroupKey((cur) => (cur === key ? null : key));
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
            groups={filteredUnlinked}
            expandedKey={expandedGroupKey}
            onToggleExpand={toggleExpandGroup}
            onLink={openLinkModalReal}
            onRegister={openRegisterModalReal}
            onHide={openHideUnlinkedModal}
            onCreateRule={(group) => openRuleModal({
              type: 'NAME_CONTAINS',
              value: (group.rawDescription ?? '').split(' ').slice(0, 2).join(' '),
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
                  <span>Origem</span><strong>{modal.item.hiddenManually ? 'Oculto manualmente' : 'Oculto por regra'}</strong>
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
            <ModalCard title="Vincular grupo a produto existente"
              subtitle={`${modal.group.manufacturerReference ?? modal.group.sku ?? '—'} · ${modal.group.rawDescription ?? '—'}`}
              onClose={closeModal}>
              <div className="ignored-modal-body">
                <div className="ignored-confirm-box" style={{ marginBottom: 12 }}>
                  <strong>Grupo selecionado</strong>
                  <p>{modal.group.occurrences} item(ns) em {modal.group.affectedOrdersCount} pedido(s) · qtd. total {modal.group.totalQuantity} {modal.group.unit ?? ''}</p>
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
                  onClick={() => confirmLinkUnlinked(modal.group)}>
                  {formLoading ? 'Vinculando…' : 'Vincular grupo ao produto'}
                </button>
              </div>
            </ModalCard>
          )}

          {modal.type === 'register' && (
            <ModalCard title="Cadastrar novo produto"
              subtitle="Os dados do grupo são pré-preenchidos. Cadastrar aqui vincula o produto a todos os pedidos afetados."
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={(e) => { e.preventDefault(); confirmRegisterUnlinked(modal.group); }}>
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
                  <strong>Grupo selecionado</strong>
                  <p>{modal.group.occurrences} item(ns) em {modal.group.affectedOrdersCount} pedido(s) · qtd. total {modal.group.totalQuantity} {modal.group.unit ?? ''}</p>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0, fontSize: 12 }}>
                    {modal.group.orders.slice(0, 5).map((o) => (
                      <li key={o.orderId}>DAV {o.davNumber} — {o.clientName} — qtd {o.quantity}</li>
                    ))}
                    {modal.group.orders.length > 5 && (
                      <li>… e mais {modal.group.orders.length - 5} pedido(s)</li>
                    )}
                  </ul>
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
            <ModalCard title="Ocultar grupo no picking"
              subtitle={`${modal.group.manufacturerReference ?? modal.group.sku ?? '—'} · ${modal.group.rawDescription ?? '—'}`}
              onClose={closeModal}>
              <form className="ignored-form" onSubmit={(e) => { e.preventDefault(); confirmHideUnlinked(modal.group); }}>
                <div className="ignored-confirm-box" style={{ marginBottom: 12 }}>
                  <strong>{modal.group.rawDescription ?? '—'}</strong>
                  <p>{modal.group.occurrences} item(ns) em {modal.group.affectedOrdersCount} pedido(s) — todos serão ocultados.</p>
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
