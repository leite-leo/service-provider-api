'use strict';

const { ForbiddenError } = require('../utils/errors.utils');

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError(`This endpoint requires one of: ${roles.join(', ')}`));
  }
  return next();
};

module.exports = requireRole;
