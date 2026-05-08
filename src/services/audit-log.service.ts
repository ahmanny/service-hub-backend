import { createAuditLog, queryAuditLogs, countAuditLogs } from '../models/audit-log.model';
import { IAuditLog } from '../models/audit-log.model';

class AuditLogServiceClass {
    constructor() { }

    public async record(event: Partial<IAuditLog>) {
        return createAuditLog(event);
    }

    public async getLogs(filters: {
        action?: string;
        actorType?: string;
        targetType?: string;
        outcome?: string;
        startDate?: string;
        endDate?: string;
        page?: number;
        limit?: number;
        adminId?: string;
    }) {
        const {
            action,
            actorType,
            targetType,
            outcome,
            startDate,
            endDate,
            page = 1,
            limit = 50,
            adminId,
        } = filters;

        const query: Record<string, any> = {};
        if (action) query.action = action;
        if (actorType) query.actorType = actorType;
        if (targetType) query.targetType = targetType;
        if (outcome) query.outcome = outcome;
        if (adminId) query.actorId = adminId;
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const pageNumber = Math.max(1, Number(page));
        const pageLimit = Math.min(500, Number(limit) || 50);
        const skip = (pageNumber - 1) * pageLimit;

        const [items, total] = await Promise.all([
            queryAuditLogs(query, pageLimit, skip),
            countAuditLogs(query),
        ]);

        return {
            items,
            pagination: {
                total,
                page: pageNumber,
                limit: pageLimit,
                pages: Math.ceil(total / pageLimit),
            },
        };
    }
}

export const AuditLogService = new AuditLogServiceClass();
