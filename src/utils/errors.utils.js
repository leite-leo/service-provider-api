'use strict';

class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

class ValidationError extends AppError {
  constructor(message, details) { super(message, 400, 'VALIDATION_ERROR', details); }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401, 'UNAUTHORIZED'); }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403, 'FORBIDDEN'); }
}

class NotFoundError extends AppError {
  constructor(message) { super(message, 404, 'RESOURCE_NOT_FOUND'); }
}

class ConflictError extends AppError {
  constructor(message, details) { super(message, 409, 'DUPLICATE_RESOURCE', details); }
}

module.exports = { AppError, ValidationError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError };
