'use strict';

const { randomUUID } = require('crypto');

function setUploadContext(req, _res, next) {
  req.uploadContext = {
    serviceProviderId: req.user.serviceProviderId,
    documentType: req.query.documentType,
    documentId: randomUUID(),
  };
  next();
}

module.exports = setUploadContext;
