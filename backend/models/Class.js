import { DataTypes } from 'sequelize';

export default function defineClass(sequelize) {
  return sequelize.define('Class', {
    id:   { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.TEXT, allowNull: false },
    code: { type: DataTypes.TEXT },
  }, {
    tableName:   'classes',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
