/**
 * Custom Error class for Task domain errors with HTTP status codes.
 */
export class TaskError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'TaskError';
    this.statusCode = statusCode;
  }
}
