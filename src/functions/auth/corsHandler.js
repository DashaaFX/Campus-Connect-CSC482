export const handler = async (event) => {
  // Get the HTTP method from the request context
  const requestContext = event.requestContext || {};
  const resourcePath = requestContext.resourcePath || event.path;
  
  // Default allowed methods
  let allowedMethods = 'OPTIONS,GET,POST,PUT,DELETE';
  
  // Specific allowed methods for certain paths
  if (resourcePath && resourcePath.includes('/products/{id}')) {
    // Ensure PUT and DELETE are allowed for product editing/deletion
    allowedMethods = 'GET,PUT,DELETE,OPTIONS';
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
