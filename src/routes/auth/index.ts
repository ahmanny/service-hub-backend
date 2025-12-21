import { Router } from 'express';
import { providerAuthRoutes } from './provider.auth.routes';
import { consumerAuthRoutes } from './consumer.auth.routes';
// import adminAuthRoutes from './admin.auth.routes';

const router = Router();

router.use('/consumer', consumerAuthRoutes);
router.use('/provider', providerAuthRoutes);
// router.use('/admin', adminAuthRoutes);

export default router;
