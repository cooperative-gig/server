import { AppError } from '../shared/errors/app-error.js';

const REQUEST_PARTS = ['body', 'params', 'query'];

export function validate(schemas) {
    return (req, res, next) => {
        const validated = {};
        const issues = [];

        for (const part of REQUEST_PARTS) {
            const schema = schemas[part];
            if (!schema) {
                continue;
            }

            const result = schema.safeParse(req[part]);
            if (result.success) {
                validated[part] = result.data;
                continue;
            }

            issues.push(...result.error.issues.map((issue) => ({
                path: [part, ...issue.path].join('.'),
                message: issue.message,
            })));
        }

        if (issues.length > 0) {
            return next(new AppError('Request validation failed.', {
                statusCode: 400,
                code: 'VALIDATION_ERROR',
                details: issues,
            }));
        }

        req.validated = validated;
        return next();
    };
}
