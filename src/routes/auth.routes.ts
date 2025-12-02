import { Router } from 'express';
import * as controller from '../controllers/auth.controller';

export const auth = Router();
// const userMiddleware = new UserMiddleware();


auth.post('/sign-up', controller.signup())
auth.post('/login', controller.loginController())
auth.post('/google', controller.googleLoginController())
auth.post('/logout', controller.logoutController())
auth.post('/refresh', controller.refreshToken())
auth.post('/forgotten-password', controller.forgottenPasswordController())
auth.post('/password-reset', controller.passwordResetController());




// auth.post(
//     '/password-reset', upload.single('profilePicture'),
//     controller.completeRegistrationController()
// );