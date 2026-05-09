import mongoose, { Schema, Document, model, Types } from 'mongoose';

export type AuditActorType = 'admin' | 'system';
export type AuditOutcome = 'success' | 'failure' | 'info' | string;

export interface IAuditLog extends Document {
    actorId?: Types.ObjectId;
    actorType: AuditActorType;
    action: string;
    targetType?: string;
    targetId?: string | Types.ObjectId;
    outcome: AuditOutcome;
    details?: Record<string, any>;
    createdAt?: Date;
    updatedAt?: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
    {
        actorId: { type: Schema.Types.ObjectId, ref: 'Admin' },
        actorType: { type: String, enum: ['admin', 'system'], required: true },
        action: { type: String, required: true, index: true },
        targetType: { type: String, trim: true },
        targetId: { type: Schema.Types.Mixed, trim: true },
        outcome: { type: String, default: 'success', required: true },
        details: { type: Schema.Types.Mixed, default: {} },
    },
    {
        timestamps: true,
    }
);

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);

export const createAuditLog = (values: Partial<IAuditLog>) => new AuditLog(values).save();

export const queryAuditLogs = (filter: Record<string, any>, limit = 1000, skip = 0) =>
    AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);

export const countAuditLogs = (filter: Record<string, any>) => AuditLog.countDocuments(filter);
