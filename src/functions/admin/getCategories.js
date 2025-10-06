//Baljinnyam Puntsagnorov
import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';

export const handler = async (event) => {
  try {
    const command = new ScanCommand({
      TableName: CATEGORIES_TABLE
    });

    const result = await docClient.send(command);
    const categories = result.Items || [];

    return createSuccessResponse({
      categories
    });

  } catch (error) {
    console.error('Get categories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
