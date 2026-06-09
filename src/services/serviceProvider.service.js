'use strict';

const Sentry = require('@sentry/node');
const admin = require('../config/firebase.config');
const { ServiceProvider, User } = require('../models');
const { NotFoundError, ConflictError } = require('../utils/errors.utils');

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class ServiceProviderService {
  async findById(id) {
    const provider = await ServiceProvider.findByPk(id);
    if (!provider) throw new NotFoundError('Service provider not found');
    return provider;
  }

  async findAll({ status, country, page = 1, limit = DEFAULT_PAGE_SIZE } = {}) {
    const safeLimit = Math.min(limit, MAX_PAGE_SIZE);
    const offset = (page - 1) * safeLimit;

    const where = {};
    if (status) where.status = status;
    if (country) where.country = country;

    const { count, rows } = await ServiceProvider.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: safeLimit,
      offset,
    });

    return {
      data: rows,
      pagination: {
        page,
        limit: safeLimit,
        total: count,
        total_pages: Math.ceil(count / safeLimit),
      },
    };
  }

  async create(
    { corporateName, taxId, country, phone, email, address,
      city, state, postalCode, representativeName },
    adminUserId,
  ) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new ConflictError('A user with this email already exists');

    let firebaseUid;
    try {
      const firebaseUser = await admin.auth().createUser({
        email,
        displayName: representativeName,
      });
      firebaseUid = firebaseUser.uid;
    } catch (firebaseError) {
      if (firebaseError.code === 'auth/email-already-exists') {
        throw new ConflictError('A user with this email already exists');
      }
      throw firebaseError;
    }

    const { sequelize } = ServiceProvider;
    let provider;
    let user;

    try {
      await sequelize.transaction(async (transaction) => {
        provider = await ServiceProvider.create(
          {
            corporateName, taxId, country, phone, email,
            address, city, state, postalCode,
            status: 'pending',
            createdBy: adminUserId,
          },
          { transaction },
        );

        user = await User.create(
          {
            firebaseUid, email, name: representativeName,
            role: 'provider', serviceProviderId: provider.id,
          },
          { transaction },
        );
      });
    } catch (dbError) {
      /*
       * Postgres transaction failed after Firebase user was already created.
       * Attempt to delete the Firebase user to keep systems consistent.
       * If the delete also fails, capture via Sentry — orphaned Firebase users
       * cannot authenticate (auth middleware requires a local User record),
       * but the event must remain visible to operators.
       */
      try {
        await admin.auth().deleteUser(firebaseUid);
      } catch (deleteError) {
        Sentry.captureException(deleteError, {
          level: 'error',
          tags: {
            issue_type: 'orphaned_firebase_user',
            firebase_uid: firebaseUid,
          },
        });
        console.error('Failed to delete Firebase user during saga rollback:', deleteError);
      }
      throw dbError;
    }

    const passwordSetupLink = await admin.auth().generatePasswordResetLink(email);

    return { provider, user, passwordSetupLink };
  }

  async approve(id, adminUserId) {
    const provider = await this.findById(id);
    if (provider.status !== 'pending') {
      throw new ConflictError(`Cannot approve a provider in ${provider.status} state`);
    }
    const now = new Date();
    provider.status = 'approved';
    provider.approvedAt = now;
    provider.approvedBy = adminUserId;
    provider.statusChangedAt = now;
    provider.statusChangedBy = adminUserId;
    await provider.save();
    return provider;
  }

  async deactivate(id, adminUserId) {
    const provider = await this.findById(id);
    if (!['pending', 'approved'].includes(provider.status)) {
      throw new ConflictError(`Cannot deactivate a provider in ${provider.status} state`);
    }
    const now = new Date();
    provider.status = 'inactive';
    provider.statusChangedAt = now;
    provider.statusChangedBy = adminUserId;
    await provider.save();
    return provider;
  }

  async regenerateInvite(id) {
    const provider = await this.findById(id);
    const user = await User.findOne({
      where: { serviceProviderId: provider.id, role: 'provider' },
    });
    if (!user) throw new NotFoundError(`No provider user found for provider ${id}`);
    const passwordSetupLink = await admin.auth().generatePasswordResetLink(user.email);
    return { passwordSetupLink };
  }
}

module.exports = new ServiceProviderService();
