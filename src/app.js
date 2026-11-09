import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import morgan from 'morgan'

import { env } from './config/env.js'
import apiRouter from './routes/index.js'
import { errorMiddleware } from './middlewares/error.middleware.js'
import { notFoundMiddleware } from './middlewares/not-found.middleware.js'

const app = express()

// security headers
app.use(helmet())

app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}))

// log requests before parsing so malformed bodies are logged too
app.use(morgan('dev'))

// request body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// API routes
app.use('/api', apiRouter)

app.use(notFoundMiddleware)
app.use(errorMiddleware)

export default app
