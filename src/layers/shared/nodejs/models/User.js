//Baljinnyam Puntsagnorov
import { BaseModel } from './BaseModel.js';
import bcrypt from 'bcryptjs';
import { generateAssetUrl, getCloudFrontDomain } from '../utils/urlUtils.js';

export class UserModel extends BaseModel {
  constructor() {
    super(process.env.USERS_TABLE);
  }

  async create(userData) {
    const { password, ...otherData } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    let profilePicture = userData.profilePicture || null;
    
    // Ensure profilePicture has the correct URL format if provided
    if (profilePicture && typeof profilePicture === 'string' && !profilePicture.startsWith('http')) {
      profilePicture = generateAssetUrl(
        profilePicture, 
        process.env.ENVIRONMENT || 'dev',
        process.env.AWS_REGION || 'us-east-1',
        getCloudFrontDomain()
      );
    }
    

    // Stripe Connect fields for seller payouts
    let stripeConnectFields = {
      stripeOnboardingStatus: userData.stripeOnboardingStatus || 'pending', // pending, incomplete, complete, restricted
      payoutsDeferred: userData.payoutsDeferred || false
    };
    if (typeof userData.stripeAccountId === 'string') {
      const trimmedStripeAccountId = userData.stripeAccountId.trim();
      if (trimmedStripeAccountId !== "") {
        stripeConnectFields.stripeAccountId = trimmedStripeAccountId;
      }
    }

    const user = {
      ...otherData,
      password: hashedPassword,
      role: userData.role || 'User',
      profilePicture: profilePicture,
      profile: {
        ...(userData.profile || {}),
        profilePhoto: profilePicture 
      },
      ...stripeConnectFields
    };

    const createdUser = await super.create(user);
    
    // Remove password before returning
    const { password: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }

  async getByEmail(email) {
    const users = await this.queryByIndex(
      'EmailIndex',
      'email = :email',
      { ':email': email }
    );
    return users[0] || null;
  }

  async getByIdNum(idnum) {
    // Assuming idnum is unique, we can scan the table
    const allUsers = await this.getAll();
    return allUsers.find(user => user.idnum === idnum) || null;
  }

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password);
  }

  async authenticate(email, password) {
    const user = await this.getByEmail(email);
    if (!user) return null;
    
    const isValid = await this.verifyPassword(user, password);
    if (!isValid) return null;
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

    //TODO: Add GSI for stripeAccountId for better performance
    async listByStripeAccountId(stripeAccountId) {
      if (!stripeAccountId) return [];
      const { QueryCommand } = await import('@aws-sdk/lib-dynamodb');
      const { docClient } = await import('../utils/dynamodb.js');
      const params = {
        TableName: this.tableName,
        IndexName: 'StripeAccountIdIndex',
        KeyConditionExpression: 'stripeAccountId = :s',
        ExpressionAttributeValues: { ':s': stripeAccountId }
      };
      try {
        const result = await docClient.send(new QueryCommand(params));
        return result.Items || [];
      } catch (err) {
        console.error('listByStripeAccountId query failed:', err.message);
        // fallback to previous behavior (getAll) as a last resort
        const all = await this.getAll();
        return all.filter(u => u.stripeAccountId === stripeAccountId);
      }
    }
  
  async updateProfilePicture(userId, profilePictureUrl) {
    // Get the user first
    const user = await this.getById(userId);
    if (!user) {
      return null;
    }
    
    // Ensure profilePictureUrl has the correct URL format if it's not a full URL
    let formattedProfilePicUrl = profilePictureUrl;
    if (formattedProfilePicUrl && typeof formattedProfilePicUrl === 'string' && !formattedProfilePicUrl.startsWith('http')) {
      formattedProfilePicUrl = generateAssetUrl(
        formattedProfilePicUrl,
        process.env.ENVIRONMENT || 'dev',
        process.env.AWS_REGION || 'us-east-1',
        getCloudFrontDomain()
      );
    }
    
    // Create the updated profile object
    const updatedProfile = {
      ...(user.profile || {}),
      profilePhoto: formattedProfilePicUrl
    };
    
    // Use a direct DynamoDB update command for better control
    const timestamp = new Date().toISOString();
    const updateExpression = 'SET #profilePicture = :profilePicture, #profile = :profile, #updatedAt = :updatedAt';
    const expressionAttributeNames = {
      '#profilePicture': 'profilePicture',
      '#profile': 'profile',
      '#updatedAt': 'updatedAt'
    };
    const expressionAttributeValues = {
      ':profilePicture': formattedProfilePicUrl,
      ':profile': updatedProfile,
      ':updatedAt': timestamp
    };
    
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const { docClient } = await import('../utils/dynamodb.js');
    
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { id: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW'
    });
    
    const result = await docClient.send(command);
    
    if (result.Attributes) {
      // Return the updated user without password
      const { password: _, ...userWithoutPassword } = result.Attributes;
      return userWithoutPassword;
    }
    
    return null;
  }
}

export const userModel = new UserModel();
