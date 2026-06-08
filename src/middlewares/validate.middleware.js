'use strict';

const { ValidationError } = require('../utils/errors.utils');

const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const details = result.error.errors.map(({ path, message }) => ({
      field: path.join('.'),
      message,
    }));
    return next(new ValidationError('Validation failed', details));
  }

  req.body = result.data.body ?? req.body;
  req.params = result.data.params ?? req.params;
  req.query = result.data.query ?? req.query;

  return next();
};

module.exports = validate;
