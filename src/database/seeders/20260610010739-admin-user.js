'use strict';

const admin = require('../../config/firebase.config');
const { User } = require('../../models');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@admin.com';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'Admin123';
const ADMIN_NAME = 'Demo Admin';

module.exports = {
  async up() {
    /*
     * Idempotent: checks Firebase and Postgres independently before writing.
     * Safe to run multiple times without creating duplicates.
     */
    let firebaseUid;
    try {
      const existing = await admin.auth().getUserByEmail(ADMIN_EMAIL);
      firebaseUid = existing.uid;
    } catch (firebaseError) {
      if (firebaseError.code !== 'auth/user-not-found') throw firebaseError;
      const firebaseUser = await admin.auth().createUser({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        displayName: ADMIN_NAME,
        emailVerified: true,
      });
      firebaseUid = firebaseUser.uid;
    }

    const existingLocalUser = await User.findOne({ where: { firebaseUid } });
    if (!existingLocalUser) {
      await User.create({
        firebaseUid,
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        role: 'admin',
        serviceProviderId: null,
      });
    }
  },

  async down() {
    /*
     * No-op: rolling back this seed would remove system access and could
     * break environments that depend on the admin user. Manual cleanup:
     * delete the Firebase user and local User record by email if needed.
     */
  },
};
