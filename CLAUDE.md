# node-server-engine

TypeScript framework (published to npm) that backend services build on. Services are generated from
`node-server-template` and depend on this package; `backend-test-tools` provides test helpers for those services.

```
node-server-template ──depends on──▶ node-server-engine
        └──devDepends on──▶ backend-test-tools ──optional peer──▶ node-server-engine
```

The engine must **not** depend on `backend-test-tools` (that created a circular install). Its own test
helpers live in `test/helpers`.

## Commands

Node.js >= 22 (see `engines`).

| Task | Command |
| --- | --- |
| Install | `npm ci` |
| Tests (mocha + ts-node, sqlite in memory) | `npm test` |
| Single test file | `npm run test:file -- src/path/to/file.test.ts` |
| Lint | `npm run lint` |
| Type check | `npx tsc -p tsconfig.build.json --noEmit` |
| Build to `dist/` | `npm run build` |

Set `SILENCE_REPORT=1` to hide log output while running tests.

## Layout

- `src/index.ts`: public API. Exports `const`, `entities`, `utils`, and `middleware` as a namespace.
- `src/entities/`: main building blocks, one folder each (`Server`, `Endpoint`, `PubSub`, `Sequelize`,
  `Redis`, `SocketClient`, `SecretManager`, `GoogleCloudStorage`, `AWSS3`, `KeySet`, `EngineError`/`WebError`, ...).
- `src/middleware/`: Express middleware (auth: `authJwt`, `authHmac`, `authStatic`, `authTls`; uploads:
  `fileUploader`, `multiPartFileUploader`, `geminiFileUploader`; plus `error`, `checkPermission`,
  `verificationToken`, `swaggerDocs`, metrics, health check).
- `src/utils/`: helpers (`jwt`, `hmac`, `verificationToken`, `report` logging, `request`, `sendEmail`,
  `envAssert`/`checkEnvironment`, `dbMigration`, ...).
- `src/db/`: the engine's own Sequelize models and migrations.
- `test/`: mocha hooks (`hooks.ts`, `env.ts`), stubs, factories and `helpers` (JWT tokens and PKI/ECDSA
  key generation). Import them with `from 'test'`.

Each module folder has `name.ts`, `name.types.ts`, `index.ts` and a co-located `name.test.ts`.
Imports are absolute from `src` (`baseUrl: src`, for example `import { WebError } from 'entities/WebError'`).

## How a request flows

`Server` (`entities/Server/Server.ts`) builds two Express apps:
- Primary port (`PORT`): CORS (`CORS_ORIGIN`, a single origin or a comma-separated list), default
  middleware (health check, JSON body limit `REQUEST_SIZE_LIMIT`, metrics), then the global middleware,
  then each `Endpoint`, then the error middleware.
- Secondary port (`SECONDARY_PORT`): metrics, version and swagger docs.

`Endpoint` wires together the auth middleware for its `authType` (`NONE`, `JWT`, `TLS`, `HMAC`, `STATIC`),
validation (express-validator schema), any custom middleware, and the handler.
In `NODE_ENV=test`, JWTs are verified with HS256 and `JWT_SECRET` instead of ES256 and JWKS.

## Conventions and security rules

- Throw `WebError` (has `statusCode` and `errorCode`) for client errors and `EngineError` for internal
  errors. The error middleware only sends `errorCode`/`hint` to clients; `data` goes to the logs only.
- Never put tokens, passwords or secrets in error `data` or `reportDebug` data. `utils/report/output.ts`
  also redacts known sensitive keys (`password`, `token`, `authorization`, `secret`, `apiKey`, ...) as a
  safety net. Keep that list updated when you add new secret-like fields.
- Compare secrets with `crypto.timingSafeEqual` (see `authStatic`, `verificationToken`).
- Any client-supplied value used in a file path must be validated (see `multiPartFileUploader`:
  `SAFE_ID_PATTERN`, `isSafeFilename`).
- Verification bypass for a review account is opt-in only, through `VERIFICATION_BYPASS_SUBJECT` and
  `VERIFICATION_BYPASS_OTP`. Never hardcode test credentials.
- `sendEmail` verifies SMTP TLS certificates. `SMTP_TLS_REJECT_UNAUTHORIZED=false` is an explicit opt-out.
- Every package imported by `src/` must be listed in `dependencies`. Test-only packages go in
  `devDependencies`. Run `npm audit --omit=dev` before releasing.
- `overrides` pins Sequelize's `uuid` to a patched version. Remove it once Sequelize ships a fix.
- Document new environment variables in `.env.example` and `README.md`.

## Release

Conventional commits (`.commitlintrc.js`, enforced by husky). Pushing to `main` runs semantic-release
(`.github/workflows/release.yml`), which publishes to npm and updates `CHANGELOG.md`. Use `feat:`/`fix:`
for minor/patch releases, and a `BREAKING CHANGE:` footer for a major release.
