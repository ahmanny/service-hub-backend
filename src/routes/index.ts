import { Router } from 'express';
import authRoutes from './auth';
import { consumerRoutes } from './consumer.route';
import { adminRoutes } from './admin.routes';
const routes = Router();

routes.get('/', (_req, res) => {
    res.send('welcome Service Hub!');
});

// group by domain
routes.use('/auth', authRoutes);
routes.use('/consumer', consumerRoutes);
routes.use('/admin', adminRoutes);

export default routes;
