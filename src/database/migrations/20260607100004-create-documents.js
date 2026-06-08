'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('documents', {
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
      employee_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      vehicle_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'vehicles', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      document_type: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      file_url: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      issued_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      uploaded_by: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
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
      ALTER TABLE documents
      ADD CONSTRAINT chk_documents_document_type
      CHECK (document_type IN (
        'tax_id',
        'government_id',
        'driver_license',
        'employment_contract',
        'vehicle_registration'
      ));
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE documents
      ADD CONSTRAINT chk_documents_status
      CHECK (status IN ('active', 'expired', 'archived'));
    `);

    /*
     * Polymorphic ownership constraint: at most one of employee_id and
     * vehicle_id may be non-null. The three valid states are:
     *   both null       → provider-level document (e.g. tax_id)
     *   employee_id set → employee-level document
     *   vehicle_id set  → vehicle-level document
     */
    await queryInterface.sequelize.query(`
      ALTER TABLE documents
      ADD CONSTRAINT documents_owner_polymorphism_check
      CHECK (
        (employee_id IS NULL AND vehicle_id IS NULL)
        OR (employee_id IS NOT NULL AND vehicle_id IS NULL)
        OR (employee_id IS NULL AND vehicle_id IS NOT NULL)
      );
    `);

    /*
     * Three partial unique indexes enforce the one-active-document-per-type
     * rule per entity, scoped only to status = 'active' rows so that archived
     * and expired documents do not block new uploads.
     *
     * Raw SQL is used because queryInterface.addIndex does not reliably
     * support WHERE clauses with IS NULL conditions across Sequelize versions.
     */
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX documents_active_provider_type_idx
        ON documents (service_provider_id, document_type)
        WHERE status = 'active'
          AND employee_id IS NULL
          AND vehicle_id IS NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX documents_active_employee_type_idx
        ON documents (employee_id, document_type)
        WHERE status = 'active'
          AND employee_id IS NOT NULL;
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX documents_active_vehicle_type_idx
        ON documents (vehicle_id, document_type)
        WHERE status = 'active'
          AND vehicle_id IS NOT NULL;
    `);

    // For compliance queries scoped to a provider
    await queryInterface.addIndex('documents', ['service_provider_id', 'status'], {
      name: 'idx_documents_service_provider_id_status',
    });

    // For the daily document expiration job
    await queryInterface.addIndex('documents', ['status', 'expires_at'], {
      name: 'idx_documents_status_expires_at',
    });
  },

  async down(queryInterface) {
    // Dropping the table removes all indexes and constraints defined on it
    await queryInterface.dropTable('documents');
  },
};
