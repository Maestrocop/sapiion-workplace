import { DataTypes } from 'sequelize';

export default function defineInternship(sequelize) {
  return sequelize.define('Internship', {
    id:                  { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    student_id:          { type: DataTypes.BIGINT, allowNull: false },
    campaign_id:         { type: DataTypes.BIGINT },
    class_id:            { type: DataTypes.BIGINT },   // legacy fallback only; prefer campaign.class_id
    title:               { type: DataTypes.TEXT },
    company_name:        { type: DataTypes.TEXT },
    company_address:     { type: DataTypes.TEXT },
    company_sector:      { type: DataTypes.STRING(100) },
    start_date:          { type: DataTypes.DATEONLY },
    end_date:            { type: DataTypes.DATEONLY },
    working_schedule:    { type: DataTypes.TEXT },
    status:              { type: DataTypes.TEXT, allowNull: false, defaultValue: 'active' },
    phase:               { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'searching' },
    placement_substate:  { type: DataTypes.STRING(50) },
    completed_at:        { type: DataTypes.DATE },
    total_hours:         { type: DataTypes.DECIMAL(7, 1) },
    final_score:         { type: DataTypes.DECIMAL(5, 2) },
    completion_note:     { type: DataTypes.TEXT },
  }, {
    tableName:   'internships',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
