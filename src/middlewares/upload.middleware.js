'use strict';

const { upload } = require('../config/s3.config');
const { ValidationError } = require('../utils/errors.utils');

const MULTER_VALIDATION_CODES = new Set([
  'LIMIT_FILE_SIZE',
  'LIMIT_UNEXPECTED_FILE',
]);

const uploadFile = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();

    if (MULTER_VALIDATION_CODES.has(err.code)) {
      return next(new ValidationError(err.message));
    }

    // ValidationError thrown by fileFilter (invalid MIME type)
    if (err.name === 'ValidationError') return next(err);

    return next(err);
  });
};

module.exports = uploadFile;
