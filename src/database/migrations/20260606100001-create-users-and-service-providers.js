'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    /*
     * users is created first because service_providers references users.id
     * via created_by and approved_by. The users.service_provider_id FK and
     * the accompanying CHECK constraint are deferred to a subsequent migration
     * to break the circular dependency.
     */
    await queryInterface.createTable('users', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      firebase_uid: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      service_provider_id: {
        type: Sequelize.UUID,
        allowNull: true,
        // FK and role/service_provider_id CHECK added in add-fk-users-service-provider migration
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
      ALTER TABLE users
      ADD CONSTRAINT chk_users_role
      CHECK (role IN ('admin', 'provider'));
    `);

    await queryInterface.createTable('service_providers', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
      },
      corporate_name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      tax_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      country: {
        type: Sequelize.CHAR(2),
        allowNull: false,
      },
      phone: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      address: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      city: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      state: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      postal_code: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      approved_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approved_by: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      status_changed_at: {
        type: Sequelize.DATE,
        allowNull: true,
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
      ALTER TABLE service_providers
      ADD CONSTRAINT chk_service_providers_country
      CHECK (country IN ('BR', 'US', 'DE', 'GB', 'FR'));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE service_providers
      ADD CONSTRAINT chk_service_providers_status
      CHECK (status IN ('pending', 'approved', 'inactive'));
    `);

    await queryInterface.addIndex('service_providers', ['status'], {
      name: 'idx_service_providers_status',
    });

    await queryInterface.addIndex('service_providers', ['country'], {
      name: 'idx_service_providers_country',
    });
  },

  async down(queryInterface) {
    // Drop in reverse dependency order: service_providers references users
    await queryInterface.dropTable('service_providers');
    await queryInterface.dropTable('users');
  },
};
