import { DataTypes } from 'sequelize';

export default function defineInternshipCheckDefinition(sequelize) {
  return sequelize.define('InternshipCheckDefinition', {
    id:               { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    check_key:        { type: DataTypes.STRING(100), allowNull: false, unique: true },
    label:            { type: DataTypes.TEXT, allowNull: false },
    category:         { type: DataTypes.STRING(50), allowNull: false },
    responsible_role: { type: DataTypes.STRING(50), allowNull: false },
    is_required:      { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    is_active:        { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order:       { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName:   'internship_check_definitions',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });
}
