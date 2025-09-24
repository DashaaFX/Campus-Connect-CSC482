export const createResponse = (statusCode, body, headers = {}) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      ...headers
    },
    body: JSON.stringify(body)
  };
};

export const createSuccessResponse = (data, statusCode = 200) => {
  return createResponse(statusCode, { success: true, ...data });
};

export const createErrorResponse = (message, statusCode = 500, details = null) => {
  return createResponse(statusCode, { 
    success: false, 
    message,
    ...(details && { details })
  });
};

export const parseJSONBody = (body) => {
  try {
    return JSON.parse(body || '{}');
  } catch (error) {
    throw new Error('Invalid JSON in request body');
  }
};

export const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);
  if (missingFields.length > 0) {
    return { isValid: false, message: `Missing required fields: ${missingFields.join(', ')}` };
  }
  return { isValid: true };
};
