import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// AWS_REGION is automatically provided by Lambda runtime
const region = process.env.AWS_REGION || 'us-east-1';

// For local testing, use environment variable or default
let endpoint = null;
if (process.env.ENVIRONMENT === 'local') {
  endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';
}

const client = new DynamoDBClient({
  region,
  ...(process.env.ENVIRONMENT === 'local' && {
    endpoint,
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local'
    }
  })
});



export const docClient = DynamoDBDocumentClient.from(client);
