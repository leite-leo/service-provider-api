'use strict';

module.exports = {
  async up(queryInterface) {
    /*
     * This migration closes the circular dependency deferred from
     * create-users-and-service-providers: users.service_provider_id now gets
     * a proper FK and the role-consistency CHECK constraint.
     *
     * onDelete: SET NULL keeps the user record intact if a service_provider
     * row is somehow removed; the application soft-deletes providers via
     * status, so hard deletion should never happen in practice.
     */
    await queryInterface.addConstraint('users', {
      fields: ['service_provider_id'],
      type: 'foreign key',
      name: 'fk_users_service_provider_id',
      references: { table: 'service_providers', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    /*
     * Enforces the invariant from database-model.md:
     * - provider users must be linked to a service_provider
     * - admin users must not be linked to any service_provider
     */
    await queryInterface.sequelize.query(`
      ALTER TABLE users
      ADD CONSTRAINT chk_users_role_service_provider
      CHECK (
        (role = 'provider' AND service_provider_id IS NOT NULL)
        OR (role = 'admin' AND service_provider_id IS NULL)
      );
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT chk_users_role_service_provider;
    `);

    await queryInterface.removeConstraint('users', 'fk_users_service_provider_id');
  },
};
