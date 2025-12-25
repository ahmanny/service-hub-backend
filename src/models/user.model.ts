import mongoose, { Schema, model, Types } from 'mongoose';

export interface IUser {
  email?: string;
  phone: string;
  isEmailVerified: boolean;
//   provider: 'local' | 'google' | 'facebook';
}

const UserSchema = new Schema<IUser>({
  email: {
    type: String,
    trim: true,
    unique: true,
    default: undefined,
    index: {
      unique: true,
      partialFilterExpression: { email: { $type: "string" } },
    },
  },

  phone: {
    type: String,
    required: true,
    unique: true, // primary identifier
  },

  isEmailVerified: { type: Boolean, default: false },

}, {
  timestamps: true,
});


// 2dsphere index for geospatial queries
UserSchema.index({ location: '2dsphere' });


export const User = model<IUser>('User', UserSchema);

//Methods

export const getUsers = () => User.find();

export const getUserByPhone = (phone: string) =>
  User.findOne({ phone });

export const getUserByEmail = (email: string) =>
  User.findOne({ email });

export const getUserById = (id: string) =>
  User.findById(id);

export const createUser = (values: Partial<IUser>) =>
  new User(values).save();

export const updateUserById = (id: string, values: Partial<IUser>) =>
  User.findByIdAndUpdate(id, values, { new: true, runValidators: true });

export const deleteUserById = (id: string) =>
  User.findByIdAndDelete(id);
