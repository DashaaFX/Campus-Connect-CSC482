//Baljinnyam Puntsagnorov
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// AWS_REGION is automatically provided 
const region = process.env.AWS_REGION || 'us-east-1';

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



export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});
