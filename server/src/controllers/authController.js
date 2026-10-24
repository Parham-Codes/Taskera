import User, { sanitizeUser } from '../models/user.js';
import { generateTokens, setAuthCookies, clearAuthCookies, verifyRefreshToken } from '../utils/token.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { isValidTimezone } from '../utils/reminderDateUtils.js';

export const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email }).lean();
    if (existingUser) {
      return errorResponse(res, {
        message: 'An account with this email already exists',
        statusCode: 409,
      });
    }

    // Password hashing handled cleanly in User model pre-save hook
    const user = await User.create({
      name,
      email,
      password,
    });

    const { accessToken, refreshToken } = generateTokens(user._id);

    // Save refresh token on user record for rotation/revocation
    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, { accessToken, refreshToken });

    return successResponse(res, {
      message: 'Account created successfully',
      statusCode: 201,
      data: {
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Explicitly select password since it has select: false
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return errorResponse(res, {
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, {
        message: 'Invalid email or password',
        statusCode: 401,
      });
    }

    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    setAuthCookies(res, { accessToken, refreshToken });

    return successResponse(res, {
      message: 'Logged in successfully',
      data: {
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { refreshToken: null });
    }

    clearAuthCookies(res);

    return successResponse(res, {
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return errorResponse(res, {
        message: 'Refresh token not found',
        statusCode: 401,
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      clearAuthCookies(res);
      return errorResponse(res, {
        message: 'Invalid or expired refresh token',
        statusCode: 401,
      });
    }

    const user = await User.findById(decoded.sub).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      clearAuthCookies(res);
      return errorResponse(res, {
        message: 'Session revoked or invalid',
        statusCode: 401,
      });
    }

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    setAuthCookies(res, tokens);

    return successResponse(res, {
      message: 'Token refreshed',
      data: {
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    return successResponse(res, {
      message: 'Authenticated user fetched successfully',
      data: {
        user: sanitizeUser(req.user),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateTimezone = async (req, res, next) => {
  try {
    const { timezone } = req.body;
    if (!timezone || !isValidTimezone(timezone)) {
      return errorResponse(res, {
        message: 'Invalid IANA time zone identifier',
        statusCode: 400,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { timezone: timezone.trim() },
      { returnDocument: 'after' }
    );

    if (!user) {
      return errorResponse(res, { message: 'User not found', statusCode: 404 });
    }

    return successResponse(res, {
      message: 'Timezone updated successfully',
      data: {
        user: user.toSafeJSON(),
      },
    });
  } catch (error) {
    next(error);
  }
};


