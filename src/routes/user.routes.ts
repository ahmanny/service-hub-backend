import { Router } from 'express';
import * as controller from '../controllers/user.controller';
import { AuthMiddleware } from '../middlewares';

export const userRoutes = Router();
const authMiddleware = new AuthMiddleware();

// Initial profile setup 

