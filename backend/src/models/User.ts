import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface IUserSettings {
  smsNotifications: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
}

export interface IUser extends Document {
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  password: string;
  role: 'customer' | 'artisan' | 'admin';
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  isProfileComplete: boolean;
  phoneVerificationPinId?: string;
  emailVerificationToken?: string;
  emailVerificationExpire?: Date;
  resetPasswordToken?: string;
  resetPasswordExpire?: Date;
  bookmarkedArtisans: mongoose.Types.ObjectId[];
  avatar?: string;
  settings: IUserSettings;
  lastLoginAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  deactivationReason?: string;
  createdAt: Date;
  updatedAt: Date;
  matchPassword(password: string): Promise<boolean>;
  getSignedJwtToken(): string;
  getResetPasswordToken(): string;
  getEmailVerificationToken(): string;
  checkProfileComplete(): boolean;
}

const settingsSchema = new Schema<IUserSettings>(
  {
    smsNotifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    marketingEmails: { type: Boolean, default: false },
  },
  { _id: false }
);

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: false, trim: true, maxlength: 50 },
    lastName: { type: String, required: false, trim: true, maxlength: 50 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: false, trim: true },
    address: { type: String, required: false, trim: true, maxlength: 500 },
    password: { type: String, required: true, minlength: 8, select: false },
    role: {
      type: String,
      enum: ['customer', 'artisan', 'admin'],
      default: 'customer',
    },
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },
    isProfileComplete: { type: Boolean, default: false },
    phoneVerificationPinId: String,
    emailVerificationToken: String,
    emailVerificationExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    bookmarkedArtisans: [{ type: Schema.Types.ObjectId, ref: 'ArtisanProfile' }],
    avatar: String,
    settings: { type: settingsSchema, default: () => ({}) },
    lastLoginAt: Date,
    isActive: { type: Boolean, default: true },
    deactivatedAt: Date,
    deactivationReason: String,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.getSignedJwtToken = function (): string {
  return jwt.sign(
    { id: this._id },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' } as jwt.SignOptions
  );
};

userSchema.methods.getResetPasswordToken = function (): string {
  const token = crypto.randomBytes(20).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  return token;
};

userSchema.methods.getEmailVerificationToken = function (): string {
  const token = crypto.randomBytes(20).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return token;
};

// Check if customer profile is complete (firstName, lastName, phone, address required)
userSchema.methods.checkProfileComplete = function (): boolean {
  if (this.role === 'customer') {
    return !!(this.firstName && this.lastName && this.phone && this.address);
  }
  // For artisans, profile completion is checked via ArtisanProfile.isProfileComplete
  return true;
};

// Pre-save hook to calculate isProfileComplete for customers
userSchema.pre('save', function (next) {
  if (this.role === 'customer') {
    this.isProfileComplete = !!(this.firstName && this.lastName && this.phone && this.address);
  }
  next();
});

export const User = mongoose.model<IUser>('User', userSchema);
