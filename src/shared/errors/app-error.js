export class AppError extends Error {
    constructor(message, {
        statusCode = 500,
        code = 'INTERNAL_SERVER_ERROR',
        details,
    } = {}) {
        super(message);

        this.name = 'AppError';
        this.statusCode = statusCode;
        this.code = code;

        if (details !== undefined) {
            this.details = details;
        }

        Error.captureStackTrace?.(this, AppError);
    }
}
