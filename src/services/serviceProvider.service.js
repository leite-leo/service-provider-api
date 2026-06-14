'use strict';

const Sentry = require('@sentry/node');
const admin = require('../config/firebase.config');
const { ServiceProvider, User } = require('../models');
const { NotFoundError, ConflictError, ForbiddenError } = require('../utils/errors.utils');

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

  async create({
    corporateName, taxId, country, phone, email, address,
    city, state, postalCode, representativeName, password,
  }) {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) throw new ConflictError('A user with this email already exists');

    let firebaseUid;
    try {
      const firebaseUser = await admin.auth().createUser({
        email,
        displayName: representativeName,
        password,
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

    /*
     * The same email is stored on both ServiceProvider and User. The fields
     * are expected to remain in sync; any future endpoint that updates
     * either side must cascade to keep them aligned.
     */
    try {
      await sequelize.transaction(async (transaction) => {
        provider = await ServiceProvider.create(
          {
            corporateName, taxId, country, phone, email,
            address, city, state, postalCode,
            status: 'pending',
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

    return { provider, user };
  }

  async approve(id, adminUserId) {
    const provider = await this.findById(id);
    if (provider.status !== 'pending_review') {
      throw new ConflictError(`Cannot approve a provider in ${provider.status} state`);
    }
    /*
     * TODO: Once the compliance endpoint is implemented, gate the approval
     * here. Provider must have compliance passing; otherwise throw a 422
     * with the compliance details. See architecture.md, "Compliance Computation".
     */
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
    if (!['pending', 'pending_review', 'approved'].includes(provider.status)) {
      throw new ConflictError(`Cannot deactivate a provider in ${provider.status} state`);
    }
    const now = new Date();
    provider.status = 'inactive';
    provider.statusChangedAt = now;
    provider.statusChangedBy = adminUserId;
    await provider.save();
    return provider;
  }

  async submit(providerId, requestingUser) {
    const provider = await this.findById(providerId);
    if (
      requestingUser.role !== 'provider'
      || requestingUser.serviceProviderId !== providerId
    ) {
      throw new ForbiddenError();
    }
    if (provider.status !== 'pending') {
      throw new ConflictError(`Cannot submit a provider in ${provider.status} state`);
    }
    const now = new Date();
    provider.status = 'pending_review';
    provider.statusChangedAt = now;
    provider.statusChangedBy = requestingUser.id;
    await provider.save();
    return provider;
  }

  async reject(id, adminUserId, reason) {
    const provider = await this.findById(id);
    if (provider.status !== 'pending_review') {
      throw new ConflictError(`Cannot reject a provider in ${provider.status} state`);
    }
    const now = new Date();
    provider.status = 'pending';
    provider.statusChangedAt = now;
    provider.statusChangedBy = adminUserId;
    await provider.save();
    return { provider, reason: reason || null };
  }
}

module.exports = new ServiceProviderService();
