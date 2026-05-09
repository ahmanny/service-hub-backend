import { Router } from 'express';
import authRoutes from './auth';
import authenticationRoutes from './authentication.route';
import { consumerRoutes } from './consumer.route';
import { adminRoutes } from './admin.routes';
import { providerRoutes } from './provider.routes';
import { bookingRoutes } from './booking.route';
import { AuthMiddleware } from '../middlewares';
import { userRoutes } from './user.routes';
import { SearchRoutes } from './search.routes';
import { webhookRoutes } from './webhook.route';
import { marketingRoutes } from './marketing.route';
const routes = Router();
const Middleware = new AuthMiddleware();

routes.get('/', (_req, res) => {
    res.send('welcome Service Hub!');
});

// group by domain
routes.use('/authentication', authenticationRoutes);
routes.use('/auth', authRoutes);
routes.use("/webhooks", webhookRoutes);
routes.use("/marketing", marketingRoutes);

// Admin stream endpoint - skip global validateToken
routes.use('/admin', (req, res, next) => {
    if (req.path === '/dashboard-stream') {
        return next();
    }
    return Middleware.validateToken(req, res, next);
});

// Protected routes
routes.use('/users', userRoutes);
routes.use('/search', SearchRoutes);
routes.use('/consumer', consumerRoutes);
routes.use('/provider', providerRoutes);
routes.use('/bookings', bookingRoutes);
routes.use('/admin', adminRoutes);

export default routes;
