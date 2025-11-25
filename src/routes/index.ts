import { Router, Request, Response } from 'express';
import { user } from './user.route';
import { auth } from './auth.routes';
import { UserMiddleware } from '../middlewares';
import { review } from './review.routes';
import { admin } from './admin.routes';

const routes = Router();
const userMiddleware = new UserMiddleware();

// Home route
routes.get('/', (req: Request, res: Response) => {
    res.send('Welcome to the API project!');
});

// API routes
// authentication not required
routes.use('/authentication', auth);
routes.use('/user', user);
routes.use('/review', review)

// authentication required
routes.use(userMiddleware.validateToken)
routes.use('/admin', admin);



export default routes;
