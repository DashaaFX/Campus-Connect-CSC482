export const handler = async (event) => {
  console.log('CORS Handler called for:', event.httpMethod, event.path);
  
  // Get the HTTP method from the request context
  const requestContext = event.requestContext || {};
  const resourcePath = requestContext.resourcePath || event.path;
  
  // Determine allowed methods based on the path
  let allowedMethods = 'GET,POST,PUT,DELETE,OPTIONS,PATCH';
  
  // Specific allowed methods for certain paths
  if (resourcePath && resourcePath.includes('/products/{id}')) {
    // Ensure PUT and DELETE are allowed for product editing/deletion
    allowedMethods = 'GET,PUT,DELETE,OPTIONS';
    console.log('Enhanced CORS for product ID endpoint:', allowedMethods);
  }

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': allowedMethods,
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Requested-With',
      'Access-Control-Max-Age': '86400',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      message: 'CORS preflight successful',
      path: event.path,
      allowedMethods: allowedMethods
    })
  };
};
