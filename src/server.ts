import express, { Express, NextFunction, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import createError from 'http-errors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import morgan from 'morgan';
import routes from './routes';
import type { TServerConfig } from './types';
import multer from 'multer';


const upload = multer()
export class InitServer {
    server: Express;
    database: typeof mongoose;

    constructor() {
        this.server = express();
        this.database = mongoose;
    }

    setup(config: TServerConfig) {
        // Setup server configs
        this.server.set('host', config.host);
        this.server.set('port', config.port);
        this.server.set('db_url', config.db_url);
        this.server.set('log_level', config.log_level);

        // Setup middlewares
        // this.server.use(upload.any())
        this.server.use(cors());
        this.server.use(helmet());
        this.server.use(morgan('tiny'));
        this.server.use(cookieParser());
        this.server.use(express.json());
        this.server.use(express.urlencoded({ extended: false }));

        // Setup routes
        this.server.use('/v1', routes);

        // Create 404 error if requested route is not defined
        this.server.use((req: Request, res: Response, next: NextFunction) => {
            res.status(404).send("Route not found")
        });
    }

    async start() {
        const host = this.server.get('host');
        const port = process.env.PORT || this.server.get('port') || 8000;

        try {
            await this.database.connect(process.env.DB_URL!);
            // await AuthService.create_Superadmin();
            this.server.listen(port, () => console.log(`[server]: server is running at ${host}:${port}`));
        } catch (error) {
            console.error(error);
            process.exit(1);
        }
    }
}
