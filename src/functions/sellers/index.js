import { handler as createOnboardingLink } from './createOnboardingLink.js';
// ...existing imports...

export const handler = async (event) => {
  const path = event.path || '';
  const method = event.httpMethod;

  // CORS preflight for onboarding link
  if (path.includes('/sellers/onboarding-link') && method === 'OPTIONS') {
    return { statusCode: 200, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
      'Access-Control-Allow-Methods': 'POST,OPTIONS'
    }, body: '{}' };
  }
  // Onboarding link endpoint
  if (path.includes('/sellers/onboarding-link') && method === 'POST') {
    return await createOnboardingLink(event);
  }

  // ...existing routing logic...

  // Default: not found
  return {
    statusCode: 404,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ message: 'Not found' })
  };
};
