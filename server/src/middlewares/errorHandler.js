import { errorResponse } from '../utils/apiResponse.js';

export const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Application Error:', err);

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return errorResponse(res, {
      message: `A record with this ${field} already exists`,
      statusCode: 409,
    });
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return errorResponse(res, {
      message: `Invalid ID format for ${err.path}`,
      statusCode: 400,
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    return errorResponse(res, {
      message: 'Database validation failed',
      statusCode: 400,
      errors,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return errorResponse(res, {
      message: 'Invalid authorization token',
      statusCode: 401,
    });
  }

  if (err.name === 'TokenExpiredError') {
    return errorResponse(res, {
      message: 'Authorization token has expired',
      statusCode: 401,
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  return errorResponse(res, {
    message,
    statusCode,
  });
};
