import { DataTypes } from 'sequelize';

export default function defineUser(sequelize) {
  return sequelize.define('User', {
    id:                     { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    email:                  { type: DataTypes.STRING(255), allowNull: false },
    password_hash:          { type: DataTypes.STRING(255) },
    first_name:             { type: DataTypes.STRING(100), allowNull: false },
    last_name:              { type: DataTypes.STRING(100), allowNull: false },
    roles:                  { type: DataTypes.ARRAY(DataTypes.TEXT), allowNull: false, defaultValue: ['student'] },
    class_id:               { type: DataTypes.BIGINT },
    is_active:              { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    avatar_url:             { type: DataTypes.TEXT },
    google_id:              { type: DataTypes.TEXT },
    microsoft_id:           { type: DataTypes.TEXT },
    failed_login_attempts:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    locked_until:           { type: DataTypes.DATE },
    password_reset_token:   { type: DataTypes.TEXT },
    password_reset_expires: { type: DataTypes.DATE },
    last_login_at:          { type: DataTypes.DATE },
  }, {
    tableName:   'users',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
