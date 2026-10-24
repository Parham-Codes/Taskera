import { errorResponse } from '../utils/apiResponse.js';

/**
 * Sanitizes potentially sensitive patterns (like connection strings or bot tokens)
 * before printing to server logs.
 */
const sanitizeLogMessage = (msg) => {
  if (typeof msg !== 'string') return msg;
  return msg
    .replace(/(mongodb(?:\+srv)?:\/\/[^:]+:)[^@]+(@)/gi, '$1***$2')
    .replace(/(bot[0-9]{8,10}:)[a-zA-Z0-9_-]{30,}/gi, '$1[REDACTED]');
};

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Safely log errors without polluting logs or leaking secrets
  if (statusCode >= 500) {
    const sanitizedMsg = sanitizeLogMessage(err.message || 'Internal Server Error');
    console.error(`[Server 500 Error] ${sanitizedMsg}`, isProduction ? '' : err.stack || err);
  } else {
    // Operational/client errors (400, 401, 403, 404, 409, 429)
    console.warn(`[Client Error ${statusCode}] ${err.message || 'Request failed'}`);
  }

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

  // Handle SyntaxError (e.g. malformed JSON request body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return errorResponse(res, {
      message: 'Malformed JSON payload',
      statusCode: 400,
    });
  }

  // In production, prevent leaking internal driver/system details for unhandled 500s
  let message = err.message || 'Internal server error';
  if (statusCode >= 500 && isProduction) {
    message = 'Internal server error';
  }

  return errorResponse(res, {
    message,
    statusCode,
  });
};
