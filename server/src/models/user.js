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
      notifyOnReminders: {
        type: Boolean,
        default: true,
      },
    },
    timezone: {
      type: String,
      default: 'UTC',
      trim: true,
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

// Sanitize Telegram settings object for frontend serialization
export const sanitizeTelegramSettings = (settings) => {
  if (!settings) {
    return {
      enabled: false,
      chatId: '',
      botTokenConfigured: false,
      notifyOnCreated: true,
      notifyOnAssigned: true,
      notifyOnStatusChange: true,
      notifyOnReminders: true,
    };
  }

  const botToken = settings.botToken;
  const isConfigured = Boolean(typeof botToken === 'string' && botToken.trim().length > 0);

  return {
    enabled: Boolean(settings.enabled),
    chatId: settings.chatId || '',
    botTokenConfigured: isConfigured,
    notifyOnCreated: settings.notifyOnCreated !== false,
    notifyOnAssigned: settings.notifyOnAssigned !== false,
    notifyOnStatusChange: settings.notifyOnStatusChange !== false,
    notifyOnReminders: settings.notifyOnReminders !== false,
  };
};

// Sanitize user object for frontend serialization
export const sanitizeUser = (user) => {
  if (!user) return null;
  const rawId = user._id || user.id;
  return {
    id: rawId ? rawId.toString() : undefined,
    name: user.name,
    email: user.email,
    avatar: user.avatar || null,
    timezone: user.timezone || 'UTC',
    telegramSettings: sanitizeTelegramSettings(user.telegramSettings),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

// Safe JSON serialization (strip password, refreshToken, and sensitive botToken)
userSchema.methods.toSafeJSON = function () {
  return sanitizeUser(this);
};

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;