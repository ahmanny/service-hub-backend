import { Router } from "express";
import * as controller from '../../controllers/auth.controller';


export const adminAuthRoutes = Router()

adminAuthRoutes.post('/login', controller.authenticationLogin())
adminAuthRoutes.post('/refresh', controller.refreshSession())
adminAuthRoutes.post('/logout', controller.logout())