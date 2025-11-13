//Baljinnyam Puntsagnorov
import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { PutCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { UserModel } from '/opt/nodejs/models/User.js';
const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';

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

    const { name, description } = JSON.parse(event.body);

    if (!name) {
      return createErrorResponse('Category name is required', 400);
    }

    // Check if category already exists by name
    const existingCategory = await checkCategoryExists(name);
    if (existingCategory) {
      return createErrorResponse('Category with this name already exists', 409);
    }

    // Create new category
    const categoryId = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const category = {
      id: categoryId,
      name: name.trim(),
      description: description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const params = {
      TableName: CATEGORIES_TABLE,
      Item: category,
      ConditionExpression: 'attribute_not_exists(id)'
    };

    await docClient.send(new PutCommand(params));

    return createSuccessResponse({
      message: 'Category created successfully',
      category
    });

  } catch (error) {
    console.error('Create category error:', error);
    
    if (error.name === 'ConditionalCheckFailedException') {
      return createErrorResponse('Category with this ID already exists', 409);
    }
    
    return createErrorResponse(error.message, 500);
  }
};

async function checkCategoryExists(name) {
  // Since we don't have a GSI on name, we'll do a scan
  try {
    const params = {
      TableName: CATEGORIES_TABLE,
      FilterExpression: '#name = :name',
      ExpressionAttributeNames: {
        '#name': 'name'
      },
      ExpressionAttributeValues: {
        ':name': name.trim()
      }
    };

    const result = await docClient.send(new ScanCommand(params));
    return result.Items && result.Items.length > 0 ? result.Items[0] : null;
  } catch (error) {
    console.error('Error checking category existence:', error);
    return null;
  }
}
