// Página ADMIN de Histórico.
// Consulta visual de eventos reais persistidos em audit_events. Todos os
// dados vêm da API — não há mais arrays mockados nesta tela.
import { useCallback, useEffect, useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import {
  listAuditEvents,
  getAuditSummary,
  EVENT_TYPE_LABELS,
  labelForEventType,
  deriveAction,
} from '../../services/auditService.js';
import './AdminHistory.css';

// Filtros derivados dos tipos de evento canônicos do backend.
const FILTER_TYPES = [
  { value: '', label: 'Todos' },
  ...Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const PERIODS = [
  { id: 'today', label: 'Hoje' },
  { id: '7',     label: '7 dias' },
  { id: '30',    label: '30 dias' },
  { id: 'all',   label: 'Todos'  },
];

function periodToRange(period) {
  if (period === 'all') return {};
  const now = new Date();
  if (period === 'today') {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { dateFrom: start.toISOString() };
  }
  const days = Number(period);
  if (!Number.isFinite(days)) return {};
  const start = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { dateFrom: start.toISOString() };
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function statusKey(status) {
  if (!status) return 'sistema';
  return status
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, '-');
}

function EventStatus({ status }) {
  if (!status) return <span className="history-status sistema">Sistema</span>;
  return <span className={`history-status ${statusKey(status)}`}>{status}</span>;
}

function evidenceLabel(event) {
  if (event.evidenceUrl) return event.evidenceType ?? 'Evidência';
  if (event.evidenceType) return event.evidenceType;
  return 'Sem evidência';
}

function renderMetadata(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return <p className="history-muted">Sem metadados adicionais.</p>;
  }
  return (
    <ul className="history-metadata-list">
      {Object.entries(metadata).map(([key, value]) => (
        <li key={key}>
          <span>{key}</span>
          <strong>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</strong>
        </li>
      ))}
    </ul>
  );
}

export default function AdminHistory() {
  const [filterType, setFilterType] = useState('');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [error, setError] = useState(null);

  const [selected, setSelected] = useState(null);
  const [modalEvent, setModalEvent] = useState(null);

  // Reload eventos sempre que filtros mudarem. Backend faz busca/filtro/período
  // — o frontend não duplica essa lógica.
  const reloadEvents = useCallback(() => {
    setLoadingEvents(true);
    setError(null);
    const filters = {
      ...(filterType  ? { eventType: filterType } : {}),
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(onlyPending ? { onlyPending: true }      : {}),
      ...periodToRange(period),
      limit: 100,
    };
    listAuditEvents(filters)
      .then((data) => {
        setEvents(data.items ?? []);
        // Mantém seleção se o evento ainda estiver na lista.
        setSelected((cur) => {
          if (!cur) return data.items?.[0] ?? null;
          return data.items?.find((e) => e.id === cur.id) ?? data.items?.[0] ?? null;
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingEvents(false));
  }, [filterType, period, search, onlyPending]);

  const reloadSummary = useCallback(() => {
    setLoadingSummary(true);
    getAuditSummary()
      .then(setSummary)
      .catch((err) => setError(err.message))
      .finally(() => setLoadingSummary(false));
  }, []);

  useEffect(() => { reloadEvents(); }, [reloadEvents]);
  useEffect(() => { reloadSummary(); }, [reloadSummary]);

  function openEvent(event) {
    setSelected(event);
    setModalEvent(event);
  }

  const cards = useMemo(() => ([
    { value: summary?.completedOrders        ?? 0, label: 'Pedidos concluídos',  description: 'Pedidos com status COMPLETED' },
    { value: summary?.ordersWithObservation  ?? 0, label: 'Eventos em observação', description: 'Exigem ação do ADMIN' },
    { value: summary?.registeredPhotos       ?? 0, label: 'Evidências registradas', description: 'Eventos com URL de evidência' },
    { value: summary?.adminActions           ?? 0, label: 'Ações administrativas', description: 'Eventos disparados por ADMIN' },
  ]), [summary]);

  return (
    <div className="history-page">
      <section className="hero history-hero">
        <div>
          <h1>Histórico</h1>
          <p>Consulte eventos reais persistidos no sistema. Filtre por tipo, período ou texto.</p>
        </div>
      </section>

      {error && <div className="history-feedback" role="status">{error}</div>}

      <section className="history-stats-grid">
        {cards.map((c) => (
          <StatCard key={c.label} icon={<span />} value={loadingSummary ? '…' : c.value} label={c.label} description={c.description} />
        ))}
      </section>

      <section className="history-layout">
        <div className="history-main">
          <div className="card history-toolbar">
            <div className="history-filters">
              {FILTER_TYPES.map((item) => (
                <button
                  key={item.value || 'all'}
                  className={`chip-filter${filterType === item.value ? ' active' : ''}`}
                  type="button"
                  onClick={() => setFilterType(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="history-periods">
              {PERIODS.map((item) => (
                <button
                  key={item.id}
                  className={`history-period${period === item.id ? ' active' : ''}`}
                  type="button"
                  onClick={() => setPeriod(item.id)}>
                  {item.label}
                </button>
              ))}
            </div>
            <label className="history-search">
              <span>⌕</span>
              <input
                placeholder="Buscar por DAV, cliente, responsável ou texto…"
                value={search}
                onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button
              className={`history-pending-toggle${onlyPending ? ' active' : ''}`}
              type="button"
              onClick={() => setOnlyPending((v) => !v)}>
              Somente eventos com pendência
            </button>
          </div>

          <div className="card history-table-card">
            {loadingEvents ? (
              <div className="history-empty">Carregando eventos…</div>
            ) : events.length === 0 ? (
              <div className="history-empty">
                Nenhum evento registrado para os filtros atuais.
              </div>
            ) : (
              <>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Data/hora</th>
                      <th>DAV</th>
                      <th>Cliente</th>
                      <th>Evento</th>
                      <th>Responsável</th>
                      <th>Status</th>
                      <th>Evidências</th>
                      <th>Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((item) => (
                      <tr
                        key={item.id}
                        className={selected?.id === item.id ? 'selected' : ''}
                        onClick={() => setSelected(item)}>
                        <td><span className="history-date">{formatDateTime(item.createdAt)}</span></td>
                        <td><span className="dav-id">{item.davNumber ?? '—'}</span></td>
                        <td><strong>{item.clientName ?? '—'}</strong></td>
                        <td><span className="history-event-dot" /> {item.title}</td>
                        <td><span className="history-muted">{item.responsibleName ?? '—'}</span></td>
                        <td><EventStatus status={item.status} /></td>
                        <td><span className="pending-pill zero">{evidenceLabel(item)}</span></td>
                        <td>
                          <button
                            className="history-action"
                            type="button"
                            onClick={(e) => { e.stopPropagation(); openEvent(item); }}>
                            {deriveAction(item)}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="history-mobile-list">
                  {events.map((item) => (
                    <article className="history-mobile-card" key={item.id} onClick={() => setSelected(item)}>
                      <div>
                        <span className="history-date">{formatDateTime(item.createdAt)}</span>
                        <strong>{item.title}</strong>
                        <small>{item.davNumber ?? '—'} · {item.clientName ?? '—'}</small>
                      </div>
                      <EventStatus status={item.status} />
                      <button
                        className="btn btn-primary btn-sm"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openEvent(item); }}>
                        {deriveAction(item)}
                      </button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <aside className="card history-side-card">
          <h2>Resumo do evento selecionado</h2>
          {!selected ? (
            <p>Selecione um evento para ver o resumo.</p>
          ) : (
            <div className="history-summary">
              <span>Tipo</span><strong>{labelForEventType(selected.eventType)}</strong>
              <span>DAV</span><strong>{selected.davNumber ?? '—'}</strong>
              <span>Cliente</span><strong>{selected.clientName ?? '—'}</strong>
              <span>Status</span><EventStatus status={selected.status} />
              <span>Responsável</span><strong>{selected.responsibleName ?? '—'}</strong>
              <span>Função</span><strong>{selected.responsibleRole ?? '—'}</strong>
              <span>Quando</span><strong>{formatDateTime(selected.createdAt)}</strong>
              <span>Evidência</span><strong>{evidenceLabel(selected)}</strong>
            </div>
          )}
        </aside>
      </section>

      {modalEvent && (
        <div
          className="history-modal-overlay open"
          role="dialog"
          aria-modal="true"
          onClick={(e) => { if (e.target === e.currentTarget) setModalEvent(null); }}>
          <div className="history-modal card">
            <div className="history-modal-head">
              <div>
                <h2>{modalEvent.title}</h2>
                <p>{(modalEvent.davNumber ?? '—')} · {modalEvent.clientName ?? '—'}</p>
              </div>
              <button className="modal-close" type="button" onClick={() => setModalEvent(null)}>×</button>
            </div>
            <div className="history-detail-grid">
              <span>Tipo</span><strong>{labelForEventType(modalEvent.eventType)}</strong>
              <span>Responsável</span><strong>{modalEvent.responsibleName ?? '—'} ({modalEvent.responsibleRole ?? '—'})</strong>
              <span>Data/hora</span><strong>{formatDateTime(modalEvent.createdAt)}</strong>
              <span>Status</span><EventStatus status={modalEvent.status} />
              <span>Evidência</span>
              <strong>
                {modalEvent.evidenceUrl ? (
                  <a href={modalEvent.evidenceUrl} target="_blank" rel="noreferrer">{evidenceLabel(modalEvent)}</a>
                ) : (
                  evidenceLabel(modalEvent)
                )}
              </strong>
              {modalEvent.description && (
                <>
                  <span>Descrição</span>
                  <strong className="history-description">{modalEvent.description}</strong>
                </>
              )}
              <span>Metadata</span>
              <div>{renderMetadata(modalEvent.metadata)}</div>
            </div>
            <div className="history-modal-foot">
              <button className="btn btn-secondary" type="button" onClick={() => setModalEvent(null)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
