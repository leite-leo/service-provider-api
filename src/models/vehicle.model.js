'use strict';

module.exports = (sequelize, DataTypes) => {
  const Vehicle = sequelize.define(
    'Vehicle',
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
      vin: {
        type: DataTypes.STRING(17),
        allowNull: false,
        unique: true,
      },
      licensePlate: {
        type: DataTypes.STRING(10),
        allowNull: false,
        unique: true,
      },
      make: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      model: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      vehicleType: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      year: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      tableName: 'vehicles',
      underscored: true,
      timestamps: true,
    },
  );

  Vehicle.associate = (models) => {
    Vehicle.belongsTo(models.ServiceProvider, {
      foreignKey: 'serviceProviderId',
      as: 'serviceProvider',
    });
    // hasMany(Document) added when Document model is created
  };

  return Vehicle;
};
