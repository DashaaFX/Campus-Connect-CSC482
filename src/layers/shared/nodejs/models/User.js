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
    
    const user = {
      ...otherData,
      password: hashedPassword,
      role: userData.role || 'User',
      profilePicture: profilePicture,
      profile: {
        ...(userData.profile || {}),
        profilePhoto: profilePicture // Ensure this field is also set during creation
      }
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
    // Since idnum might not be indexed, we'll scan for it
    // In production, consider adding an index for this
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
