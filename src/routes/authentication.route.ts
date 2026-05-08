import { Router } from 'express';
import * as controller from '../controllers/auth.controller';

const authenticationRoutes = Router();

authenticationRoutes.post('/login', controller.authenticationLogin());
authenticationRoutes.post('/refresh-token', controller.refreshAuthenticationToken());
authenticationRoutes.post('/logout', controller.logout());

export default authenticationRoutes;
