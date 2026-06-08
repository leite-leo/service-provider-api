'use strict';

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        defaultValue: DataTypes.UUIDV4,
      },
      firebaseUid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      serviceProviderId: {
        type: DataTypes.UUID,
        allowNull: true,
        // FK and CHECK constraint added in the fk-users-service-provider migration
      },
    },
    {
      sequelize,
      tableName: 'users',
      underscored: true,
      timestamps: true,
    },
  );

  User.associate = (models) => {
    User.belongsTo(models.ServiceProvider, {
      foreignKey: 'serviceProviderId',
      as: 'serviceProvider',
    });
  };

  return User;
};
