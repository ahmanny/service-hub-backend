import mongoose, { Schema, model, Document } from 'mongoose';
import { AdminRole } from '../types/admin.type';

export interface IAdminUser extends Document {
    email: string;
    password: string;
    role: AdminRole;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    lastLoginAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const AdminSchema = new Schema<IAdminUser>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            enum: ['super-admin', 'support', 'finance'],
            default: 'super-admin',
            required: true,
        },
        firstName: {
            type: String,
            trim: true,
        },
        lastName: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
            index: true,
        },
        lastLoginAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

export const Admin = model<IAdminUser>('Admin', AdminSchema);

export const getAdminByEmail = (email: string) =>
    Admin.findOne({ email: email.toLowerCase() });

export const getAdminById = (id: string) =>
    Admin.findById(id);

export const createAdmin = (values: Partial<IAdminUser>) =>
    new Admin(values).save();

export const countAdmins = () => Admin.countDocuments();

export const getAllAdmins = () => Admin.find().sort({ createdAt: -1 }).select('-password');

export const updateAdminLastLogin = (id: string) =>
    Admin.findByIdAndUpdate(id, { lastLoginAt: new Date() }, { new: true });

export const updateAdminById = (id: string, data: Partial<IAdminUser>) =>
    Admin.findByIdAndUpdate(id, data, { new: true });

export const checkEmailExists = (email: string) =>
    Admin.findOne({ email: email.toLowerCase() });

export const countSuperAdmins = () => Admin.countDocuments({ role: 'super-admin', isActive: true });
