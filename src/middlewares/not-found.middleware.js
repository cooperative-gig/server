import { AppError } from '../shared/errors/app-error.js';

export function notFoundMiddleware(req, res, next) {
    next(new AppError(`Route ${req.method} ${req.originalUrl} was not found.`, {
        statusCode: 404,
        code: 'NOT_FOUND',
    }));
}
