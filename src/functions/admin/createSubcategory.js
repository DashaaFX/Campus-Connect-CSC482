//Baljinnyam Puntsagnorov
import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UserModel } from '/opt/nodejs/models/User.js';
const SUBCATEGORIES_TABLE = process.env.SUBCATEGORIES_TABLE || 'Subcategories';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.userId;
    if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
    const userModel = new UserModel();
    const user = await userModel.getById(userId);
    if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

    const { name, categoryId, description } = JSON.parse(event.body);

    if (!name || !categoryId) {
      return createErrorResponse('Name and categoryId are required', 400);
    }

    // Check if subcategory already exists for this category
    const existingSubcategory = await checkSubcategoryExists(name, categoryId);
    if (existingSubcategory) {
      return createErrorResponse('Subcategory with this name already exists in this category', 409);
    }

    // Create new subcategory with deterministic ID
    const subcategoryId = `${categoryId}-${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    const subcategory = {
      id: subcategoryId,
      name: name.trim(),
      categoryId: categoryId,
      description: description || `${name} subcategory`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: SUBCATEGORIES_TABLE,
      Item: subcategory,
      ConditionExpression: 'attribute_not_exists(id)'
    };

    await docClient.send(new PutCommand(params));

    return createSuccessResponse({
      message: 'Subcategory created successfully',
      subcategory
    });

  } catch (error) {
    console.error('Create subcategory error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return createErrorResponse('Subcategory with this ID already exists', 409);
    }
    
    return createErrorResponse(error.message, 500);
  }
};

async function checkSubcategoryExists(name, categoryId) {
  try {
    const params = {
      TableName: SUBCATEGORIES_TABLE,
      FilterExpression: '#name = :name AND categoryId = :categoryId',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name.trim(),
        ':categoryId': categoryId
      }
    };

    const result = await docClient.send(new ScanCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error checking subcategory existence:', error);
    return null;
  }
}
