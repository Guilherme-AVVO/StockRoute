import multer from 'multer';
import fs from 'node:fs';
import { importDav, getOrders, getOrder, publishOrder } from '../services/orderService.js';
import { resolveMissingItemByAdmin, shipOrderWithMissing } from '../services/adminPickingService.js';
import { collectPhotoUpload } from './pickingController.js';
import { logAuditEvent, AUDIT_EVENT_TYPES } from '../services/auditService.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') return cb(null, true);
    cb(new Error('Apenas arquivos PDF são aceitos'));
  },
});

export const pdfUpload = upload.single('pdf');

export async function importDavController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Arquivo PDF não enviado (campo: pdf)' });
    }
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.DAV_UPLOADED,
      entityType:  'dav_upload',
      status:      'Rascunho',
      title:       'Upload de DAV recebido',
      description: `Arquivo "${req.file.originalname ?? 'DAV.pdf'}" enviado para importação.`,
      evidenceType: 'pdf',
      metadata:    { fileName: req.file.originalname, sizeBytes: req.file.size },
    }, { req });

    const result = await importDav(req.file.buffer);

    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.DAV_IMPORTED,
      entityType:  'order',
      entityId:    result.orderId,
      orderId:     result.orderId,
      davNumber:   result.orderNumber,
      clientName:  result.customerName,
      status:      'Concluído',
      title:       'DAV importado',
      description: `DAV ${result.orderNumber} importado para ${result.customerName}. ${result.counts.found} item(ns) com produto, ${result.counts.unlinked} sem vínculo, ${result.counts.ignored} ocultados.`,
      metadata:    result.counts,
    }, { req });

    return res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listOrdersController(req, res, next) {
  try {
    const { status, search } = req.query;
    const orders = await getOrders({ status, search });
    return res.json(orders);
  } catch (err) {
    next(err);
  }
}

export async function getOrderController(req, res, next) {
  try {
    const includeHidden = req.query.includeHidden === 'true';
    const order = await getOrder(req.params.id, { includeHidden });
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    return res.json(order);
  } catch (err) {
    next(err);
  }
}

// Reusa o uploader de fotos do picking (mesmo storage / limites / filtros).
export const adminResolveMissingUpload = collectPhotoUpload;

// POST /orders/:orderId/items/:itemId/resolve-missing
// ADMIN registra que um item antes faltante foi encontrado/recebido. Foto
// obrigatória. Quando todos os MISSING do pedido viram PICKED, o pedido
// é automaticamente promovido para COMPLETED.
export async function adminResolveMissingItemController(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Foto obrigatória para registrar a coleta do item.' });
    }
    const photoUrl = `/uploads/picking/${req.file.filename}`;
    const result = await resolveMissingItemByAdmin({
      orderId: req.params.orderId,
      itemId:  req.params.itemId,
      photoUrl,
    });

    const productLabel = result.itemMeta.productName
      ? `${result.itemMeta.productName}${result.itemMeta.productSku ? ` (${result.itemMeta.productSku})` : ''}`
      : `Item ${result.item.id}`;

    await logAuditEvent({
      eventType:    AUDIT_EVENT_TYPES.PICKING_ITEM_RESOLVED_BY_ADMIN,
      entityType:   'order_item',
      entityId:     result.item.id,
      orderId:      result.item.order_id,
      orderItemId:  result.item.id,
      davNumber:    result.itemMeta.orderNumber,
      clientName:   result.itemMeta.clientName,
      status:       result.promoted ? 'Concluído' : 'Observação',
      title:        'Item resolvido pelo administrador',
      description:  `${productLabel} marcado como coletado pelo ADMIN ${req.user.name ?? req.user.email}.`,
      evidenceType: 'image',
      evidenceUrl:  photoUrl,
      metadata:     {
        productName:       result.itemMeta.productName,
        sku:               result.itemMeta.productSku,
        remainingMissing:  result.remainingMissing,
        autoPromoted:      result.promoted,
      },
    }, { req });

    if (result.promoted) {
      await logAuditEvent({
        eventType:   AUDIT_EVENT_TYPES.ORDER_STATUS_CHANGED,
        entityType:  'order',
        entityId:    result.order.id,
        orderId:     result.order.id,
        davNumber:   result.itemMeta.orderNumber,
        clientName:  result.itemMeta.clientName,
        status:      'Concluído',
        title:       'Pedido concluído',
        description: `Pedido ${result.itemMeta.orderNumber} promovido para CONCLUÍDO após resolução das pendências pelo ADMIN.`,
        metadata:    { previousStatus: 'OBSERVATION', newStatus: 'COMPLETED', autoPromoted: true },
      }, { req });
    }

    res.json({
      item: {
        id:                    result.item.id,
        status:                'COLETADO',
        rawStatus:             result.item.status,
        confirmationPhotoUrl:  result.item.confirmation_photo_url,
        collectedAt:           result.item.collected_at,
        reason:                null,
        notes:                 null,
      },
      order: {
        id:          result.order.id,
        status:      result.order.status,
        finishedAt:  result.order.finished_at,
      },
      autoPromoted:     result.promoted,
      remainingMissing: result.remainingMissing,
    });
  } catch (err) {
    if (req.file?.path) fs.unlink(req.file.path, () => {});
    next(err);
  }
}

// POST /orders/:orderId/ship-with-missing
// ADMIN aceita enviar o pedido com itens MISSING. Status vira COMPLETED;
// itens MISSING continuam como tal (histórico preserva o que faltou).
export async function adminShipOrderWithMissingController(req, res, next) {
  try {
    const { notes } = req.body ?? {};
    const result = await shipOrderWithMissing({
      orderId: req.params.orderId,
      notes,
    });

    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ORDER_SHIPPED_WITH_MISSING,
      entityType:  'order',
      entityId:    result.order.id,
      orderId:     result.order.id,
      davNumber:   result.orderMeta.orderNumber,
      clientName:  result.orderMeta.clientName,
      status:      'Concluído',
      title:       'Pedido enviado com pendência',
      description: `ADMIN ${req.user.name ?? req.user.email} autorizou enviar o pedido ${result.orderMeta.orderNumber} com ${result.missingCount} item(ns) faltante(s).${result.notes ? ` Justificativa: ${result.notes}.` : ''}`,
      metadata:    {
        missingCount:    result.missingCount,
        justification:   result.notes,
        previousStatus:  'OBSERVATION',
        newStatus:       'COMPLETED',
      },
    }, { req });

    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ORDER_STATUS_CHANGED,
      entityType:  'order',
      entityId:    result.order.id,
      orderId:     result.order.id,
      davNumber:   result.orderMeta.orderNumber,
      clientName:  result.orderMeta.clientName,
      status:      'Concluído',
      title:       'Pedido concluído com pendência',
      description: `Status do pedido ${result.orderMeta.orderNumber} alterado para COMPLETED (envio autorizado com ${result.missingCount} item(ns) faltante(s)).`,
      metadata:    { previousStatus: 'OBSERVATION', newStatus: 'COMPLETED', shippedWithMissing: true },
    }, { req });

    res.json({
      order: {
        id:         result.order.id,
        status:     result.order.status,
        finishedAt: result.order.finished_at,
      },
      missingCount: result.missingCount,
      notes:        result.notes,
    });
  } catch (err) { next(err); }
}

export async function publishOrderController(req, res, next) {
  try {
    const order = await publishOrder(req.params.id);
    await logAuditEvent({
      eventType:   AUDIT_EVENT_TYPES.ORDER_PUBLISHED,
      entityType:  'order',
      entityId:    order.id,
      orderId:     order.id,
      davNumber:   order.orderNumber,
      clientName:  order.customerName,
      status:      'Aguardando',
      title:       'Pedido publicado para picking',
      description: `Pedido ${order.orderNumber} (${order.customerName}) publicado e disponível para separação.`,
    }, { req });
    return res.json(order);
  } catch (err) {
    next(err);
  }
}
