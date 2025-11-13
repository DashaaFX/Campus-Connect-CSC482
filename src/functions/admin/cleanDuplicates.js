//Baljinnyam Puntsagnorov
import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { UserModel } from '/opt/nodejs/models/User.js';
const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';
const SUBCATEGORIES_TABLE = process.env.SUBCATEGORIES_TABLE || 'Subcategories';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'POST,OPTIONS'
};
export const handler = async (event) => {
  try {
      // Check if user is admin (from JWT token)
      const userId = event.requestContext?.authorizer?.userId;
        if (!userId) return { ...createErrorResponse('User authentication required', 401), headers: CORS_HEADERS };
      const userModel = new UserModel();
      const user = await userModel.getById(userId);

      if (!user || user.role !== 'Admin') return { ...createErrorResponse('Admin access required', 403), headers: CORS_HEADERS };

    const { table } = event.queryStringParameters || {};
    
    if (!table || !['categories', 'subcategories'].includes(table)) {
      return createErrorResponse('Please specify table: categories or subcategories', 400);
    }

    let duplicatesRemoved = 0;

    if (table === 'categories') {
      duplicatesRemoved = await cleanCategoriesDuplicates();
    } else {
      duplicatesRemoved = await cleanSubcategoriesDuplicates();
    }

    return createSuccessResponse({
      message: `Duplicate cleanup completed for ${table}`,
      duplicatesRemoved
    });

  } catch (error) {
    console.error('Clean duplicates error:', error);
    return createErrorResponse(error.message, 500);
  }
};

//function to clean duplicate categories
async function cleanCategoriesDuplicates() {
  // Get all categories
  const scanParams = {
    TableName: CATEGORIES_TABLE
  };
  const result = await docClient.send(new ScanCommand(scanParams));
  const categories = result.Items || [];

  // lowercase, strip trailing digits/spaces, and s removed
  function normalize(name) {
    let n = name?.toLowerCase().replace(/\s*\d+$/, '').trim();
    if (n.endsWith('s') && n.length > 3) n = n.slice(0, -1);
    return n;
  }

  // Group by normalized name
  const normGroups = {};
  categories.forEach(category => {
    const norm = normalize(category.name);
    if (!normGroups[norm]) normGroups[norm] = [];
    normGroups[norm].push(category);
  });

  let duplicatesRemoved = 0;

  // For each group with similar names under the same category, keep the oldest and delete the rest
  for (const [norm, group] of Object.entries(normGroups)) {
    if (group.length > 1) {
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      for (let i = 1; i < group.length; i++) {
        await docClient.send(new DeleteCommand({
          TableName: CATEGORIES_TABLE,
          Key: { id: group[i].id }
        }));
        duplicatesRemoved++;
      }
    }
  }

  return duplicatesRemoved;
}

//clean duplicate subcategories
async function cleanSubcategoriesDuplicates() {
  // Get all subcategories
  const scanParams = {
    TableName: SUBCATEGORIES_TABLE
  };
  const result = await docClient.send(new ScanCommand(scanParams));
  const subcategories = result.Items || [];

  function normalize(name) {
    let n = name?.toLowerCase().replace(/\s*\d+$/, '').trim();
    if (n.endsWith('s') && n.length > 3) n = n.slice(0, -1);
    return n;
  }

  // Group by normalized name + categoryId
  const compositeGroups = {};
  subcategories.forEach(subcategory => {
    const norm = normalize(subcategory.name);
    const key = `${subcategory.categoryId}-${norm}`;
    if (!compositeGroups[key]) compositeGroups[key] = [];
    compositeGroups[key].push(subcategory);
  });

  let duplicatesRemoved = 0;

  // For each group with similar names under the same category, keep the oldest and delete the rest
  for (const [key, group] of Object.entries(compositeGroups)) {
    if (group.length > 1) {
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      for (let i = 1; i < group.length; i++) {
        await docClient.send(new DeleteCommand({
          TableName: SUBCATEGORIES_TABLE,
          Key: { id: group[i].id }
        }));
        duplicatesRemoved++;
      }
    }
  }

  return duplicatesRemoved;
}
