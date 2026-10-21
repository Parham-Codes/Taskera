import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never return password in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      select: false,
      default: null,
    },
    telegramSettings: {
      enabled: {
        type: Boolean,
        default: false,
      },
      botToken: {
        type: String,
        default: '',
        trim: true,
      },
      chatId: {
        type: String,
        default: '',
        trim: true,
      },
      notifyOnCreated: {
        type: Boolean,
        default: true,
      },
      notifyOnAssigned: {
        type: Boolean,
        default: true,
      },
      notifyOnStatusChange: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving if modified
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe JSON serialization (strip password and internal fields)
userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    telegramSettings: this.telegramSettings || {
      enabled: false,
      botToken: '',
      chatId: '',
      notifyOnCreated: true,
      notifyOnAssigned: true,
      notifyOnStatusChange: true,
    },
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;