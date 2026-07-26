import { DataTypes } from 'sequelize';

export default function defineInternshipAssessment(sequelize) {
  return sequelize.define('InternshipAssessment', {
    id:               { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:    { type: DataTypes.BIGINT, allowNull: false },
    assessor_role:    { type: DataTypes.TEXT, allowNull: false },
    assessor_user_id: { type: DataTypes.BIGINT },
    score:            { type: DataTypes.DECIMAL(5, 2) },
    max_score:        { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 100 },
    feedback:         { type: DataTypes.TEXT },
    reflection:       { type: DataTypes.TEXT },
    competency_notes: { type: DataTypes.TEXT },
    is_completed:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    submitted_at:     { type: DataTypes.DATE },
  }, {
    tableName:   'internship_assessments',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
