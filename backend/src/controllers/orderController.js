import multer from 'multer';
import { importDav, getOrders, getOrder, publishOrder } from '../services/orderService.js';
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
