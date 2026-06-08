'use strict';

const { UniqueConstraintError } = require('sequelize');
const { AppError } = require('../utils/errors.utils');

// Express identifies error handlers by 4-arg signature; _next is required even when unused
module.exports = (err, req, res, _next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: { code: err.code, message: err.message, details: err.details },
    });
  }

  if (err instanceof UniqueConstraintError) {
    const field = err.errors?.[0]?.path || 'value';
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `A resource with this ${field} already exists`,
      },
    });
  }

  console.error(err);
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
  });
};
