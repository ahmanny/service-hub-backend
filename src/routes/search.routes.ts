import { Router } from 'express';
import * as SearchController from '../controllers/search.controller';

export const SearchRoutes = Router();

// GET /v1/search/providers?serviceType=barber&lat=6.45&lng=3.39
SearchRoutes.get('/providers', SearchController.discoverProviders());
