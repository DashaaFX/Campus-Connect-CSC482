import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../utils/dynamodb.js';

const TABLE = process.env.DOWNLOAD_LOGS_TABLE;
const MAX_DOWNLOADS_PER_HOUR = parseInt(process.env.MAX_DOWNLOADS_PER_HOUR || '5', 10);

export class DownloadLogModel {
  constructor() {
    this.tableName = TABLE;
  }

  async logAttempt({ orderId, userId, productId }) {
    if (!this.tableName) return false;
    const ts = new Date().toISOString();
    const item = { orderId, ts, userId, productId };
    try {
      const command = new PutCommand({ TableName: this.tableName, Item: item });
      await docClient.send(command);
      return true;
    } catch (e) {
      console.error('[downloadLog-write-error]', e.message);
      return false;
    }
  }

  async countRecent(orderId, sinceIso) {
    if (!this.tableName) return 0;
    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'orderId = :oid AND ts BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':oid': orderId,
          ':start': sinceIso,
          ':end': new Date().toISOString()
        }
      });
      const res = await docClient.send(command);
      return (res.Items || []).length;
    } catch (e) {
      console.error('[downloadLog-query-error]', e.message);
      return 0;
    }
  }

  getLimit() { return MAX_DOWNLOADS_PER_HOUR; }
}

export const downloadLogModel = new DownloadLogModel();