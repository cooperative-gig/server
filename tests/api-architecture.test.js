import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';

process.env.NODE_ENV = 'production';

const [{ default: express }, { z }, { default: apiApp }, { sendSuccess }, { AppError }, { validate }, { notFoundMiddleware }, { errorMiddleware }] = await Promise.all([
    import('express'),
    import('zod'),
    import('../src/app.js'),
    import('../src/shared/utils/response.js'),
    import('../src/shared/errors/app-error.js'),
    import('../src/middlewares/validate.middleware.js'),
    import('../src/middlewares/not-found.middleware.js'),
    import('../src/middlewares/error.middleware.js'),
]);

let apiServer;
let testServer;
let apiBaseUrl;
let testBaseUrl;

const testApp = express();
testApp.use(express.json());
testApp.post(
    '/success',
    validate({ body: z.object({ name: z.string().trim().min(1) }) }),
    (req, res) => sendSuccess(
        res,
        'Created',
        req.validated.body,
        201,
    ),
);
testApp.get(
    '/items',
    validate({ query: z.object({ id: z.string().min(1) }) }),
    (req, res) => sendSuccess(res, 'Found', req.validated.query),
);
testApp.get('/business-error', () => {
    throw new AppError('Item not found.', {
        statusCode: 404,
        code: 'ITEM_NOT_FOUND',
    });
});
testApp.get('/unexpected-error', () => {
    throw new Error('database password should not be exposed');
});
testApp.get('/unsafe-application-error', () => {
    throw new AppError('private application details', {
        statusCode: 500,
        code: 'PRIVATE_ERROR',
        details: ['private detail'],
    });
});
testApp.get('/database-conflict', (req, res, next) => {
    const error = new Error('private database details');
    error.name = 'PrismaClientKnownRequestError';
    error.code = 'P2002';
    next(error);
});
testApp.get('/database-missing', (req, res, next) => {
    const error = new Error('private database details');
    error.name = 'PrismaClientKnownRequestError';
    error.code = 'P2025';
    next(error);
});
testApp.use(notFoundMiddleware);
testApp.use(errorMiddleware);

function listen(app) {
    return new Promise((resolve, reject) => {
        const server = app.listen(0, () => {
            const address = server.address();
            if (!address || typeof address === 'string') {
                reject(new Error('Could not determine the test server address.'));
                return;
            }

            resolve({ server, baseUrl: `http://127.0.0.1:${address.port}` });
        });
        server.once('error', reject);
    });
}

before(async () => {
    const [api, testAppServer] = await Promise.all([listen(apiApp), listen(testApp)]);
    apiServer = api.server;
    apiBaseUrl = api.baseUrl;
    testServer = testAppServer.server;
    testBaseUrl = testAppServer.baseUrl;
});

after(async () => {
    await Promise.all([apiServer, testServer].map((server) => new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    })));
});

test('health endpoint uses the standard success envelope', async () => {
    const response = await fetch(`${apiBaseUrl}/api/v1/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.success, true);
    assert.equal(body.message, 'Cooperative Gig API is running');
    assert.equal(body.data, null);
    assert.equal(body.meta.version, 'v1');
});

test('successful POST returns the created status and parsed input', async () => {
    const response = await fetch(`${testBaseUrl}/success`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '  Coop  ' }),
    });
    const body = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(body, {
        success: true,
        message: 'Created',
        data: { name: 'Coop' },
    });
});

test('invalid request body returns a field-specific validation error', async () => {
    const response = await fetch(`${testBaseUrl}/success`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: '' }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.details[0].path, 'body.name');
});

test('malformed JSON returns a client error', async () => {
    const response = await fetch(`${testBaseUrl}/success`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{"name":',
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'INVALID_JSON');
});

test('missing required query input returns a validation error', async () => {
    const response = await fetch(`${testBaseUrl}/items`);
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.details[0].path, 'query.id');
});

test('unknown API route returns the standard not-found error', async () => {
    const response = await fetch(`${apiBaseUrl}/api/v1/unknown-endpoint`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'NOT_FOUND');
});

test('business errors keep their configured status and code', async () => {
    const response = await fetch(`${testBaseUrl}/business-error`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'ITEM_NOT_FOUND');
    assert.equal(body.error.message, 'Item not found.');
});

test('unexpected errors are redacted in production', async () => {
    const response = await fetch(`${testBaseUrl}/unexpected-error`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error.message, 'An unexpected error occurred.');
    assert.equal(JSON.stringify(body).includes('database password'), false);
    assert.equal('stack' in body.error, false);
});

test('500 application errors cannot expose custom codes or details', async () => {
    const response = await fetch(`${testBaseUrl}/unsafe-application-error`);
    const body = await response.json();

    assert.equal(response.status, 500);
    assert.equal(body.error.code, 'INTERNAL_SERVER_ERROR');
    assert.equal(body.error.message, 'An unexpected error occurred.');
    assert.equal(JSON.stringify(body).includes('PRIVATE_ERROR'), false);
    assert.equal(JSON.stringify(body).includes('private detail'), false);
});

test('known Prisma unique constraints map to conflict responses', async () => {
    const response = await fetch(`${testBaseUrl}/database-conflict`);
    const body = await response.json();

    assert.equal(response.status, 409);
    assert.equal(body.error.code, 'CONFLICT');
    assert.equal(JSON.stringify(body).includes('private database details'), false);
});

test('known Prisma missing records map to not-found responses', async () => {
    const response = await fetch(`${testBaseUrl}/database-missing`);
    const body = await response.json();

    assert.equal(response.status, 404);
    assert.equal(body.error.code, 'NOT_FOUND');
});
