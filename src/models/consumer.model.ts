import mongoose, { Schema, model, Types } from 'mongoose';
import { GeoAddress, GeoPointSchema } from './schemas/geoPoint.schema';

export interface IConsumerAddress {
  label: string; // e.g., "Home", "Office"
  formattedAddress: string;
  location: GeoAddress;
  isDefault: boolean;
}

export interface IConsumerProfile {
  userId: Types.ObjectId;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;

  addresses: IConsumerAddress[];
}

const AddressSchema = new Schema<IConsumerAddress>({
  label: { type: String, required: true, trim: true },
  formattedAddress: { type: String, required: true },
  location: {
    type: GeoPointSchema,
    required: true
  },
  isDefault: { type: Boolean, default: false }
});

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

  addresses: [AddressSchema]
}, {
  timestamps: true,
});


// 2dsphere index for geospatial queries
ConsumerSchema.index({ "addresses.location": '2dsphere' });

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

// Add a new address to the array
export const addAddressToConsumer = (id: string, address: IConsumerAddress) =>
  Consumer.findByIdAndUpdate(
    id,
    { $push: { addresses: address } },
    { new: true, runValidators: true }
  );

// Remove a specific address by its sub-document _id
export const removeAddressFromConsumer = (id: string, addressId: string) =>
  Consumer.findByIdAndUpdate(
    id,
    { $pull: { addresses: { _id: addressId } } },
    { new: true }
  );

// Set a specific address as default by updating the array
export const setDefaultAddress = async (id: string, addressId: string) => {
  // Reset all addresses for this specific consumer to isDefault: false
  await Consumer.updateOne(
    { _id: id },
    { $set: { "addresses.$[].isDefault": false } }
  );

  // Set the target address to isDefault: true
  return Consumer.findOneAndUpdate(
    { _id: id, "addresses._id": addressId },
    { $set: { "addresses.$.isDefault": true } },
    { new: true }
  );
};
