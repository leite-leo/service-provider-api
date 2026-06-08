'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('vehicles', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      service_provider_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'service_providers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      vin: {
        type: Sequelize.STRING(17),
        allowNull: false,
        unique: true,
      },
      license_plate: {
        type: Sequelize.STRING(10),
        allowNull: false,
        unique: true,
      },
      make: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      model: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      vehicle_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      year: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });

    await queryInterface.sequelize.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT chk_vehicles_vehicle_type
      CHECK (vehicle_type IN ('car', 'van', 'truck', 'motorcycle'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE vehicles
      ADD CONSTRAINT chk_vehicles_status
      CHECK (status IN ('active', 'inactive'));
    `);

    // Composite index for provider-scoped vehicle listings filtered by status
    await queryInterface.addIndex('vehicles', ['service_provider_id', 'status'], {
      name: 'idx_vehicles_service_provider_id_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('vehicles');
  },
};
