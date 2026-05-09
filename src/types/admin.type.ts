export type AdminRole = 'super-admin' | 'support' | 'finance';

export interface AdminUserType {
    _id: string;
    email: string;
    role: AdminRole;
    firstName?: string;
    lastName?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}
