import { DataTypes } from 'sequelize';

export default function defineInternshipAssignmentLink(sequelize) {
  return sequelize.define('InternshipAssignmentLink', {
    id:                { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:     { type: DataTypes.BIGINT, allowNull: false },
    assignment_id:     { type: DataTypes.BIGINT, allowNull: false },
    due_date_override: { type: DataTypes.DATEONLY },
    display_order:     { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  }, {
    tableName:   'internship_assignments',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
