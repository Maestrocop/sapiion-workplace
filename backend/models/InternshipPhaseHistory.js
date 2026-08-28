import { DataTypes } from 'sequelize';

export default function defineInternshipPhaseHistory(sequelize) {
  return sequelize.define('InternshipPhaseHistory', {
    id:            { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id: { type: DataTypes.BIGINT, allowNull: false },
    from_phase:    { type: DataTypes.STRING(20), allowNull: false },
    to_phase:      { type: DataTypes.STRING(20), allowNull: false },
    reason:        { type: DataTypes.TEXT, allowNull: false },
    created_by:    { type: DataTypes.BIGINT },
  }, {
    tableName:   'internship_phase_history',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   false,
    deletedAt:   'deleted_at',
  });
}
