'use strict';

const documentService = require('../services/document.service');
const { ValidationError } = require('../utils/errors.utils');

module.exports = {
  async uploadProviderDocument(req, res, next) {
    try {
      if (!req.file) throw new ValidationError('A file must be attached to the request');
      const result = await documentService.uploadDocument({
        ownerType: 'provider',
        ownerId: req.params.providerId,
        providerId: req.user.serviceProviderId,
        documentType: req.uploadData.documentType,
        issuedAt: req.uploadData.issuedAt,
        expiresAt: req.uploadData.expiresAt,
        fileKey: req.file.key,
        uploadedBy: req.user.id,
      });
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async uploadEmployeeDocument(req, res, next) {
    try {
      if (!req.file) throw new ValidationError('A file must be attached to the request');
      const result = await documentService.uploadDocument({
        ownerType: 'employee',
        ownerId: req.params.employeeId,
        providerId: req.user.serviceProviderId,
        documentType: req.uploadData.documentType,
        issuedAt: req.uploadData.issuedAt,
        expiresAt: req.uploadData.expiresAt,
        fileKey: req.file.key,
        uploadedBy: req.user.id,
      });
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async uploadVehicleDocument(req, res, next) {
    try {
      if (!req.file) throw new ValidationError('A file must be attached to the request');
      const result = await documentService.uploadDocument({
        ownerType: 'vehicle',
        ownerId: req.params.vehicleId,
        providerId: req.user.serviceProviderId,
        documentType: req.uploadData.documentType,
        issuedAt: req.uploadData.issuedAt,
        expiresAt: req.uploadData.expiresAt,
        fileKey: req.file.key,
        uploadedBy: req.user.id,
      });
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async listProviderDocuments(req, res, next) {
    try {
      const { status, documentType, page, limit } = req.query;
      const result = await documentService.findAll(
        { ownerType: 'provider', ownerId: req.params.providerId, status, documentType, page, limit },
        req.user,
      );
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async listEmployeeDocuments(req, res, next) {
    try {
      const { status, documentType, page, limit } = req.query;
      const result = await documentService.findAll(
        { ownerType: 'employee', ownerId: req.params.employeeId, status, documentType, page, limit },
        req.user,
      );
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async listVehicleDocuments(req, res, next) {
    try {
      const { status, documentType, page, limit } = req.query;
      const result = await documentService.findAll(
        { ownerType: 'vehicle', ownerId: req.params.vehicleId, status, documentType, page, limit },
        req.user,
      );
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },

  async showDocument(req, res, next) {
    try {
      const result = await documentService.findById(req.params.id, req.user);
      return res.status(200).json(result);
    } catch (error) {
      return next(error);
    }
  },
};
