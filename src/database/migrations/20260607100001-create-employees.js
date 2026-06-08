'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
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
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      government_id: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
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
      ALTER TABLE employees
      ADD CONSTRAINT chk_employees_status
      CHECK (status IN ('active', 'inactive'));
    `);

    /*
     * Unique constraint on (service_provider_id, email) enforces BR003:
     * employee emails must be unique within a provider, but not globally.
     */
    await queryInterface.addIndex('employees', ['service_provider_id', 'email'], {
      unique: true,
      name: 'uq_employees_provider_email',
    });

    // Composite index covering provider-scoped listings filtered by status
    await queryInterface.addIndex('employees', ['service_provider_id', 'status'], {
      name: 'idx_employees_service_provider_id_status',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employees');
  },
};
