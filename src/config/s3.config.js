'use strict';

const path = require('path');
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const config = require('./app.config');
const { ValidationError } = require('../utils/errors.utils');

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const s3 = new S3Client({
  region: config.s3.region,
  credentials: {
    accessKeyId: config.s3.accessKeyId,
    secretAccessKey: config.s3.secretAccessKey,
  },
});

/*
 * S3 key pattern: documents/{serviceProviderId}/{documentType}/{documentId}.{ext}
 * The controller populates req.uploadContext before invoking multer so the key
 * function has access to serviceProviderId, documentType, and documentId.
 */
const upload = multer({
  storage: multerS3({
    s3,
    bucket: config.s3.bucket,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const { serviceProviderId, documentType, documentId } = req.uploadContext;
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `documents/${serviceProviderId}/${documentType}/${documentId}${ext}`);
    },
  }),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) return cb(null, true);
    cb(new ValidationError(`File type ${file.mimetype} is not accepted`));
  },
});

const deleteFileFromS3 = async (fileUrl) => {
  const baseUrl = `https://${config.s3.bucket}.s3.${config.s3.region}.amazonaws.com/`;
  const key = fileUrl.replace(baseUrl, '');
  if (!key || key === fileUrl) throw new ValidationError('Could not extract S3 key from URL');
  await s3.send(new DeleteObjectCommand({ Bucket: config.s3.bucket, Key: key }));
};

module.exports = { upload, deleteFileFromS3 };
