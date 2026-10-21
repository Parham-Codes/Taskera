import { errorResponse } from '../utils/apiResponse.js';

export const validate = (schema) => (req, res, next) => {
  try {
    const validated = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // In Express 5, req.body is mutable, while req.query/req.params have getters
    if (validated.body) {
      req.body = validated.body;
    }

    if (validated.query && req.query) {
      try {
        req.query = validated.query;
      } catch {
        Object.assign(req.query, validated.query);
      }
    }

    if (validated.params && req.params) {
      try {
        req.params = validated.params;
      } catch {
        Object.assign(req.params, validated.params);
      }
    }

    next();
  } catch (err) {
    if (err.errors) {
      const formattedErrors = err.errors.map((e) => ({
        field: e.path.join('.').replace(/^(body|query|params)\./, ''),
        message: e.message,
      }));

      return errorResponse(res, {
        message: formattedErrors[0]?.message || 'Validation failed',
        statusCode: 400,
        errors: formattedErrors,
      });
    }

    next(err);
  }
};
