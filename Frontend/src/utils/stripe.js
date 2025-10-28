import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

export function getStripe() {
  if (!stripePromise) {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
    if (!pk) {
      console.warn('[stripe] Missing VITE_STRIPE_PUBLISHABLE_KEY');
    }
    stripePromise = loadStripe(pk || '');
  }
  return stripePromise;
}

// Helper to redirect to an existing session id
export async function redirectToCheckout(sessionId) {
  if (!sessionId) throw new Error('sessionId required for redirect');
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe failed to initialize');
  const { error } = await stripe.redirectToCheckout({ sessionId });
  if (error) throw error;
}
