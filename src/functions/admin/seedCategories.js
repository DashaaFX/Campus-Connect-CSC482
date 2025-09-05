import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';

export const handler = async (event) => {
  try {
    const categories = [
      { id: 'academic', name: 'Academic', description: 'Academic materials and textbooks' },
      { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
      { id: 'dorm', name: 'Dorm', description: 'Dorm room essentials and furniture' },
      { id: 'clothing', name: 'Clothing', description: 'Apparel and accessories' },
      { id: 'supplies', name: 'Supplies', description: 'School and office supplies' },
      { id: 'sports', name: 'Sports', description: 'Sports equipment and fitness gear' },
      { id: 'miscellaneous', name: 'Miscellaneous', description: 'Other items and miscellaneous goods' }
    ];

    // Create categories in DynamoDB
    const promises = categories.map(category => {
      const params = {
        TableName: CATEGORIES_TABLE,
        Item: {
          ...category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
      return docClient.send(new PutCommand(params));
    });

    await Promise.all(promises);

    return createSuccessResponse({
      message: 'Categories seeded successfully',
      categories
    });

  } catch (error) {
    console.error('Seed categories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
