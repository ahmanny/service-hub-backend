import mongoose, { Schema, model, Types } from 'mongoose';

export interface IConsumerProfile {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;


  location?: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
}

const ConsumerSchema = new Schema<IConsumerProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    unique: true, // one provider profile per user
    required: true,
    index: true,
  },
  firstName: { type: String, trim: true },
  lastName: { type: String, trim: true },
  avatarUrl: { type: String },

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

export const Consumer = model<IConsumerProfile>('Consumer', ConsumerSchema);

//Methods

export const getConsumers = () => Consumer.find();


export const getConsumerById = (id: string) =>
  Consumer.findById(id);

export const getConsumerByUserId = (userId: string | Types.ObjectId) =>
  Consumer.findOne({ userId });

export const createConsumer = (values: Partial<IConsumerProfile>) =>
  new Consumer(values).save();

export const updateConsumerById = (id: string, values: Partial<IConsumerProfile>) =>
  Consumer.findByIdAndUpdate(id, values, { new: true, runValidators: true });

export const deleteConsumerById = (id: string) =>
  Consumer.findByIdAndDelete(id);
