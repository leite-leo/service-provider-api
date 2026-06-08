'use strict';

module.exports = {
  async up(queryInterface) {
    // onDelete SET NULL: providers are soft-deleted via status, never hard-deleted
    await queryInterface.addConstraint('users', {
      fields: ['service_provider_id'],
      type: 'foreign key',
      name: 'fk_users_service_provider_id',
      references: { table: 'service_providers', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

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
