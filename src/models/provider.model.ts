import mongoose, { Date, Schema, Types, model } from 'mongoose';


export enum UserRoles {
    ADMIN = 'admin',
    CUSTOMER = 'customer'
}
const roleOrder = Object.values(UserRoles)


export interface IConsumerAddress {
    address: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
}

export interface IConsumer {
    name: string;
    email: string;
    phone: string;
    profilePicture: string;
    shippingAddress: IConsumerAddress;
    role: UserRoles;
    isVerified: boolean
    cart: Types.ObjectId;
    wishlist: Types.ObjectId;
    orders: Types.ObjectId;
    reviews: Types.ObjectId;
}

const UserAddress = new Schema<IConsumerAddress>({
    address: { type: String },
    city: { type: String },
    state: { type: String },
    zipCode: { type: String },
    country: { type: String },
});

const UserSchema = new Schema<IConsumer>({
    name: {
        type: String,
        required: true,
    },
    phone: {
        type: String,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    profilePicture: {
        type: String
    },
    shippingAddress: UserAddress,
    role: {
        type: String,
        enum: Object.values(UserRoles),
        default: UserRoles.CUSTOMER
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    wishlist: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Wishlist',
    }],
    cart: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Cart',
    }],
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    }],
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
    }],
}, {
    timestamps: true,
});

export const User = model<IConsumer>('User', UserSchema);




export const canCreateRole = (creatorRole: UserRoles, targetRole: UserRoles): boolean => {
    const roleHierarchy: Record<UserRoles, UserRoles[]> = roleOrder.reduce((hierarchy, role, index) => {
        if (index < roleOrder.length - 2) {
            hierarchy[role] = roleOrder.slice(index + 1) as UserRoles[];
        } else {
            hierarchy[role] = [];
        }
        return hierarchy;
    }, {} as Record<UserRoles, UserRoles[]>);
    return roleHierarchy[creatorRole]?.includes(targetRole) || false;
};

export const canUserCreateRole = async (userId: string, targetRole: UserRoles): Promise<boolean> => {
    const creator = await User.findById(userId);
    return creator ? canCreateRole(creator.role, targetRole) : false;
};











//methods
export const getUsers = () => User.find();
export const getUserByEmail = (email: String) => User.findOne({ email });
export const getUserByName = (name: String) => User.findOne({ name });
export const getUserByRole = (role: String) => User.findOne({ role })
export const getUserByPhone = (phone: string) => User.findOne({ phone })
export const getUserById = (id: String) => User.findById(id).lean();
export const createUser = (values: Record<string, any>) => new User(values).save().then((user) => user.toObject());
export const deleteUserById = (id: string) => User.findByIdAndDelete({ _id: id });
export const updateUserById = (id: string, values: Record<string, any>) => User.findByIdAndUpdate(id, values)

export const updateUserByEmail = (userEmail: string, values: Record<string, any>) => User.findOneAndUpdate({ email: userEmail }, values, { new: true });
