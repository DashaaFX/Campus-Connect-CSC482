# Backend Operations Playbook

Practical runbook for production & staging operations.

## 1. Stripe Secret Rotation
1. Generate new secret key or webhook signing secret in Stripe dashboard.
2. Update corresponding Secrets Manager secret JSON:
   - `{ "secretKey": "sk_live_..." }`
   - `{ "webhookSecret": "whsec_..." }`
3. No redeploy required (functions refetch after TTL ≤ 15 minutes). To force immediate refresh: redeploy stack or temporarily set `forceRefresh` logic (future enhancement).

## 2. Clearing Fraud Review (`requiresReview`)
When an order flagged for mismatch is validated as safe:
1. In DynamoDB console locate the order item.
2. Remove or set `requiresReview` to `false`.
3. Optionally add timeline event manually (future: admin endpoint) e.g. `{ type: 'review_cleared', at: <ISO>, actor: 'admin', actorType: 'user', actorId: <adminId> }`.
4. User can now re-attempt download.

## 3. Manually Reprocessing Webhooks
If a Stripe event failed (e.g., temporary outage):
1. Retrieve the event ID from Stripe logs.
2. Use Stripe CLI: `stripe events retrieve <event_id>`.
3. Replay: `stripe events resend <event_id> --forward-to https://<api>/dev/webhooks/stripe`.
4. Verify order state updated.

## 4. Handling Missed Refunds
Symptom: Refund shows in Stripe, order not updated.
Checklist:
- Confirm event type was `charge.refunded` (not `payment_intent.refunded`).
- Ensure metadata `orderId` existed; if missing, PaymentIntentIndex lookup attempts to match via `stripePaymentIntentId`.
- Confirm PaymentIntentIndex ACTIVE.
- If still stuck: manually set `status=refunded`, `paymentStatus=refunded`, append timeline `{ type:'refund_full', meta:{ manual:true } }`.

## 5. Cancelling Stale Failed Payments Immediately
If you need manual run outside schedule:
1. Invoke Lambda `CleanupFailedPaymentsFunction` via console → Test.
2. Provide test payload (empty object works). Review response for `cancelled` count.

## 6. Changing Cleanup Threshold
Update environment variable `CLEANUP_FAILED_PAYMENT_MINUTES` in template.yaml for Orders & Cleanup functions; redeploy.

## 7. Backfilling `stripePaymentIntentId`
For legacy orders missing the field:
1. Export orders table.
2. Parse timeline events for `payment_succeeded` entries; extract `meta.paymentIntentId` if stored (add capturing logic if needed in future).
3. Batch write updates adding `stripePaymentIntentId` attribute for refund lookup.

## 8. Investigating Download Blocks (HTTP 423)
Cause: Any granting order has `requiresReview true`.
Steps:
1. Query orders by `status=completed` and buyer userId.
2. Filter where `requiresReview=true`.
3. Clear flag; create timeline event `review_cleared`.

## 9. Security Checks
- Ensure Stripe webhook function has no authorizer (Auth: NONE) but only listens to POST.
- Confirm Secrets Manager policies restricted to relevant functions.
- Monitor logs for `[orders-index-warning]` (indicates index fallback scans).

## 10. Observability Enhancements (Future)
- Add CloudWatch metric filters for `requiresReview`, `refund_full`, `payment_failed` counts.
- Integrate alerting (SNS) for suspicious payments.

## 11. Manual Full Refund via Dashboard
1. In Stripe Dashboard select charge → Refund.
2. Always include metadata: `orderId=<orderId>`.
3. Choose Full refund only.
4. Verify webhook updates order within seconds.

## 12. Common Pitfalls
| Pitfall | Resolution |
|---------|------------|
| Missing raw body leads to signature 400 | Adjust API Gateway integration; ensure Lambda receives unparsed string. |
| Partial refund attempted | System ignores; re-initiate full refund. |
| Duplicate refund initiated | Idempotency guard returns 409; ignore. |
| High DynamoDB RCUs after scans | Ensure GSIs are ACTIVE; investigate code paths using `getAll`. |

## 13. Emergency Disable Downloads
Set environment variable on Products function (future feature placeholder) or temporarily modify `downloadDigitalProduct.js` to always return 403; redeploy.

---
This document evolves with operational experience. Add runbook entries as new edge cases surface.


OrdersTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub Orders-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
        - AttributeName: userId
          AttributeType: S
        - AttributeName: sellerId
          AttributeType: S
        - AttributeName: stripePaymentIntentId
          AttributeType: S
        - AttributeName: status
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
      GlobalSecondaryIndexes:
        - IndexName: UserIndex
          KeySchema:
            - AttributeName: userId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
        - IndexName: SellerIndex
          KeySchema:
            - AttributeName: sellerId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
        - IndexName: PaymentIntentIndex
          KeySchema:
            - AttributeName: stripePaymentIntentId
              KeyType: HASH
          Projection:
            ProjectionType: ALL
        - IndexName: StatusIndex
          KeySchema:
            - AttributeName: status
              KeyType: HASH
          Projection:
            ProjectionType: ALL