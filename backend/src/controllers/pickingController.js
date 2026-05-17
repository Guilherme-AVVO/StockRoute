// ============================================================
// Controller HTTP do fluxo do estoquista.
//
// Concentra:
//   - parsing de multipart (multer disk) para a foto de confirmação;
//   - tradução de exceções do service em respostas REST;
//   - emissão de eventos de auditoria por ação.
// ============================================================

import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

import {
  listAvailableOrders,
  startPicking,
  getOrderForStockist,
  collectItem,
  markItemNotFound,
  finishPicking,
  getSummary,
} from '../services/pickingService.js';
import { logAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditService.js';
import { findActivePickingByUser } from '../../db/queries/picking.js';

// ------------------------------------------------------------
// Upload de foto de coleta
// ------------------------------------------------------------
// Destino: backend/uploads/picking — fica fora do bundle e deve estar no
// .gitignore (já presente como uploads/). É servido como estático em /uploads.
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads', 'picking');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename:    (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const safe = ext.replace(/[^.a-z0-9]/g, '');
    cb(null, `${Date.now()}-${randomUUID()}${safe}`);
  },
});

const upload = multer({
  storage,
  limits:     { fileSize: 8 * 1024 * 1024 }, // 8MB — fotos de celular
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Apenas imagens são aceitas para a foto de coleta'));
  },
});

export const collectPhotoUpload = upload.single('photoFile');

function publicPhotoUrl(filename) {
  // URL relativa servida pelo express.static em /uploads/picking.
  return `/uploads/picking/${filename}`;
}

// ------------------------------------------------------------
// Handlers
// ------------------------------------------------------------

export async function listAvailableOrdersController(_req, res, next) {
  try {
    const items = await listAvailableOrders();
    res.json({ items });
  } catch (err) { next(err); }
}

export async function startPickingController(req, res, next) {
  try {
    const order = await startPicking({ orderId: req.params.orderId, user: req.user, userId: req.user.id });
    await logAuditEvent({
      eventType:  AUDIT_EVENT_TYPES.PICKING_STARTED,
      entityType: 'order',
      entityId:   order.id,
      orderId:    order.id,
      davNumber:  order.davNumber,
      clientName: order.clientName,
      status:     'Em separação',
      title:      'Separação iniciada',
      description:`Estoquista ${req.user.name ?? req.user.email} iniciou a separação do pedido ${order.davNumber}.`,
    }, { req });
    res.status(200).json(order);
  } catch (err) {
    if (err?.status === 409 && err?.data?.activeOrderId) {
      return res.status(409).json({ message: err.message, activeOrderId: err.data.activeOrderId });
    }
    next(err);
  }
}

export async function getStockistOrderController(req, res, next) {
  try {
    const order = await getOrderForStockist({ orderId: req.params.orderId, user: req.user });
    res.json(order);
  } catch (err) { next(err); }
}

export async function collectItemController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Foto obrigatória para confirmar coleta.' });
    }
    const photoUrl = publicPhotoUrl(req.file.filename);
    const { item, order } = await collectItem({
      itemId:   req.params.itemId,
      user:     req.user,
      photoUrl,
    });
    await logAuditEvent({
      eventType:    AUDIT_EVENT_TYPES.PICKING_ITEM_COLLECTED,
      entityType:   'order_item',
      entityId:     item.id,
      orderId:      item.order_id,
      orderItemId:  item.id,
      davNumber:    order.order_number,
      clientName:   order.customer_name,
      status:       'Em separação',
      title:        'Item coletado',
      description:  `Item ${item.id} marcado como coletado por ${req.user.name ?? req.user.email}.`,
      evidenceType: 'image',
      evidenceUrl:  photoUrl,
    }, { req });
    res.json({
      id:                    item.id,
      status:                'COLETADO',
      rawStatus:             item.status,
      confirmationPhotoUrl:  item.confirmation_photo_url,
      collectedAt:           item.collected_at,
      reason:                null,
      notes:                 null,
    });
  } catch (err) {
    // Remove o arquivo gravado se a regra de negócio rejeitou a coleta.
    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }
    next(err);
  }
}

export async function markItemNotFoundController(req, res, next) {
  try {
    const { reason, notes } = req.body ?? {};
    const { item, order } = await markItemNotFound({
      itemId: req.params.itemId,
      user:   req.user,
      reason,
      notes,
    });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PICKING_ITEM_NOT_FOUND,
      entityType:  'order_item',
      entityId:    item.id,
      orderId:     item.order_id,
      orderItemId: item.id,
      davNumber:   order.order_number,
      clientName:  order.customer_name,
      status:      'Em separação',
      title:       'Item não encontrado',
      description: `Item ${item.id} marcado como não encontrado por ${req.user.name ?? req.user.email}. Motivo: ${reason}.`,
      metadata:    { reason, hasNotes: Boolean(notes?.trim()) },
    }, { req });
    res.json({
      id:                    item.id,
      status:                'NAO_ENCONTRADO',
      rawStatus:             item.status,
      reason:                item.not_found_reason,
      notes:                 item.not_found_notes,
      confirmationPhotoUrl:  item.confirmation_photo_url,
      collectedAt:           item.collected_at,
    });
  } catch (err) { next(err); }
}

export async function finishPickingController(req, res, next) {
  try {
    const summary = await finishPicking({ orderId: req.params.orderId, user: req.user });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.PICKING_FINISHED,
      entityType:  'order',
      entityId:    summary.order.id,
      orderId:     summary.order.id,
      davNumber:   summary.order.davNumber,
      clientName:  summary.order.clientName,
      status:      summary.rawFinalStatus === 'OBSERVATION' ? 'Observação' : 'Concluído',
      title:       'Separação finalizada',
      description: `Pedido ${summary.order.davNumber} finalizado como ${summary.finalStatus}. ${summary.collectedItems} coletados / ${summary.notFoundItems} não encontrados.`,
      metadata:    {
        finalStatus:    summary.rawFinalStatus,
        totalItems:     summary.totalItems,
        collectedItems: summary.collectedItems,
        notFoundItems:  summary.notFoundItems,
        durationMs:     summary.durationMs,
      },
    }, { req });
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ORDER_STATUS_CHANGED,
      entityType:  'order',
      entityId:    summary.order.id,
      orderId:     summary.order.id,
      davNumber:   summary.order.davNumber,
      clientName:  summary.order.clientName,
      status:      summary.rawFinalStatus === 'OBSERVATION' ? 'Observação' : 'Concluído',
      title:       `Pedido ${summary.finalStatus}`,
      description: `Status do pedido ${summary.order.davNumber} alterado para ${summary.rawFinalStatus}.`,
      metadata:    { previousStatus: 'PICKING', newStatus: summary.rawFinalStatus },
    }, { req });
    res.json(summary);
  } catch (err) { next(err); }
}

export async function getSummaryController(req, res, next) {
  try {
    const summary = await getSummary(req.params.orderId);
    if (!summary) return res.status(404).json({ message: 'Pedido não encontrado' });
    // Só o estoquista atribuído pode ver o resumo via esta rota
    if (summary.order.assignedTo && summary.order.assignedTo !== req.user.id) {
      return res.status(403).json({ message: 'Pedido atribuído a outro estoquista.' });
    }
    res.json(summary);
  } catch (err) { next(err); }
}

// Endpoint auxiliar: retorna o pedido EM_SEPARACAO atualmente do estoquista
// logado, se houver. Usado pelo frontend para retomar a tela de picking.
export async function getMyActivePickingController(req, res, next) {
  try {
    const active = await findActivePickingByUser(req.user.id);
    if (!active) return res.json({ active: null });
    const order = await getOrderForStockist({ orderId: active.id, user: req.user });
    res.json({ active: order });
  } catch (err) { next(err); }
}
