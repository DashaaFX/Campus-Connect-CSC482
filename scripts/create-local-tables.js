import { DynamoDBClient, CreateTableCommand, ListTablesCommand } from '@aws-sdk/client-dynamodb';

const dynamoClient = new DynamoDBClient({
  region: 'local',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local'
  }
});

const tables = [
  {
    TableName: 'local-users',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'email', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'EmailIndex',
        KeySchema: [{ AttributeName: 'email', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'local-products',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'seller', AttributeType: 'S' },
      { AttributeName: 'category', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'SellerIndex',
        KeySchema: [{ AttributeName: 'seller', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      },
      {
        IndexName: 'CategoryIndex',
        KeySchema: [{ AttributeName: 'category', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'local-carts',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  },
  {
    TableName: 'local-orders',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'S' },
      { AttributeName: 'buyer', AttributeType: 'S' },
      { AttributeName: 'seller', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'BuyerIndex',
        KeySchema: [{ AttributeName: 'buyer', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      },
      {
        IndexName: 'SellerIndex',
        KeySchema: [{ AttributeName: 'seller', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
      }
    ],
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 }
  }
];

async function createTables() {
  try {
    // Check existing tables
    const existingTables = await dynamoClient.send(new ListTablesCommand({}));
    console.log('Existing tables:', existingTables.TableNames);

    for (const table of tables) {
      if (existingTables.TableNames?.includes(table.TableName)) {
        console.log(`Table ${table.TableName} already exists, skipping...`);
        continue;
      }

      try {
        await dynamoClient.send(new CreateTableCommand(table));
        console.log(`✅ Created table: ${table.TableName}`);
      } catch (error) {
        if (error.name === 'ResourceInUseException') {
          console.log(`Table ${table.TableName} already exists`);
        } else {
          console.error(`❌ Error creating table ${table.TableName}:`, error.message);
        }
      }
    }

    console.log('✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    console.log('Make sure DynamoDB Local is running on port 8000');
  }
}

createTables();
