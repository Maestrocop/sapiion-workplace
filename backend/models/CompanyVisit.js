import { DataTypes } from 'sequelize';

export default function defineCompanyVisit(sequelize) {
  return sequelize.define('CompanyVisit', {
    id:         { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    company_id: { type: DataTypes.BIGINT, allowNull: false },
    visited_by: { type: DataTypes.BIGINT },
    visit_date: { type: DataTypes.DATEONLY, allowNull: false },
    visit_type: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'visit' },
    notes:      { type: DataTypes.TEXT },
  }, {
    tableName:   'company_visits',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
