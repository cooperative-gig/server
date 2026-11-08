import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'

import { env } from './config/env.js'
import apiRouter from './routes/index.js';

const app = express();

// security headers
app.use(helmet());

app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}));

// request body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// http request logger
app.use(morgan('dev'));

// GLOBAL ROUTES;
app.use('/api', apiRouter);



export default app;
