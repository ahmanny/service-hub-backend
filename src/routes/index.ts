import { Router } from 'express';
import authRoutes from './auth';
import { consumerRoutes } from './consumer.route';
import { adminRoutes } from './admin.routes';
import { providerRoutes } from './provider.routes';
import { bookingRoutes } from './booking.route';
import { AuthMiddleware } from '../middlewares';
const routes = Router();
const Middleware = new AuthMiddleware();

routes.get('/', (_req, res) => {
    res.send('welcome Service Hub!');
});

// group by domain
routes.use('/auth', authRoutes);


routes.use(Middleware.validateToken)
routes.use('/consumer', consumerRoutes);
routes.use('/provider', providerRoutes);
routes.use('/booking', bookingRoutes);
routes.use('/admin', adminRoutes);

export default routes;
