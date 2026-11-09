import { env } from '../config/env.js';
import { AppError } from '../shared/errors/app-error.js';

const prismaErrors = {
    P2002: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'A record with these values already exists.',
    },
    P2003: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'The request conflicts with a related record.',
    },
    P2014: {
        statusCode: 409,
        code: 'CONFLICT',
        message: 'The requested change conflicts with a relation.',
    },
    P2025: {
        statusCode: 404,
        code: 'NOT_FOUND',
        message: 'The requested record was not found.',
    },
};

function getErrorDetails(error) {
    if (error instanceof AppError) {
        return error.details;
    }

    if (error?.name === 'ZodError' && Array.isArray(error.issues)) {
        return error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
        }));
    }

    return undefined;
}

export function errorMiddleware(error, req, res, next) {
    if (res.headersSent) {
        return next(error);
    }

    let statusCode = 500;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected error occurred.';
    let exposeMessage = false;

    if (error instanceof AppError && error.statusCode < 500) {
        statusCode = error.statusCode;
        code = error.code;
        exposeMessage = true;
        message = error.message;
    } else if (error?.name === 'ZodError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Request validation failed.';
    } else if (error?.type === 'entity.parse.failed') {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'The request body contains invalid JSON.';
    } else if (error?.name === 'PrismaClientKnownRequestError' && prismaErrors[error.code]) {
        ({ statusCode, code, message } = prismaErrors[error.code]);
    }

    const errorBody = {
        code,
        message: exposeMessage ? error.message : message,
    };
    const details = getErrorDetails(error);

    if (details !== undefined && (
        env.NODE_ENV !== 'production' || code === 'VALIDATION_ERROR'
    )) {
        errorBody.details = details;
    }

    if (env.NODE_ENV !== 'production' && error?.stack) {
        errorBody.stack = error.stack;
    }

    return res.status(statusCode).json({
        success: false,
        error: errorBody,
    });
}
