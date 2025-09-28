# Copilot Project Instructions

These instructions orient AI coding agents to work effectively in this repo. Keep responses concise, follow existing patterns, and prefer incremental changes.

## 1. Architecture Overview
- Monorepo style: `Frontend/` (React + Vite + Tailwind + Zustand) and `src/functions/` (AWS Lambda handlers grouped by domain) with a shared Lambda layer at `src/layers/shared/nodejs` mounted as `/opt/nodejs`.
- Backend is a collection of thin routing aggregators (`index.js` per domain) delegating to single-purpose handlers (`createProduct.js`, `login.js`, etc.). Responses standardized via `/opt/nodejs/utils/response.js`. Models live under `/opt/nodejs/models/*.js` (not shown here but imported in handlers) and encapsulate persistence (likely DynamoDB or similar).
- Auth: Custom authorizer injects `event.requestContext.authorizer.{userId,email,role}`; handlers trust these values (do NOT re‑parse JWT in handlers).
- Frontend consumes REST endpoints via `Frontend/src/utils/axios.js`, which attaches JWT from persisted Zustand storage (`auth-storage`).

## 2. Backend Conventions
- Each Lambda file exports `handler(event)` and returns already‑serialized objects via helpers: `createSuccessResponse(data, statusCode?)` / `createErrorResponse(message, statusCode?)`.
- Always `parseJSONBody(event.body)` then `validateRequiredFields(body, [...])`; return 400 on validation failure.
- Authorization: check presence of `event.requestContext.authorizer.userId` early; return 401 with standardized error helper.
- Field mapping: product creation maps `title` -> `name`; maintain this mapping if adding fields.
- Dates stored ISO strings: `new Date().toISOString()`; set both `createdAt` and `updatedAt` when creating records; update only `updatedAt` on mutations.
- CORS: Some handlers (e.g. orders) manually handle `OPTIONS` and append `Access-Control-Allow-*`. If adding a new endpoint under such domain file, replicate pattern for consistency (or factor into shared util if broadening use).
- Grouping logic: Orders group cart items by `sellerId`, enriching missing seller metadata—preserve this enrichment flow if refactoring.

## 3. Routing Pattern
- Domain `index.js` (e.g. `auth/index.js`) inspects `event.path` + `event.httpMethod` with simple `if (path.includes('/auth/login') && method==='POST')` branches. When adding routes, keep predicate style consistent; avoid over‑engineering (no heavy routers).

## 4. Shared Layer Usage
- Import from `/opt/nodejs/...` (Lambda layer) instead of relative paths. Maintain this for portability. Do not replace with `../../` style imports.
- Utilities observed: `utils/response.js`, `utils/jwt.js`, `constants/orderStatus.js`, and model classes (`UserModel`, `ProductModel`, `OrderModel`, `CartModel`). Reuse instead of re‑implementing logic (e.g., password verification, token generation).

## 5. Frontend Patterns
- State: Auth via Zustand store (`useAuthStore`), persisting only `user` + `token` (see `partialize`). When adding new auth state, ensure `partialize` includes what must persist.
- Routing: Centralized in `App.jsx` via `createBrowserRouter`; new pages added by extending the route array under root layout. Admin‑only wrappers use `AdminRoute` component.
- API Access: Use the axios instance (`api`) from `utils/axios.js`; it auto‑injects Authorization except for S3/upload URLs. Do not manually embed base URLs—use `USER_API_ENDPOINT` style constants from `utils/data.js` for consistency.
- User shape normalization: Login flow normalizes `_id` => `id` and ensures `profilePicture` mirrors `profile.profilePhoto`; preserve these post‑login adjustments.

## 6. Error & Response Discipline
- Never return raw exceptions; wrap with `createErrorResponse`. Log internal errors with `console.error('<context> error:', error)` pattern already used.
- Validation messages use plain, user‑readable strings (no internal codes). Follow existing tone.

## 7. Adding a New Backend Endpoint (Example Skeleton)
```js
import { SomeModel } from '/opt/nodejs/models/Some.js';
import { createSuccessResponse, createErrorResponse, parseJSONBody, validateRequiredFields } from '/opt/nodejs/utils/response.js';
export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return createErrorResponse('User authentication required', 401);
    const body = parseJSONBody(event.body);
    const required = ['fieldA'];
    const v = validateRequiredFields(body, required);
    if (!v.isValid) return createErrorResponse(v.message, 400);
    const model = new SomeModel();
    const entity = await model.create({ ...body, userId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    return createSuccessResponse({ message: 'Created successfully', entity }, 201);
  } catch (error) {
    console.error('Create some entity error:', error);
    return createErrorResponse(error.message, 500);
  }
};
```

## 8. Environment & Scripts
- Frontend scripts (run in `Frontend/`): `npm run dev` (Vite), `npm run build`, `npm run preview`, `npm run lint`.
- Backend appears deployed via AWS SAM (presence of `template.yaml`, `samconfig.toml`). Use `sam build` / `sam deploy` at repo root (confirm before automating since template not read here).
- API base URL configured via `VITE_API_BASE_URL` env var for frontend.

## 9. Do / Avoid
- Do: Reuse layer imports; keep handler signatures uniform; update both timestamps on create; respect existing grouping & mapping quirks.
- Avoid: Introducing new routing frameworks, bypassing response helpers, returning partial inconsistent user objects, changing persisted auth storage format without migration.

## 10. Quick Reference Key Files
- Backend handlers: `src/functions/**/<domain>.js`
- Auth router: `src/functions/auth/index.js`
- Product creation example: `src/functions/products/createProduct.js`
- Order grouping logic: `src/functions/orders/createOrder.js`
- Frontend state: `Frontend/src/store/useAuthStore.js`
- Axios/JWT wiring: `Frontend/src/utils/axios.js`
- Routing: `Frontend/src/App.jsx`

Provide changes in small, testable increments. Ask for missing context if a model or util path isn't found under `/opt/nodejs`.
