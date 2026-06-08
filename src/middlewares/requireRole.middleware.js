'use strict';

const { ForbiddenError } = require('../utils/errors.utils');

const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ForbiddenError());
  }
  return next();
};

module.exports = requireRole;
