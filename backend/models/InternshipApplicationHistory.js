import { DataTypes } from 'sequelize';

export default function defineInternshipApplicationHistory(sequelize) {
  return sequelize.define('InternshipApplicationHistory', {
    id:             { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    application_id: { type: DataTypes.BIGINT, allowNull: false },
    outcome:        { type: DataTypes.TEXT, allowNull: false },
    interview_date: { type: DataTypes.DATEONLY },
    notes:          { type: DataTypes.TEXT },
    created_by:     { type: DataTypes.BIGINT },
  }, {
    tableName:   'internship_application_history',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
