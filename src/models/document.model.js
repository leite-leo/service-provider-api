'use strict';

module.exports = (sequelize, DataTypes) => {
  const Document = sequelize.define(
    'Document',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      serviceProviderId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      employeeId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      vehicleId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
      documentType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fileUrl: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
      issuedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      uploadedBy: {
        type: DataTypes.UUID,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: 'documents',
      underscored: true,
      timestamps: true,
    },
  );

  Document.associate = (models) => {
    Document.belongsTo(models.ServiceProvider, {
      foreignKey: 'serviceProviderId',
      as: 'serviceProvider',
    });
    Document.belongsTo(models.Employee, {
      foreignKey: 'employeeId',
      as: 'employee',
    });
    Document.belongsTo(models.Vehicle, {
      foreignKey: 'vehicleId',
      as: 'vehicle',
    });
    Document.belongsTo(models.User, {
      foreignKey: 'uploadedBy',
      as: 'uploader',
    });
  };

  return Document;
};
