'use strict';

const schemas = require('../validations/document.validation');
const { ValidationError } = require('../utils/errors.utils');

function detectOwnerType(req) {
  if (req.params.providerId !== undefined) return 'provider';
  if (req.params.employeeId !== undefined) return 'employee';
  if (req.params.vehicleId !== undefined) return 'vehicle';
  return null;
}

function validateUploadQuery(req, _res, next) {
  const ownerType = detectOwnerType(req);
  const result = schemas.upload.safeParse({ ...req.query, ownerType });
  if (!result.success) {
    const details = result.error.errors.map(
      ({ path, message }) => ({ field: path.join('.'), message }),
    );
    return next(new ValidationError('Validation failed', details));
  }
  req.uploadData = result.data;
  return next();
}

module.exports = validateUploadQuery;
