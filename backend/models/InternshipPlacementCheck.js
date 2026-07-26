import { DataTypes } from 'sequelize';

export default function defineInternshipPlacementCheck(sequelize) {
  return sequelize.define('InternshipPlacementCheck', {
    id:            { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id: { type: DataTypes.BIGINT, allowNull: false },
    definition_id: { type: DataTypes.BIGINT, allowNull: false },
    is_completed:  { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    completed_by:  { type: DataTypes.BIGINT },
    completed_at:  { type: DataTypes.DATE },
    notes:         { type: DataTypes.TEXT },
  }, {
    tableName:   'internship_placement_checks',
    underscored: true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
  });
}
