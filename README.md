# Campus Connect Backend & Frontend

A monorepo providing a serverless backend (AWS SAM + Lambda + DynamoDB + S3 + Stripe) and a React (Vite) frontend for digital product purchases.

## 1. High-Level Overview
- Users can register/login, view products, purchase digital items via Stripe Checkout.
- Orders progress: requested → approved → completed → refunded (full only) or cancelled/rejected.
- Stripe webhooks finalize payment success, failure, and full refunds.
- Short‑lived (120s) S3 presigned URLs gate digital asset downloads.
- Fraud mismatch sets `requiresReview` flag and blocks downloads until cleared.

## 2. Architecture
- AWS SAM template (`template.yaml`) defines Lambda functions grouped by domain: auth, products, cart, orders, admin, upload, webhooks, cleanup.
- Shared Lambda layer at `src/layers/shared/nodejs` exposes models and utilities under `/opt/nodejs`.
- Frontend (`Frontend/`) consumes REST endpoints with Axios and Zustand state stores.
- DynamoDB tables: Users, Products, Orders, Carts, Categories, Subcategories.
- New GSIs on Orders: `PaymentIntentIndex` (stripePaymentIntentId) and `StatusIndex` (status).
- CloudWatch scheduled Lambda `CleanupFailedPaymentsFunction` cancels stale failed-payment orders.

## 3. Stripe Integration
| Purpose | Mechanism |
|---------|-----------|
| Session Creation | POST `/orders/{id}/checkout-session` creates Stripe Checkout Session (digital products only). |
| Success Handling | Webhook `checkout.session.completed` sets order status to completed, captures payment intent id. |
| Failure Handling | Webhook `payment_intent.payment_failed` sets `paymentStatus=failed` (status stays approved for retry). |
| Full Refund | Seller/admin initiates POST `/orders/{id}/refund`; webhook `charge.refunded` finalizes order to refunded. |
| Signature Verification | Raw body required; secrets loaded via Secrets Manager (ARN env vars). |
| Fraud Check | Compares `amount_total` vs expected cents; mismatch sets `suspiciousPayment` + `requiresReview`. |

Supported webhook events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`.

## 4. Refund Flow (Full Only)
1. Seller/admin invokes refund endpoint.
2. Lambda creates Stripe refund (idempotency: lists existing refunds first).
3. Webhook `charge.refunded` marks order `status=refunded`, `paymentStatus=refunded`, appends timeline `refund_full`.
4. Digital download access revoked; frontend shows badge.

Partial refunds are deliberately ignored and logged.

## 5. Fraud Review & Download Blocking
- If Stripe amount mismatch occurs, order stores `requiresReview=true`.
- Download handler checks any granting order for `requiresReview`; returns HTTP 423 until cleared.
- Clearing requiresReview requires manual update (see Backend Operations doc).

## 6. Timeline Events Schema
Each event: `{ at, type, actor, actorType, actorId, meta }`.
- `actorType`: `user` | `system`.
- Normalized events include: payment_initiated, payment_succeeded, payment_failed, refund_full_initiated, refund_full, status_cancelled.

## 7. Endpoints (Key)
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | /orders | JWT | Create order (request) |
| POST | /orders/request | JWT | Alternate order creation |
| GET | /orders/{id} | JWT | Get order |
| GET | /orders/my-orders | JWT | Buyer orders |
| GET | /orders/seller-orders | JWT | Seller orders |
| PUT | /orders/{id}/status | JWT | Seller/admin update status |
| POST | /orders/{id}/checkout-session | JWT | Create Stripe Checkout Session |
| POST | /orders/{id}/refund | JWT | Initiate full refund |
| POST | /webhooks/stripe | None | Stripe webhook (signature verified) |
| GET | /products/{id}/download | JWT | Presigned URL if entitled |
| POST | /upload/url | JWT | Get S3 presigned upload URL |
| POST | /orders/{id}/mark-paid | JWT | (If retained) manual mark paid |

Plus auth, cart, admin category/subcategory endpoints.

## 8. Environment Variables
Backend (Globals + specific functions):
- ORDERS_TABLE, PRODUCTS_TABLE, USERS_TABLE, etc. (set automatically by SAM)
- STRIPE_SECRET_ARN, STRIPE_WEBHOOK_SECRET_ARN (Orders & Webhook functions)
- CLEANUP_FAILED_PAYMENT_MINUTES (default 180; can override per stage)
- FRONTEND_URL (used to build success/cancel redirect URLs; default http://localhost:5173)
- UPLOADS_BUCKET (for digital asset storage)

Frontend (.env):
- `VITE_API_BASE_URL` pointing to deployed API stage.

## 9. Secrets Manager
Two secrets recommended per stage:
- `campus-connect-stripe-secret-<env>`: `{ "secretKey": "sk_test_..." }`
- `campus-connect-stripe-webhook-secret-<env>`: `{ "webhookSecret": "whsec_..." }`
Rotate manually; code caches for 15 minutes (TTL). To force refresh sooner, redeploy or modify TTL logic.

## 10. DynamoDB Indexes & Data Model
Orders table GSIs:
- `UserIndex` (userId) for buyer queries.
- `SellerIndex` (sellerId) for seller queries.
- `PaymentIntentIndex` (stripePaymentIntentId) for refund webhook lookup.
- `StatusIndex` (status) for maintenance (cleanup, reporting).

New model methods in `OrderModel`:
- `listByPaymentIntent(paymentIntentId)`
- `listByStatus(status)`
- `listFailedPaymentApproved(cutoffIso)`

## 11. Scheduled Tasks
`CleanupFailedPaymentsFunction` (hourly): cancels approved orders with `paymentStatus=failed` older than configured minutes.

## 12. Deployment Steps
1. `sam build`
2. `sam deploy --guided` (first time) or reuse config.
3. After deploy, set real Stripe secret values in Secrets Manager ARNs.
4. In Stripe Dashboard: configure webhook to point to `/webhooks/stripe` stage URL; enable required events.
5. Confirm DynamoDB GSIs ACTIVE before relying on payment intent & status queries.

## 13. Local Development
- Backend: invoke functions locally with `sam local invoke` or use test events (ensure raw body for webhook simulation).
- Frontend: `cd Frontend && npm install && npm run dev`.
- For Stripe local testing: use `stripe trigger` CLI + `ngrok` forwarding to dev stack if needed.

## 14. Operational Procedures
See `BACKEND-OPERATIONS.md` (to be created) for:
- Clearing `requiresReview` flag.
- Manual refund verification.
- Rotating Stripe secrets.
- Re-processing missed webhooks.

## 15. Future Enhancements
- Admin endpoint to clear review flags.
- Automated test suite (webhook + refund flows).
- Partial refund support (if requirements change) with proportional entitlement logic.
- Single-use presigned URLs.
- Pagination & filtering (status/date ranges) using StatusIndex.

## 16. Troubleshooting
| Issue | Symptom | Action |
|-------|---------|--------|
| Invalid webhook signature | 400 from /webhooks/stripe | Verify raw body pass-through & signing secret matches Stripe dashboard. |
| Refund ignored | Log: "Partial refund ignored" | System only supports full refunds. Initiate full from dashboard or API. |
| Download blocked (423) | User sees review message | Clear `requiresReview` after manual validation. |
| Slow refund lookup | Log warns missing metadata | Ensure PaymentIntentIndex is ACTIVE and metadata orderId present. |
| Session reuse not working | New session created every call | Check `checkoutSessionCreatedAt` timestamp and paymentStatus is `initiated`. |

---
**License**: Proprietary (adjust as needed).
