import { 
  PutCommand, 
  GetCommand, 
  UpdateCommand, 
  DeleteCommand, 
  ScanCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb.js';
import { v4 as uuidv4 } from 'uuid';

export class BaseModel {
  constructor(tableName) {
    this.tableName = tableName;
  }

  async create(item) {
    const id = item.id || uuidv4();
    const timestamp = new Date().toISOString();
    
    const itemWithMetadata = {
      ...item,
      id,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: itemWithMetadata,
      ConditionExpression: 'attribute_not_exists(id)',
      marshallOptions: { removeUndefinedValues: true }
    });

    await docClient.send(command);
    return itemWithMetadata;
  }

  async getById(id) {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { id }
    });

    const result = await docClient.send(command);
    return result.Item;
  }

  async update(id, updates) {
    const timestamp = new Date().toISOString();
    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    Object.keys(updates).forEach((key, index) => {
      const attributeName = `#attr${index}`;
      const attributeValue = `:val${index}`;
      
      updateExpression.push(`${attributeName} = ${attributeValue}`);
      expressionAttributeNames[attributeName] = key;
      expressionAttributeValues[attributeValue] = updates[key];
    });

    // Add updatedAt
    updateExpression.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = timestamp;

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });

    const result = await docClient.send(command);
    return result.Attributes;
  }

  async delete(id) {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { id }
    });

    await docClient.send(command);
    return true;
  }

  async getAll(limit = 100) {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
        Limit: limit
      });

      const result = await docClient.send(command);
      return result.Items || [];
    } catch (error) {
      return [];
    }
  }

  async queryByIndex(indexName, keyConditionExpression, expressionAttributeValues, expressionAttributeNames = {}) {
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        IndexName: indexName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ...(Object.keys(expressionAttributeNames).length > 0 && { ExpressionAttributeNames: expressionAttributeNames })
      });

      const result = await docClient.send(command);
      return result.Items || [];
    } catch (error) {
      return [];
    }
  }
}
