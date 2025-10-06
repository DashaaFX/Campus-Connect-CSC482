//Baljinnyam Puntsagnorov
import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';
import { ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';

const CATEGORIES_TABLE = process.env.CATEGORIES_TABLE || 'Categories';
const SUBCATEGORIES_TABLE = process.env.SUBCATEGORIES_TABLE || 'Subcategories';

export const handler = async (event) => {
  try {
    // Check if user is admin (from JWT token)
    const user = event.requestContext?.authorizer?.user;
    if (!user || user.role !== 'Admin') {
      return createErrorResponse('Admin access required', 403);
    }

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

async function cleanCategoriesDuplicates() {
  // Get all categories
  const scanParams = {
    TableName: CATEGORIES_TABLE
  };
  
  const result = await docClient.send(new ScanCommand(scanParams));
  const categories = result.Items || [];
  
  // Group by name to find duplicates
  const nameGroups = {};
  categories.forEach(category => {
    const name = category.name?.toLowerCase();
    if (!nameGroups[name]) {
      nameGroups[name] = [];
    }
    nameGroups[name].push(category);
  });

  let duplicatesRemoved = 0;

  // For each group with duplicates, keep the first one and delete the rest
  for (const [name, group] of Object.entries(nameGroups)) {
    if (group.length > 1) {
      // Sort by createdAt to keep the oldest
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Delete all but the first one
      for (let i = 1; i < group.length; i++) {
        await docClient.send(new DeleteCommand({
          TableName: CATEGORIES_TABLE,
          Key: { id: group[i].id }
        }));
        duplicatesRemoved++;
        console.log(`Deleted duplicate category: ${group[i].id} (${group[i].name})`);
      }
    }
  }

  return duplicatesRemoved;
}

async function cleanSubcategoriesDuplicates() {
  // Get all subcategories
  const scanParams = {
    TableName: SUBCATEGORIES_TABLE
  };
  
  const result = await docClient.send(new ScanCommand(scanParams));
  const subcategories = result.Items || [];
  
  // Group by name + categoryId to find duplicates
  const compositeGroups = {};
  subcategories.forEach(subcategory => {
    const key = `${subcategory.categoryId}-${subcategory.name?.toLowerCase()}`;
    if (!compositeGroups[key]) {
      compositeGroups[key] = [];
    }
    compositeGroups[key].push(subcategory);
  });

  let duplicatesRemoved = 0;

  // For each group with duplicates, keep the first one and delete the rest
  for (const [key, group] of Object.entries(compositeGroups)) {
    if (group.length > 1) {
      // Sort by createdAt to keep the oldest
      group.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      
      // Delete all but the first one
      for (let i = 1; i < group.length; i++) {
        await docClient.send(new DeleteCommand({
          TableName: SUBCATEGORIES_TABLE,
          Key: { id: group[i].id }
        }));
        duplicatesRemoved++;
        console.log(`Deleted duplicate subcategory: ${group[i].id} (${group[i].name})`);
      }
    }
  }

  return duplicatesRemoved;
}
