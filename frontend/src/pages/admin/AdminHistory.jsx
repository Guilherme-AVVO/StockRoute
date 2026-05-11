// Página ADMIN de Histórico.
// Consulta visual de eventos, evidências e decisões administrativas.
import { useMemo, useState } from 'react';
import StatCard from '../../components/admin/StatCard.jsx';
import './AdminHistory.css';

// Dados temporários usados apenas para montar a interface.
// Quando as APIs estiverem prontas, substituir por chamadas reais ao backend.
const EVENTS = [
  { id: 1, datetime: '13/05/2026 09:42', period: 'today', dav: '0000000113110', client: 'Projete Planejados', event: 'Pedido publicado', type: 'Publicação', responsible: 'Rafael Costa', status: 'Aguardando', evidence: '—', action: 'Ver' },
  { id: 2, datetime: '13/05/2026 10:05', period: 'today', dav: '0000000113108', client: 'Marcenaria Lopes', event: 'Item coletado', type: 'Item coletado', responsible: 'João Estoquista', status: 'Em separação', evidence: '1 foto', action: 'Ver' },
  { id: 3, datetime: '13/05/2026 10:12', period: 'today', dav: '0000000113105', client: 'Móveis Sob Medida ME', event: 'Item não encontrado', type: 'Não encontrado', responsible: 'Carlos Estoquista', status: 'Observação', evidence: 'motivo informado', action: 'Resolver' },
  { id: 4, datetime: '13/05/2026 10:20', period: 'today', dav: '0000000113105', client: 'Móveis Sob Medida ME', event: 'Decisão ADMIN', type: 'Decisão ADMIN', responsible: 'Rafael Costa', status: 'Observação', evidence: 'troca autorizada', action: 'Ver' },
  { id: 5, datetime: '13/05/2026 10:24', period: 'today', dav: '0000000113110', client: 'Projete Planejados', event: 'Item ignorado automaticamente', type: 'Ignorado automático', responsible: 'Sistema', status: 'Revisão', evidence: 'regra SERV-CORTE', action: 'Ver regra' },
  { id: 6, datetime: '13/05/2026 11:02', period: 'today', dav: '0000000113101', client: 'Casa & Cia Decorações', event: 'Pedido concluído', type: 'Separação', responsible: 'Maria Estoquista', status: 'Concluído', evidence: '31 fotos', action: 'Ver' },
  { id: 7, datetime: '12/05/2026 08:15', period: '7', dav: '0000000113098', client: 'Fragoso Móveis Planejados', event: 'Upload DAV', type: 'Upload DAV', responsible: 'Rafael Costa', status: 'Rascunho', evidence: 'PDF recebido', action: 'Ver' },
];

const FILTERS = ['Todos', 'Upload DAV', 'Publicação', 'Separação', 'Item coletado', 'Não encontrado', 'Decisão ADMIN', 'Ignorado automático'];
const PERIODS = [{ id: 'today', label: 'Hoje' }, { id: '7', label: '7 dias' }, { id: '30', label: '30 dias' }, { id: 'all', label: 'Todos' }];

function EventStatus({ status }) {
  const key = status.toLowerCase().replace(/\s/g, '-').replace('ç', 'c').replace('ã', 'a');
  return <span className={`history-status ${key}`}>{status}</span>;
}

export default function AdminHistory() {
  const [filter, setFilter] = useState('Todos');
  const [period, setPeriod] = useState('all');
  const [search, setSearch] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);
  const [selected, setSelected] = useState(EVENTS[0]);
  const [modalEvent, setModalEvent] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Filtros locais para timeline/histórico mockado.
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return EVENTS.filter((item) => {
      const byType = filter === 'Todos' || item.type === filter;
      const byPeriod = period === 'all' || item.period === period || (period === '30' && ['today', '7'].includes(item.period));
      const byPending = !onlyPending || item.status === 'Observação' || item.action === 'Resolver';
      const bySearch = !term
        || item.dav.toLowerCase().includes(term)
        || item.client.toLowerCase().includes(term)
        || item.responsible.toLowerCase().includes(term);
      return byType && byPeriod && byPending && bySearch;
    });
  }, [filter, onlyPending, period, search]);

  function openEvent(event) {
    setSelected(event);
    setModalEvent(event);
  }

  return (
    <div className="history-page">
      {/* Integração com sidebar: renderizada pela seção ativa "history". */}
      <section className="hero history-hero">
        <div>
          <h1>Histórico</h1>
          <p>Consulte pedidos, separações, evidências e decisões administrativas.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary" type="button" onClick={() => setFeedback('Exportação será integrada ao backend em uma próxima etapa.')}>Exportar relatório</button>
        </div>
      </section>

      {feedback && <div className="history-feedback" role="status">{feedback}</div>}

      <section className="history-stats-grid">
        <StatCard icon={<span />} value="128" label="Pedidos concluídos" description="Finalizados no histórico" />
        <StatCard icon={<span />} value="14" label="Pedidos com observação" description="Exigiram ação do ADMIN" />
        <StatCard icon={<span />} value="1.964" label="Fotos registradas" description="Evidências de coleta" />
        <StatCard icon={<span />} value="87" label="Ações administrativas" description="Decisões registradas" />
      </section>

      <section className="history-layout">
        <div className="history-main">
          <div className="card history-toolbar">
            <div className="history-filters">
              {FILTERS.map((item) => <button key={item} className={`chip-filter${filter === item ? ' active' : ''}`} type="button" onClick={() => setFilter(item)}>{item}</button>)}
            </div>
            <div className="history-periods">
              {PERIODS.map((item) => <button key={item.id} className={`history-period${period === item.id ? ' active' : ''}`} type="button" onClick={() => setPeriod(item.id)}>{item.label}</button>)}
            </div>
            <label className="history-search"><span>⌕</span><input placeholder="Buscar por DAV, cliente ou responsável..." value={search} onChange={(e) => setSearch(e.target.value)} /></label>
            <button className={`history-pending-toggle${onlyPending ? ' active' : ''}`} type="button" onClick={() => setOnlyPending((value) => !value)}>Somente eventos com pendência</button>
          </div>

          <div className="card history-table-card">
            {filteredEvents.length === 0 ? (
              <div className="history-empty">Nenhum evento encontrado para esta busca.</div>
            ) : (
              <>
                <table className="history-table">
                  <thead><tr><th>Data/hora</th><th>DAV</th><th>Cliente</th><th>Evento</th><th>Responsável</th><th>Status</th><th>Evidências</th><th>Ação</th></tr></thead>
                  <tbody>
                    {filteredEvents.map((item) => (
                      <tr key={item.id} className={selected?.id === item.id ? 'selected' : ''} onClick={() => setSelected(item)}>
                        <td><span className="history-date">{item.datetime}</span></td>
                        <td><span className="dav-id">{item.dav}</span></td>
                        <td><strong>{item.client}</strong></td>
                        <td><span className="history-event-dot" /> {item.event}</td>
                        <td><span className="history-muted">{item.responsible}</span></td>
                        <td><EventStatus status={item.status} /></td>
                        <td><span className="pending-pill zero">{item.evidence}</span></td>
                        <td><button className="history-action" type="button" onClick={(e) => { e.stopPropagation(); openEvent(item); }}>{item.action}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="history-mobile-list">
                  {filteredEvents.map((item) => (
                    <article className="history-mobile-card" key={item.id} onClick={() => setSelected(item)}>
                      <div><span className="history-date">{item.datetime}</span><strong>{item.event}</strong><small>{item.dav} · {item.client}</small></div>
                      <EventStatus status={item.status} />
                      <button className="btn btn-primary btn-sm" type="button" onClick={(e) => { e.stopPropagation(); openEvent(item); }}>{item.action}</button>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>

          <section className="history-evidence-grid">
            {['MDF Branco 18mm', 'Fita de borda', 'Parafuso 3.5mm'].map((name, index) => (
              <div className="card history-evidence-card" key={name}>
                <div className="history-photo-placeholder">Foto</div>
                <strong>{name}</strong>
                <span>DAV 00000001131{index} · Hoje 10:{index}5</span>
              </div>
            ))}
          </section>
        </div>

        <aside className="card history-side-card">
          <h2>Resumo do pedido selecionado</h2>
          {!selected ? <p>Selecione um evento para ver o resumo.</p> : (
            <div className="history-summary">
              <span>DAV</span><strong>{selected.dav}</strong>
              <span>Cliente</span><strong>{selected.client}</strong>
              <span>Status atual</span><EventStatus status={selected.status} />
              <span>Estoquista responsável</span><strong>{selected.responsible}</strong>
              <span>Início</span><strong>Hoje 09:40</strong>
              <span>Fim</span><strong>{selected.status === 'Concluído' ? 'Hoje 11:02' : '—'}</strong>
              <span>Duração</span><strong>1h22</strong>
              <span>Itens coletados</span><strong>14</strong>
              <span>Itens não encontrados</span><strong>{selected.status === 'Observação' ? 1 : 0}</strong>
              <span>Fotos anexadas</span><strong>{selected.evidence}</strong>
              <span>Decisões do ADMIN</span><strong>{selected.type === 'Decisão ADMIN' ? 1 : 0}</strong>
            </div>
          )}
        </aside>
      </section>

      {modalEvent && (
        <div className="history-modal-overlay open" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setModalEvent(null); }}>
          <div className="history-modal card">
            <div className="history-modal-head"><div><h2>{modalEvent.event}</h2><p>{modalEvent.dav} · {modalEvent.client}</p></div><button className="modal-close" type="button" onClick={() => setModalEvent(null)}>×</button></div>
            <div className="history-detail-grid">
              <span>Tipo</span><strong>{modalEvent.type}</strong>
              <span>Responsável</span><strong>{modalEvent.responsible}</strong>
              <span>Data/hora</span><strong>{modalEvent.datetime}</strong>
              <span>Evidências</span><strong>{modalEvent.evidence}</strong>
              <p>{modalEvent.type === 'Item coletado' ? 'SKU MDF-BR-18 coletado com 1 foto vinculada.' : modalEvent.type === 'Não encontrado' ? 'Motivo informado: item ausente no local. Pedido segue em observação.' : modalEvent.type === 'Ignorado automático' ? 'Regra SERV-CORTE aplicada. O item permanece registrado para auditoria.' : 'Evento registrado no histórico operacional do StockRoute.'}</p>
              {modalEvent.type === 'Item coletado' && <div className="history-photo-placeholder wide">Placeholder de foto</div>}
            </div>
            <div className="history-modal-foot"><button className="btn btn-secondary" type="button" onClick={() => setModalEvent(null)}>Fechar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
