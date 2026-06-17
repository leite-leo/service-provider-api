'use strict';

const Sentry = require('@sentry/node');
const { Document, Employee, Vehicle, ServiceProvider, sequelize } = require('../models');
const { generatePresignedUrl, deleteFileFromS3 } = require('../config/s3.config');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors.utils');

const PROVIDER_STATUSES_ALLOWING_UPLOAD = ['pending', 'approved'];

async function ensureProviderCanUploadDocument(providerId) {
  const provider = await ServiceProvider.findByPk(providerId);
  if (!provider) throw new NotFoundError('Service provider not found');
  if (!PROVIDER_STATUSES_ALLOWING_UPLOAD.includes(provider.status)) {
    throw new ConflictError(
      `Cannot upload documents while provider is in ${provider.status} state`,
      'ACTION_BLOCKED',
    );
  }
}

class DocumentService {
  async uploadDocument({ ownerType, ownerId, providerId, documentType, fileKey, issuedAt, expiresAt, uploadedBy }) {
    try {
      await ensureProviderCanUploadDocument(providerId);

      // Ownership check: ensure the target entity belongs to the authenticated provider
      if (ownerType === 'provider') {
        if (ownerId !== providerId) {
          throw new ForbiddenError("Cannot upload documents for another provider");
        }
      } else if (ownerType === 'employee') {
        const employee = await Employee.findByPk(ownerId);
        if (!employee) throw new NotFoundError('Employee not found');
        if (employee.serviceProviderId !== providerId) {
          throw new ForbiddenError("Cannot upload documents for another provider's employee");
        }
      } else if (ownerType === 'vehicle') {
        const vehicle = await Vehicle.findByPk(ownerId);
        if (!vehicle) throw new NotFoundError('Vehicle not found');
        if (vehicle.serviceProviderId !== providerId) {
          throw new ForbiddenError("Cannot upload documents for another provider's vehicle");
        }
      }

      const doc = await sequelize.transaction(async (t) => {
        /*
         * One-active-document-per-type rule: archive the current active document
         * of the same type for the same entity before inserting the new one.
         * This keeps the partial unique index from rejecting the insert and
         * preserves the historical record under 'archived' status.
         */
        const existingWhere = { documentType, status: 'active' };
        if (ownerType === 'provider') {
          existingWhere.serviceProviderId = ownerId;
          existingWhere.employeeId = null;
          existingWhere.vehicleId = null;
        } else if (ownerType === 'employee') {
          existingWhere.employeeId = ownerId;
        } else {
          existingWhere.vehicleId = ownerId;
        }

        const existing = await Document.findOne({ where: existingWhere, transaction: t });
        if (existing) {
          existing.status = 'archived';
          await existing.save({ transaction: t });
        }

        return Document.create(
          {
            serviceProviderId: providerId,
            employeeId: ownerType === 'employee' ? ownerId : null,
            vehicleId: ownerType === 'vehicle' ? ownerId : null,
            documentType,
            fileUrl: fileKey,
            status: 'active',
            issuedAt: issuedAt || null,
            expiresAt: expiresAt || null,
            uploadedBy,
          },
          { transaction: t },
        );
      });

      const presignedUrl = await generatePresignedUrl(doc.fileUrl);

      return {
        id: doc.id,
        documentType: doc.documentType,
        fileUrl: presignedUrl,
        status: doc.status,
        issuedAt: doc.issuedAt,
        expiresAt: doc.expiresAt,
        uploadedBy: doc.uploadedBy,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      };
    } catch (err) {
      // Fire-and-forget S3 cleanup; original error propagates unchanged
      if (fileKey) {
        deleteFileFromS3(fileKey).catch((e) => Sentry.captureException(e));
      }
      throw err;
    }
  }
}

module.exports = new DocumentService();
