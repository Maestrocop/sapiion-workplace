import { DataTypes } from 'sequelize';

export default function defineInternshipSupervisor(sequelize) {
  return sequelize.define('InternshipSupervisor', {
    id:               { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:    { type: DataTypes.BIGINT, allowNull: false },
    name:             { type: DataTypes.TEXT, allowNull: false },
    email:            { type: DataTypes.TEXT },
    phone:            { type: DataTypes.TEXT },
    job_title:        { type: DataTypes.TEXT },
    access_token:     { type: DataTypes.TEXT, allowNull: false },
    token_expires_at: { type: DataTypes.DATE },
  }, {
    tableName:   'internship_supervisors',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
