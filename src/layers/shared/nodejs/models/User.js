import { BaseModel } from './BaseModel.js';
import bcrypt from 'bcryptjs';

export class UserModel extends BaseModel {
  constructor() {
    console.log('UserModel constructor, table name:', process.env.USERS_TABLE);
    super(process.env.USERS_TABLE);
  }

  async create(userData) {
    const { password, ...otherData } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = {
      ...otherData,
      password: hashedPassword,
      role: userData.role || 'User',
      profile: userData.profile || {}
    };

    const createdUser = await super.create(user);
    
    // Remove password before returning
    const { password: _, ...userWithoutPassword } = createdUser;
    return userWithoutPassword;
  }

  async getByEmail(email) {
    console.log('Getting user by email:', email, 'from table:', this.tableName);
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
}

export const userModel = new UserModel();
