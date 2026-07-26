import { DataTypes } from 'sequelize';

// Deliberately a plain record — title/points/discipline only, no grading or
// rubric engine. See CLAUDE.md "Deliberate scope boundaries".
export default function defineAssignment(sequelize) {
  return sequelize.define('Assignment', {
    id:              { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    title:           { type: DataTypes.TEXT, allowNull: false },
    points_possible: { type: DataTypes.DECIMAL(10, 2) },
    discipline:      { type: DataTypes.TEXT },
    due_date:        { type: DataTypes.DATE },
    status:          { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'draft' },
  }, {
    tableName:   'assignments',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
