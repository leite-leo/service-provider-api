'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeColumn('service_providers', 'created_by');

    /*
     * Postgres requires drop + recreate to modify a named CHECK constraint.
     * The constraint was defined as chk_service_providers_status in the
     * original create migration.
     */
    await queryInterface.sequelize.query(`
      ALTER TABLE service_providers
      DROP CONSTRAINT IF EXISTS chk_service_providers_status;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE service_providers
      ADD CONSTRAINT chk_service_providers_status
      CHECK (status IN ('pending','pending_review','approved','inactive'));
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE service_providers
      DROP CONSTRAINT IF EXISTS chk_service_providers_status;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE service_providers
      ADD CONSTRAINT chk_service_providers_status
      CHECK (status IN ('pending','approved','inactive'));
    `);

    // Nullable since data is lost on down
    await queryInterface.addColumn('service_providers', 'created_by', {
      type: Sequelize.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onDelete: 'SET NULL',
    });
  },
};
