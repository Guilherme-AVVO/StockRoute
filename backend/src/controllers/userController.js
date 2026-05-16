import {
  createUser,
  getUser,
  listUsers,
  setUserStatus,
  updateUser,
} from '../services/userService.js';
import { AUDIT_EVENT_TYPES, logAuditEvent } from '../services/auditService.js';

export async function listUsersController(req, res, next) {
  try {
    const users = await listUsers(req.query);
    return res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function getUserController(req, res, next) {
  try {
    const user = await getUser(req.params.id);
    return res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function createUserController(req, res, next) {
  try {
    const user = await createUser(req.body);
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.USER_CREATED,
      entityType: 'users',
      entityId: user.id,
      status: 'Concluído',
      title: 'Usuário criado',
      description: `Usuário ${user.name} criado com papel ${user.role}.`,
      metadata: { targetUserId: user.id, targetUserEmail: user.email, role: user.role, isActive: user.isActive },
    }, { req });
    return res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateUserController(req, res, next) {
  try {
    const user = await updateUser(req.params.id, req.body);
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.USER_UPDATED,
      entityType: 'users',
      entityId: user.id,
      status: 'Concluído',
      title: 'Usuário atualizado',
      description: `Usuário ${user.name} atualizado.`,
      metadata: { targetUserId: user.id, targetUserEmail: user.email, role: user.role, isActive: user.isActive },
    }, { req });
    return res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function setUserStatusController(req, res, next) {
  try {
    const user = await setUserStatus(req.params.id, req.body?.isActive, req.user?.id);
    await logAuditEvent({
      eventType: AUDIT_EVENT_TYPES.USER_STATUS_CHANGED,
      entityType: 'users',
      entityId: user.id,
      status: user.isActive ? 'Aplicado' : 'Desativado',
      title: user.isActive ? 'Usuário reativado' : 'Usuário desativado',
      description: `Usuário ${user.name} foi ${user.isActive ? 'reativado' : 'desativado'}.`,
      metadata: { targetUserId: user.id, targetUserEmail: user.email, isActive: user.isActive },
    }, { req });

    return res.json({
      message: user.isActive ? 'Usuário reativado com sucesso.' : 'Usuário desativado com sucesso.',
      user,
    });
  } catch (err) {
    next(err);
  }
}
