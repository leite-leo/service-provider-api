'use strict';

const { AppError } = require('../utils/errors.utils');

module.exports = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
};
