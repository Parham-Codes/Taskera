/**
 * Standard API Response helpers for consistent frontend consumption
 */

export const successResponse = (res, { data = null, message = 'Success', statusCode = 200 }) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

export const errorResponse = (res, { message = 'Internal server error', statusCode = 500, errors = null }) => {
  const payload = {
    success: false,
    message,
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};
