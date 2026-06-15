'use strict';

module.exports = {
  async up(queryInterface) {
    // Prevents the same person being registered twice under the same provider
    await queryInterface.addIndex('employees', ['service_provider_id', 'government_id'], {
      unique: true,
      name: 'uq_employees_provider_government_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('employees', 'uq_employees_provider_government_id');
  },
};
