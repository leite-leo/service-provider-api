'use strict';

module.exports = (sequelize, DataTypes) => {
  const ServiceProvider = sequelize.define(
    'ServiceProvider',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      corporateName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      taxId: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      country: {
        type: DataTypes.CHAR(2),
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      postalCode: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      approvedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      approvedBy: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      statusChangedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'service_providers',
      underscored: true,
      timestamps: true,
    },
  );

  ServiceProvider.associate = (models) => {
    ServiceProvider.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    ServiceProvider.belongsTo(models.User, { foreignKey: 'approvedBy', as: 'approver' });
    ServiceProvider.hasMany(models.Employee, { foreignKey: 'serviceProviderId', as: 'employees' });
    ServiceProvider.hasMany(models.Vehicle, { foreignKey: 'serviceProviderId', as: 'vehicles' });
    ServiceProvider.hasMany(models.Document, { foreignKey: 'serviceProviderId', as: 'documents' });
  };

  return ServiceProvider;
};
