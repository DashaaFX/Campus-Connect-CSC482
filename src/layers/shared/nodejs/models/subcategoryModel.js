import { docClient } from '../utils/dynamodb.js';
import { ScanCommand, QueryCommand, PutCommand, GetCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const SUBCATEGORIES_TABLE = process.env.SUBCATEGORIES_TABLE || 'Subcategories-dev';

export class SubcategoryModel {
  static async create(subcategoryData) {
    const subcategory = {
      id: uuidv4(),
      ...subcategoryData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const command = new PutCommand({
      TableName: SUBCATEGORIES_TABLE,
      Item: subcategory,
      ConditionExpression: 'attribute_not_exists(id)'
    });

    await docClient.send(command);
    return subcategory;
  }

  static async getById(id) {
    const command = new GetCommand({
      TableName: SUBCATEGORIES_TABLE,
      Key: { id }
    });

    const result = await docClient.send(command);
    return result.Item;
  }

  static async getAll(limit = 100) {
    const command = new QueryCommand({
      TableName: SUBCATEGORIES_TABLE,
      IndexName: 'DefaultIndex',
      KeyConditionExpression: 'attribute_exists(id)',
      Limit: limit
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  static async getByCategoryId(categoryId) {
    const command = new QueryCommand({
      TableName: SUBCATEGORIES_TABLE,
      IndexName: 'CategoryIndex',
      KeyConditionExpression: 'categoryId = :categoryId',
      ExpressionAttributeValues: { ':categoryId': categoryId }
    });

    const result = await docClient.send(command);
    return result.Items || [];
  }

  static async update(id, updateData) {
    const { updatedAt, ...data } = updateData;
    
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {
      ':updatedAt': new Date().toISOString()
    };

    Object.keys(data).forEach((key, index) => {
      const attributeName = `#attr${index}`;
      const attributeValue = `:val${index}`;
      
      updateExpression.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = data[key];
    });

    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';

    const command = new UpdateCommand({
      TableName: SUBCATEGORIES_TABLE,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  static async delete(id) {
    const command = new DeleteCommand({
      TableName: SUBCATEGORIES_TABLE,
      Key: { id }
    });

    await docClient.send(command);
    return { success: true };
  }
}
