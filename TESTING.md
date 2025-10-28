# Testing Strategy

This project currently lacks automated tests; below is a structured plan for adding meaningful coverage.

## 1. Scope Priorities
1. Stripe Webhook Event Handling
2. Refund Initiation Idempotency
3. Download Entitlement & Fraud Blocking
4. Checkout Session Reuse Logic
5. Cleanup Failed Payments Lambda

## 2. Suggested Tooling
- Node test runner: Vitest or Jest (Vitest already present for frontend; can reuse in backend if desired).
- Mock AWS SDK (dynamodb, secretsmanager) using lightweight stubs.
- Mock Stripe package with manual event fixtures.

## 3. Test Data Builders
Create small factory helpers:
```js
function buildOrder(overrides = {}) {
  return {
    id: 'ord_test_1',
    userId: 'user123',
    sellerId: 'seller456',
    status: 'approved',
    paymentStatus: 'initiated',
    total: 10,
    items: [ { productId: 'prod1', quantity: 1 } ],
    timeline: [],
    ...overrides
  };
}
```

## 4. Webhook Tests
| Case | Setup | Expected |
|------|-------|----------|
| checkout.session.completed success | Approved order; event amount matches | Status=completed, paymentStatus=succeeded, timeline contains payment_succeeded |
| checkout.session.completed mismatch | Amount diff | `requiresReview=true`, `suspiciousPayment=true` |
| payment_intent.payment_failed | Approved order | paymentStatus=failed, status unchanged |
| charge.refunded full | Completed order; matching paymentIntent | status=refunded, paymentStatus=refunded |
| charge.refunded partial | Completed order | Ignored (no state change) |
| charge.refunded missing metadata | Order found via PaymentIntentIndex | Refunded |

## 5. Refund Endpoint Tests
| Case | Expected |
|------|----------|
| Non-seller invokes | 403 |
| Missing payment intent | 409 |
| Already refunded | 409 or early exit |
| Idempotent second call | 409 |

## 6. Download Handler Tests
| Case | Expected |
|------|----------|
| Seller download | 200 URL |
| Buyer with completed order | 200 URL |
| Buyer without order | 403 |
| Buyer with requiresReview order | 423 |

## 7. Checkout Session Reuse
| Case | Expected |
|------|----------|
| Initiated < 30 min | Reused=true |
| Initiated > 30 min | New session |

## 8. Cleanup Failed Payments
| Case | Expected |
|------|----------|
| Approved + failed older than threshold | Status becomes cancelled |
| Approved + failed fresh | Unchanged |

## 9. Test Implementation Sketch (Webhook)
```js
import { handler as stripeWebhook } from '../../src/functions/webhooks/stripeWebhook.js';

it('completes order on checkout.session.completed', async () => {
  const eventPayload = buildStripeEvent('checkout.session.completed', { metadata: { orderId: 'ord_test_1' }, amount_total: 1000, payment_intent: 'pi_123' });
  const event = buildApiGatewayEvent(eventPayload, signatureFixture);
  const res = await stripeWebhook(event);
  expect(res.statusCode).toBe(200);
  const updated = await orderModel.get('ord_test_1');
  expect(updated.status).toBe('completed');
});
```

## 10. Fixture Utilities
- `buildStripeEvent(type, object)` returns JSON string used as raw body.
- `buildApiGatewayEvent(body, signature)` returns event shape with headers & raw body.
- Mock `stripe.webhooks.constructEvent` to return provided body directly.

## 11. Mocking Strategy
- Replace Stripe import via dependency injection (wrap creation in helper) or jest.mock('stripe').
- Mock orderModel with in-memory map.

## 12. Performance & Load Tests (Future)
- Simulate burst of checkout sessions to validate session reuse logic & TTL secret cache stability.
- Evaluate DynamoDB query latency for PaymentIntentIndex.

## 13. CI Recommendations
- GitHub Actions workflow: install deps, run `npm run test:backend`, run `npm run build`.
- Fail on uncovered critical paths (minimum 70% lines in webhook/refund handlers).

## 14. Edge Cases To Add Later
- Multiple sellers in order and refund authorization nuance.
- Secrets rotation mid-invocation (forceRefresh flag path).
- Handling of unexpected Stripe event types.

---
Incrementally add tests starting with webhook success/failure then refund idempotency. Keep factories small and deterministic.
