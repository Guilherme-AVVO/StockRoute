import {
  listAuditEventsPage,
  getAuditEvent,
  getAuditSummary,
} from '../services/auditService.js';

// Converte parâmetros de query string em filtros sanitizados.
function parseFilters(query = {}) {
  const out = {};
  if (query.search)    out.search    = String(query.search);
  if (query.eventType) out.eventType = String(query.eventType);
  if (query.status)    out.status    = String(query.status);
  if (query.davNumber) out.davNumber = String(query.davNumber);
  if (query.userId)    out.userId    = String(query.userId);
  if (query.dateFrom)  out.dateFrom  = new Date(query.dateFrom);
  if (query.dateTo)    out.dateTo    = new Date(query.dateTo);
  if (query.onlyPending === 'true' || query.onlyPending === true) out.onlyPending = true;
  if (query.page)  out.page  = query.page;
  if (query.limit) out.limit = query.limit;
  return out;
}

export async function listAuditEventsController(req, res, next) {
  try {
    const result = await listAuditEventsPage(parseFilters(req.query));
    return res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAuditSummaryController(req, res, next) {
  try {
    const summary = await getAuditSummary();
    return res.json(summary);
  } catch (err) {
    next(err);
  }
}

export async function getAuditEventController(req, res, next) {
  try {
    const event = await getAuditEvent(req.params.id);
    if (!event) return res.status(404).json({ message: 'Evento não encontrado' });
    return res.json(event);
  } catch (err) {
    next(err);
  }
}
