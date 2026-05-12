import multer from 'multer';
import { importDav, getOrders, getOrder, publishOrder } from '../services/orderService.js';

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
    const result = await importDav(req.file.buffer);
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
    const order = await getOrder(req.params.id);
    if (!order) return res.status(404).json({ message: 'Pedido não encontrado' });
    return res.json(order);
  } catch (err) {
    next(err);
  }
}

export async function publishOrderController(req, res, next) {
  try {
    const order = await publishOrder(req.params.id);
    return res.json(order);
  } catch (err) {
    next(err);
  }
}
