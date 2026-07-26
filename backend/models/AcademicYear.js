import { DataTypes } from 'sequelize';

export default function defineAcademicYear(sequelize) {
  return sequelize.define('AcademicYear', {
    id:         { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    label:      { type: DataTypes.TEXT, allowNull: false },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date:   { type: DataTypes.DATEONLY, allowNull: false },
    is_current: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  }, {
    tableName:   'academic_years',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });
}
