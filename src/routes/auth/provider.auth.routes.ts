import { Router } from 'express';
import * as controller from '../../controllers/auth/provider.auth.controller';

export const providerAuthRoutes = Router();
// const userMiddleware = new UserMiddleware();


providerAuthRoutes.post('/sign-up', controller.signup())
providerAuthRoutes.post('/login', controller.loginController())
providerAuthRoutes.post('/google', controller.googleLoginController())
providerAuthRoutes.post('/logout', controller.logoutController())
providerAuthRoutes.post('/refresh', controller.refreshToken())
providerAuthRoutes.post('/forgotten-password', controller.forgottenPasswordController())
providerAuthRoutes.post('/password-reset', controller.passwordResetController());




// consumerAuthRoutes.post(
//     '/password-reset', upload.single('profilePicture'),
//     controller.completeRegistrationController()
// );