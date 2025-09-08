import { docClient } from '/opt/nodejs/utils/dynamodb.js';
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { createSuccessResponse, createErrorResponse } from '/opt/nodejs/utils/response.js';

export const handler = async (event) => {
  try {
    // Exact subcategory mapping from your MongoDB structure
    const subcategoryMap = {
      academic: ['textbooks', 'lab_manuals', 'solution_guides'],
      electronics: ['laptops', 'calculators'],
      dorm: ['minifridges', 'bedding'],
      clothing: ['formal_wear', 'winter_gear'],
      supplies: ['notebooks', 'pens'],
      sports: ['yoga_mats', 'bikes'],
      miscellaneous: ['games', 'suitcases'],
    };

    const subcategoriesData = [];
    
    // Generate subcategories for each category
    for (const [categoryId, subcategoryNames] of Object.entries(subcategoryMap)) {
      for (const name of subcategoryNames) {
        // Create a deterministic ID to prevent duplicates
        const subcategoryId = `${categoryId}-${name}`;
        
        subcategoriesData.push({
          id: subcategoryId, // Use deterministic ID
          name: name,
          categoryId: categoryId,
          description: `${name.replace('_', ' ')} for ${categoryId}`
        });
      }
    }

    const createdSubcategories = [];
    
    for (const subcategoryData of subcategoriesData) {
      try {
        // Use direct DynamoDB put with condition instead of model
        const params = {
          TableName: process.env.SUBCATEGORIES_TABLE || 'Subcategories',
          Item: subcategoryData,
          ConditionExpression: 'attribute_not_exists(id)', // Prevent duplicates
        };

        await docClient.send(new PutCommand(params));
        createdSubcategories.push(subcategoryData);
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          console.log(`Subcategory ${subcategoryData.id} already exists, skipping...`);
        } else {
          console.error(`Error creating subcategory ${subcategoryData.name}:`, error.message);
        }
      }
    }

    return createSuccessResponse({
      message: 'Subcategories seeded successfully',
      count: createdSubcategories.length,
      subcategories: createdSubcategories,
      structure: subcategoryMap
    });

  } catch (error) {
    console.error('Seed subcategories error:', error);
    return createErrorResponse(error.message, 500);
  }
};
