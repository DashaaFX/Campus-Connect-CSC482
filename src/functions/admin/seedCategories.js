//Baljinnyam Puntsagnorov
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

    // Create categories in DynamoDB with duplicate prevention
    const promises = categories.map(async category => {
      const params = {
        TableName: CATEGORIES_TABLE,
        Item: {
          ...category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        // Prevent overwriting existing categories
        ConditionExpression: 'attribute_not_exists(id)'
      };
      
      try {
        return await docClient.send(new PutCommand(params));
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {

          return null; // Category already exists
        }
        throw error; // Re-throw other errors
      }
    });

    await Promise.all(promises);

    return createSuccessResponse({
      message: 'Categories seeded successfully (duplicates skipped)',
      categories
    });

  } catch (error) {
    console.error('Seed categories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
