import { DataTypes } from 'sequelize';

export default function defineInternshipCampaign(sequelize) {
  return sequelize.define('InternshipCampaign', {
    id:                    { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    class_id:              { type: DataTypes.BIGINT, allowNull: false },
    academic_year_id:      { type: DataTypes.BIGINT, allowNull: false },
    campaign_type:         { type: DataTypes.TEXT, allowNull: false, defaultValue: 'graduation' },
    name:                  { type: DataTypes.TEXT, allowNull: false },
    coordinator_id:        { type: DataTypes.BIGINT },
    search_start_date:     { type: DataTypes.DATEONLY },
    placement_target_date: { type: DataTypes.DATEONLY },
    internship_start_date: { type: DataTypes.DATEONLY },
    internship_end_date:   { type: DataTypes.DATEONLY },
    status:                { type: DataTypes.TEXT, allowNull: false, defaultValue: 'planning' },
    document_policy:       { type: DataTypes.STRING(50), defaultValue: 'recommended' },
    notes:                 { type: DataTypes.TEXT },
  }, {
    tableName:   'internship_campaigns',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
