import { dynamodb } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';

export const handler = async (event) => {
  try {
    const params = {
      TableName: CATEGORIES_TABLE
    };

    const result = await dynamodb.scan(params).promise();
    const categories = result.Items || [];

    return createSuccessResponse({
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
