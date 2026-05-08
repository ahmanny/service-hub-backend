import { Request, Response, NextFunction } from 'express';
import { AdminRole } from '../types/admin.type';
import BadRequestException from '../exceptions/BadRequestException';
import { error_handler } from '../utils/response_handler';

export type AdminPermission = 
  | 'all'           // super-admin only
  | 'view_all'      // all roles can view
  | 'finance'       // finance and super-admin
  | 'support';      // support and super-admin

const rolePermissions: Record<AdminRole, AdminPermission[]> = {
  'super-admin': ['all', 'view_all', 'finance', 'support'],
  'support': ['view_all', 'support'],
  'finance': ['view_all', 'finance'],
};

export function checkAdminPermission(requiredPermission: AdminPermission) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const adminRole = req.adminRole;
      
      if (!adminRole) {
        throw new BadRequestException('Admin role not found');
      }

      const permissions = rolePermissions[adminRole];
      
      if (!permissions.includes(requiredPermission)) {
        throw new BadRequestException(`Access denied. This action requires ${requiredPermission} permission.`);
      }

      next();
    } catch (error) {
      error_handler(error, req, res);
    }
  };
}

export function canAccessFinance(req: Request): boolean {
  const role = req.adminRole;
  return role === 'super-admin' || role === 'finance';
}

export function canAccessSupport(req: Request): boolean {
  const role = req.adminRole;
  return role === 'super-admin' || role === 'support';
}

export function canAccessAll(req: Request): boolean {
  return req.adminRole === 'super-admin';
}

export function getAdminRoleLabel(role?: string): string {
  switch (role) {
    case 'super-admin':
      return 'Super Admin';
    case 'support':
      return 'Support';
    case 'finance':
      return 'Finance';
    default:
      return 'Admin';
  }
}