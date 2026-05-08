import mongoose, { Schema, model, Types } from 'mongoose';

export interface IUser {
  // Consumer Keys
  consumerPhone?: string;
  consumerEmail?: string;
  isConsumerEmailVerified: boolean;

  // Provider Keys
  providerPhone?: string;
  providerEmail?: string;
  isProviderEmailVerified: boolean;

  // Admin Keys
  adminEmail?: string;
  adminRole?: 'super-admin' | 'support' | 'finance';
  isAdminVerified: boolean;

  consumerPushTokens: string[];
  providerPushTokens: string[];

  activeRoles: ('consumer' | 'provider' | 'admin')[];
}

const UserSchema = new Schema<IUser>({
  // Phone keys - Sparse allows them to be null until the specific app is used
  consumerPhone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  providerPhone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },

  // Email keys
  consumerEmail: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  providerEmail: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },

  // Verification flags
  isConsumerEmailVerified: { type: Boolean, default: false },
  isProviderEmailVerified: { type: Boolean, default: false },

  // Consumer-specific device tokens
  consumerPushTokens: {
    type: [String],
    default: [],
    index: true
  },

  // Provider-specific device tokens
  providerPushTokens: {
    type: [String],
    default: [],
    index: true
  },

  // Admin-specific fields
  adminEmail: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true
  },
  adminRole: {
    type: String,
    enum: ['super-admin', 'support', 'finance'],
    sparse: true
  },
  isAdminVerified: {
    type: Boolean,
    default: false
  },

  // Roles tracking
  activeRoles: {
    type: [String],
    enum: ['consumer', 'provider', 'admin'],
    default: []
  }
}, {
  timestamps: true,
});


export const User = model<IUser>('User', UserSchema);

/** 
 * * Helper Methods
 */

export const getUsers = () => User.find();

// Find by specific role phone
export const getUserByConsumerPhone = (phone: string) => User.findOne({ consumerPhone: phone });
export const getUserByProviderPhone = (phone: string) => User.findOne({ providerPhone: phone });
export const getUserByAdminEmail = (email: string) => User.findOne({ adminEmail: email.toLowerCase() });

// Global check: Find a user who owns this phone number in ANY role
export const findUserByAnyPhone = (phone: string) =>
  User.findOne({ $or: [{ consumerPhone: phone }, { providerPhone: phone }] });

export const getUserById = (id: string) => User.findById(id);

export const createUser = (values: Partial<IUser>) => new User(values).save();

export const updateUserById = (id: string, values: Partial<IUser>) =>
  User.findByIdAndUpdate(id, values, { new: true, runValidators: true });

export const deleteUserById = (id: string) => User.findByIdAndDelete(id);