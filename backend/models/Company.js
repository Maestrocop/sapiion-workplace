import { DataTypes } from 'sequelize';

export default function defineCompany(sequelize) {
  return sequelize.define('Company', {
    id:           { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    name:         { type: DataTypes.TEXT, allowNull: false },
    address:      { type: DataTypes.TEXT },
    city:         { type: DataTypes.STRING(100) },
    postal_code:  { type: DataTypes.STRING(20) },
    country:      { type: DataTypes.STRING(100) },
    website:      { type: DataTypes.TEXT },
    phone:        { type: DataTypes.STRING(50) },
    email:        { type: DataTypes.TEXT },
    sector:       { type: DataTypes.STRING(100) },
    company_size: { type: DataTypes.STRING(50) },
    source_type:  { type: DataTypes.STRING(50), allowNull: false, defaultValue: 'application' },
    source_id:    { type: DataTypes.BIGINT },
    duplicate_of:       { type: DataTypes.BIGINT },
    is_flagged:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    flag_reason:        { type: DataTypes.TEXT },
    partnership_status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'prospect' },
    notes:              { type: DataTypes.TEXT },
    last_contact_date:  { type: DataTypes.DATEONLY },
  }, {
    tableName:   'companies',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
