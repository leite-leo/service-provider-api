'use strict';

const { Op } = require('sequelize');
const { Document, Employee, Vehicle, ServiceProvider } = require('../models');
const { NotFoundError, ForbiddenError } = require('../utils/errors.utils');

const EXPIRING_SOON_DAYS = 30;
const EMPLOYEE_REQUIRED_DOC_TYPES = ['government_id', 'driver_license', 'employment_contract'];
const VEHICLE_REQUIRED_DOC_TYPES = ['vehicle_registration'];

/*
 * Document types that require a non-null expires_at. For these types,
 * an active document whose expires_at has passed is treated as expired
 * by compliance even if the daily job has not yet transitioned its status.
 */
const EXPIRY_REQUIRED_TYPES = new Set(['driver_license', 'vehicle_registration']);

/*
 * Classifies a single document (or its absence) into the appropriate
 * compliance bucket. Mutates the result arrays in place.
 */
function _classifyDocument(doc, ownerType, ownerId, documentType, now, soonThreshold, missingDocuments, expired, expiringSoon) {
  if (!doc) {
    missingDocuments.push({ ownerType, ownerId, documentType });
    return;
  }

  if (doc.status === 'expired') {
    expired.push({ id: doc.id, ownerType, ownerId, documentType, expiresAt: doc.expiresAt });
    return;
  }

  // status === 'active'
  if (EXPIRY_REQUIRED_TYPES.has(documentType)) {
    if (doc.expiresAt <= now) {
      /*
       * Document is active in the DB but its expiration date has passed.
       * The daily job marks these as expired at 03:00 UTC; compliance
       * checks the date directly so the result is always authoritative.
       */
      expired.push({ id: doc.id, ownerType, ownerId, documentType, expiresAt: doc.expiresAt });
    } else if (doc.expiresAt <= soonThreshold) {
      expiringSoon.push({ id: doc.id, ownerType, ownerId, documentType, expiresAt: doc.expiresAt });
    }
  }
}

class ComplianceService {
  async compute(providerId, requestingUser) {
    const provider = await ServiceProvider.findByPk(providerId);
    if (!provider) throw new NotFoundError('Service provider not found');
    if (requestingUser.role !== 'admin' && requestingUser.serviceProviderId !== providerId) {
      throw new ForbiddenError("Cannot view another provider's compliance");
    }

    const now = new Date();
    const soonThreshold = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

    const missingDocuments = [];
    const expired = [];
    const expiringSoon = [];

    // Fetch employees, vehicles, and provider's tax_id in parallel
    const [employees, vehicles, taxIdDoc] = await Promise.all([
      Employee.findAll({ where: { serviceProviderId: providerId, status: 'active' } }),
      Vehicle.findAll({ where: { serviceProviderId: providerId, status: 'active' } }),
      Document.findOne({
        where: {
          serviceProviderId: providerId,
          employeeId: null,
          vehicleId: null,
          documentType: 'tax_id',
          status: { [Op.in]: ['active', 'expired'] },
        },
        order: [['createdAt', 'DESC']],
      }),
    ]);

    _classifyDocument(taxIdDoc, 'provider', providerId, 'tax_id', now, soonThreshold, missingDocuments, expired, expiringSoon);

    const employeeIds = employees.map((e) => e.id);
    const vehicleIds = vehicles.map((v) => v.id);

    // Batch-fetch all relevant docs in two queries rather than one per entity
    const [employeeDocs, vehicleDocs] = await Promise.all([
      employeeIds.length > 0
        ? Document.findAll({
            where: {
              employeeId: { [Op.in]: employeeIds },
              documentType: { [Op.in]: EMPLOYEE_REQUIRED_DOC_TYPES },
              status: { [Op.in]: ['active', 'expired'] },
            },
            order: [['createdAt', 'DESC']],
          })
        : [],
      vehicleIds.length > 0
        ? Document.findAll({
            where: {
              vehicleId: { [Op.in]: vehicleIds },
              documentType: { [Op.in]: VEHICLE_REQUIRED_DOC_TYPES },
              status: { [Op.in]: ['active', 'expired'] },
            },
            order: [['createdAt', 'DESC']],
          })
        : [],
    ]);

    /*
     * Index fetched docs by entity id → documentType → most recent doc.
     * The ORDER BY createdAt DESC ensures the first occurrence per key
     * is always the latest, so we only store it once.
     */
    const empDocIndex = {};
    for (const doc of employeeDocs) {
      if (!empDocIndex[doc.employeeId]) empDocIndex[doc.employeeId] = {};
      if (!empDocIndex[doc.employeeId][doc.documentType]) {
        empDocIndex[doc.employeeId][doc.documentType] = doc;
      }
    }

    const vehDocIndex = {};
    for (const doc of vehicleDocs) {
      if (!vehDocIndex[doc.vehicleId]) vehDocIndex[doc.vehicleId] = {};
      if (!vehDocIndex[doc.vehicleId][doc.documentType]) {
        vehDocIndex[doc.vehicleId][doc.documentType] = doc;
      }
    }

    for (const employee of employees) {
      for (const docType of EMPLOYEE_REQUIRED_DOC_TYPES) {
        const doc = empDocIndex[employee.id]?.[docType] ?? null;
        _classifyDocument(doc, 'employee', employee.id, docType, now, soonThreshold, missingDocuments, expired, expiringSoon);
      }
    }

    for (const vehicle of vehicles) {
      for (const docType of VEHICLE_REQUIRED_DOC_TYPES) {
        const doc = vehDocIndex[vehicle.id]?.[docType] ?? null;
        _classifyDocument(doc, 'vehicle', vehicle.id, docType, now, soonThreshold, missingDocuments, expired, expiringSoon);
      }
    }

    const isCompliant = missingDocuments.length === 0 && expired.length === 0;
    return { isCompliant, missingDocuments, expired, expiringSoon };
  }
}

module.exports = new ComplianceService();
