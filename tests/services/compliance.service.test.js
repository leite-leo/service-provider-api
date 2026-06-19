'use strict';

jest.mock('../../src/models', () => ({
  ServiceProvider: { findByPk: jest.fn() },
  Employee: { findAll: jest.fn() },
  Vehicle: { findAll: jest.fn() },
  Document: { findAll: jest.fn(), findOne: jest.fn() },
}));

const { ServiceProvider, Employee, Vehicle, Document } = require('../../src/models');
const complianceService = require('../../src/services/compliance.service');
const { NotFoundError, ForbiddenError } = require('../../src/utils/errors.utils');

const PROVIDER_ID = 'provider-uuid';
const ADMIN_USER = { role: 'admin' };

describe('ComplianceService.compute', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    ServiceProvider.findByPk.mockResolvedValue({ id: PROVIDER_ID });
  });

  it('returns isCompliant=true when all required docs are valid', async () => {
    Employee.findAll.mockResolvedValue([]);
    Vehicle.findAll.mockResolvedValue([]);
    Document.findOne.mockResolvedValue({ id: 'tax-doc', status: 'active', expiresAt: null });

    const result = await complianceService.compute(PROVIDER_ID, ADMIN_USER);

    expect(result.isCompliant).toBe(true);
    expect(result.missingDocuments).toHaveLength(0);
    expect(result.expired).toHaveLength(0);
    expect(result.expiringSoon).toHaveLength(0);
  });

  it('lists missing tax_id when provider has no tax_id document', async () => {
    Employee.findAll.mockResolvedValue([]);
    Vehicle.findAll.mockResolvedValue([]);
    Document.findOne.mockResolvedValue(null);

    const result = await complianceService.compute(PROVIDER_ID, ADMIN_USER);

    expect(result.isCompliant).toBe(false);
    expect(result.missingDocuments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerType: 'provider', documentType: 'tax_id' }),
      ]),
    );
  });

  it('marks active docs with past expiresAt as expired', async () => {
    const employeeId = 'emp-1';
    Employee.findAll.mockResolvedValue([{ id: employeeId }]);
    Vehicle.findAll.mockResolvedValue([]);
    Document.findOne.mockResolvedValue({ id: 'tax-doc', status: 'active', expiresAt: null });
    Document.findAll.mockResolvedValueOnce([
      { id: 'doc-gov', employeeId, documentType: 'government_id', status: 'active', expiresAt: null },
      { id: 'doc-drv', employeeId, documentType: 'driver_license', status: 'active', expiresAt: new Date('2020-01-01') },
      { id: 'doc-emp', employeeId, documentType: 'employment_contract', status: 'active', expiresAt: null },
    ]);

    const result = await complianceService.compute(PROVIDER_ID, ADMIN_USER);

    expect(result.isCompliant).toBe(false);
    expect(result.expired).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerType: 'employee', ownerId: employeeId, documentType: 'driver_license' }),
      ]),
    );
  });

  it('marks active docs expiring within 30 days as expiringSoon', async () => {
    const employeeId = 'emp-1';
    const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    Employee.findAll.mockResolvedValue([{ id: employeeId }]);
    Vehicle.findAll.mockResolvedValue([]);
    Document.findOne.mockResolvedValue({ id: 'tax-doc', status: 'active', expiresAt: null });
    Document.findAll.mockResolvedValueOnce([
      { id: 'doc-gov', employeeId, documentType: 'government_id', status: 'active', expiresAt: null },
      { id: 'doc-drv', employeeId, documentType: 'driver_license', status: 'active', expiresAt: soonDate },
      { id: 'doc-emp', employeeId, documentType: 'employment_contract', status: 'active', expiresAt: null },
    ]);

    const result = await complianceService.compute(PROVIDER_ID, ADMIN_USER);

    expect(result.expiringSoon).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ ownerType: 'employee', ownerId: employeeId, documentType: 'driver_license' }),
      ]),
    );
  });

  it('treats expiringSoon docs as non-blocking for isCompliant', async () => {
    const employeeId = 'emp-1';
    const soonDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
    Employee.findAll.mockResolvedValue([{ id: employeeId }]);
    Vehicle.findAll.mockResolvedValue([]);
    Document.findOne.mockResolvedValue({ id: 'tax-doc', status: 'active', expiresAt: null });
    Document.findAll.mockResolvedValueOnce([
      { id: 'doc-gov', employeeId, documentType: 'government_id', status: 'active', expiresAt: null },
      { id: 'doc-drv', employeeId, documentType: 'driver_license', status: 'active', expiresAt: soonDate },
      { id: 'doc-emp', employeeId, documentType: 'employment_contract', status: 'active', expiresAt: null },
    ]);

    const result = await complianceService.compute(PROVIDER_ID, ADMIN_USER);

    expect(result.isCompliant).toBe(true);
  });

  it('throws ForbiddenError when non-admin views another provider', async () => {
    const otherUser = { role: 'provider', serviceProviderId: 'different-provider-uuid' };

    await expect(
      complianceService.compute(PROVIDER_ID, otherUser),
    ).rejects.toThrow(ForbiddenError);
  });

  it('throws NotFoundError when provider does not exist', async () => {
    ServiceProvider.findByPk.mockResolvedValue(null);

    await expect(
      complianceService.compute(PROVIDER_ID, ADMIN_USER),
    ).rejects.toThrow(NotFoundError);
  });
});
