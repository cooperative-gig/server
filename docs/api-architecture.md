# API architecture

This guide explains the shared API behavior. Feature rules belong in their
feature module; these shared helpers make HTTP responses predictable for every
backend and frontend teammate.

## What happens to a request

`src/app.js` runs middleware in this order:

1. **Helmet and CORS** set browser security headers and allowed origins.
2. **Morgan** logs the request, including requests with invalid JSON.
3. **Express body parsers** read JSON and URL-encoded request bodies.
4. **API routes** handle known paths.
5. **Not-found middleware** handles paths that matched no route.
6. **Error middleware** turns errors from any earlier step into JSON.

Middleware is a function Express runs while processing a request. The last two
items are not duplicate handlers:

- `not-found.middleware.js` runs only when no route handled the URL. It creates
  a 404 error and passes it onward; it does not format the response itself.
- `error.middleware.js` is Express's central error handler. Its four arguments
  (`error, req, res, next`) tell Express to route errors there. It formats
  validation errors, `AppError`s, known Prisma errors, and unexpected errors
  with the same error envelope.

Express 5 forwards rejected async route handlers to the error middleware
automatically. Controllers do not need `try/catch` just to call `next(error)`.

## Success responses

Use `sendSuccess` in controllers instead of creating slightly different JSON
shapes. The response is:

```json
{
  "success": true,
  "message": "Gig created",
  "data": { "id": "gig-id" }
}
```

Optional pagination or other response metadata goes in `meta`. `data` defaults
to `null`, the status defaults to `200`, and `meta` is omitted if not provided.
Pass the numeric HTTP status directly when needed, such as `201` for creation:

```js
import { sendSuccess } from '../../shared/utils/response.js';

export function create(req, res) {
  const gig = { id: 'gig-id', ...req.validated.body };
  return sendSuccess(res, 'Gig created', gig, 201);
}
```

## Validate inputs in the route

Each feature owns its Zod schemas; shared `validate` middleware applies those
schemas to request body, route params, or query. Use `req.validated` in the
controller to get the parsed values (including transformations like trimming).

```js
// gigs.validation.js
import { z } from 'zod';

export const createGigSchema = z.object({
  title: z.string().trim().min(1),
});
```

```js
// gigs.routes.js
import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware.js';
import { createGigSchema } from './gigs.validation.js';
import * as controller from './gigs.controller.js';

const router = Router();
router.post('/', validate({ body: createGigSchema }), controller.create);
```

For route parameters or query strings, use `validate({ params: schema })` or
`validate({ query: schema })`. Invalid input returns status `400` and
`error.code: "VALIDATION_ERROR"` with field paths such as `body.title`.

## Expected errors from services

When a normal business condition prevents an operation, throw `AppError` in
the service. For example, a missing gig is expected and should return 404:

```js
import { AppError } from '../../shared/errors/app-error.js';

if (!gig) {
  throw new AppError('Gig not found.', {
    statusCode: 404,
    code: 'GIG_NOT_FOUND',
  });
}
```

Do not use `AppError` to hide programming or infrastructure failures. Those
should remain ordinary errors and become a generic 500 response.

## Errors and development vs production

Error responses have one shape:

```json
{
  "success": false,
  "error": {
    "code": "GIG_NOT_FOUND",
    "message": "Gig not found."
  }
}
```

`NODE_ENV` controls diagnostic details, not the API contract:

- In **development** (the default in `src/config/env.js`), error responses
  include a stack trace to help the team debug locally.
- In **production** (`NODE_ENV=production`), stack traces and unexpected
  internal error messages are not sent to clients. Expected `AppError` messages
  and validation field errors remain safe and useful to clients.

Known Prisma request errors are mapped selectively: `P2002` (unique value
conflict), `P2003` and `P2014` (relation conflict) return 409; `P2025` (record
not found) returns 404. Other Prisma errors remain 500 rather than being
misreported as client mistakes.

This project uses Prisma 7 with a PostgreSQL driver adapter. These mappings
apply when Prisma reports a known request error with one of the codes above.
Connection failures, driver errors, and other adapter-specific failures are
not safe to map to 4xx responses; they remain generic 500 errors. Check the
actual error type/code before adding another mapping.

The database URL is configured in `prisma7.config.js`, not in
`schema.prisma`. When running Prisma CLI commands, specify that config file,
for example `pnpm exec prisma generate --config prisma7.config.js`. The API
runtime separately reads `DATABASE_URL` and passes a PostgreSQL adapter to
`PrismaClient`.

## Test the API foundations

Run `pnpm test`. The API architecture tests cover the health response, created
responses, invalid and malformed input, missing query input, unknown routes,
business and unexpected errors, Prisma error mapping, and production
redaction.
