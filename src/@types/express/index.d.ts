import { AdminRole } from '../../types/admin.type';

declare global {
  namespace Express {
    interface Request {
      adminRole?: AdminRole;
    }
  }
}

export {};