import { DataTypes } from 'sequelize';

export default function defineInternshipReview(sequelize) {
  return sequelize.define('InternshipReview', {
    id:                    { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:         { type: DataTypes.BIGINT, allowNull: false },
    scheduled_date:        { type: DataTypes.DATEONLY, allowNull: false },
    status:                { type: DataTypes.TEXT, allowNull: false, defaultValue: 'scheduled' },
    reviewer_id:           { type: DataTypes.BIGINT },
    supervisor_id:         { type: DataTypes.BIGINT },
    report:                { type: DataTypes.TEXT },
    hours_logged_snapshot: { type: DataTypes.DECIMAL(7, 1) },
    completed_at:          { type: DataTypes.DATE },
  }, {
    tableName:   'internship_reviews',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
