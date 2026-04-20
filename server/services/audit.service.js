import AuditLog from '../models/AuditLog.js';

function buildLogId() {
  return `AUD-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function logFinancialAction({ userId, actionType, description, ipAddress = '' }) {
  if (!userId || !actionType || !description) return null;

  return AuditLog.create({
    logId: buildLogId(),
    userId,
    actionType,
    description,
    ipAddress,
    timestamp: new Date(),
  });
}

export const auditService = {
  logFinancialAction,
};