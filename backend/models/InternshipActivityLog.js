import { DataTypes } from 'sequelize';

export default function defineInternshipActivityLog(sequelize) {
  return sequelize.define('InternshipActivityLog', {
    id:                 { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:      { type: DataTypes.BIGINT, allowNull: false },
    title:              { type: DataTypes.STRING(200) },
    week_starting:      { type: DataTypes.DATEONLY },
    hours_logged:       { type: DataTypes.DECIMAL(5, 1) },
    content:            { type: DataTypes.TEXT, allowNull: false },
    supervisor_ack:     { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    supervisor_comment: { type: DataTypes.TEXT },
    created_by:         { type: DataTypes.BIGINT },
  }, {
    tableName:   'internship_activity_logs',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
