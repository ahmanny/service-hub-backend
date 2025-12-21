import mongoose, { Schema, model, Types } from 'mongoose';

export interface IConsumer {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone: string;

  avatarUrl?: string;

  isEmailVerified: boolean;
  profileCompleted: boolean;

  provider: 'local' | 'google' | 'facebook';

  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const ConsumerSchema = new Schema<IConsumer>({
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
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
  avatarUrl: { type: String },

  isEmailVerified: { type: Boolean, default: false },
  profileCompleted: { type: Boolean, default: false },

  provider: {
    type: String,
    enum: ['local', 'google', 'facebook'],
    default: 'local',
  },

  location: {
    type: {
      type: String,
      enum: ['Point'],
    },
    coordinates: {
      type: [Number],
      validate: {
        validator: (v: number[]) => v.length === 2,
        message: 'Location must be [longitude, latitude]',
      },
    },
  },
}, {
  timestamps: true,
});


// 2dsphere index for geospatial queries
ConsumerSchema.index({ location: '2dsphere' });

// Virtual field for full name
ConsumerSchema.virtual('fullName').get(function () {
  return this.firstName + ' ' + this.lastName;
});

export const Consumer = model<IConsumer>('Consumer', ConsumerSchema);

//Methods

export const getConsumers = () => Consumer.find();

export const getConsumerByPhone = (phone: string) =>
  Consumer.findOne({ phone });

export const getConsumerByEmail = (email: string) =>
  Consumer.findOne({ email });

export const getConsumerById = (id: string) =>
  Consumer.findById(id);

export const createConsumer = (values: Partial<IConsumer>) =>
  new Consumer(values).save();

export const updateConsumerById = (id: string, values: Partial<IConsumer>) =>
  Consumer.findByIdAndUpdate(id, values, { new: true, runValidators: true });

export const deleteConsumerById = (id: string) =>
  Consumer.findByIdAndDelete(id);
