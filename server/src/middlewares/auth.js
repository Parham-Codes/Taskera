import { verifyAccessToken } from '../utils/token.js';
import { User } from '../models/index.js';
import { errorResponse } from '../utils/apiResponse.js';

export const protectAuth = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check secure httpOnly cookie first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }
    // 2. Fallback to Authorization Header (Bearer token)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return errorResponse(res, {
        message: 'Authentication required. Please log in.',
        statusCode: 401,
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, {
          message: 'Access token expired',
          statusCode: 401,
          errors: [{ code: 'TOKEN_EXPIRED' }],
        });
      }
      return errorResponse(res, {
        message: 'Invalid access token',
        statusCode: 401,
      });
    }

    // Lean query with projection to minimize database overhead
    const user = await User.findById(decoded.sub)
      .select('_id name email avatar telegramSettings createdAt updatedAt')
      .lean();

    if (!user) {
      return errorResponse(res, {
        message: 'Account not found or has been removed',
        statusCode: 401,
      });
    }

    // Attach user to request object
    req.user = {
      ...user,
      id: user._id.toString(),
    };

    next();
  } catch (error) {
    next(error);
  }
};
