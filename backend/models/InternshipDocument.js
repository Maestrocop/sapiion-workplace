import { DataTypes } from 'sequelize';

export default function defineInternshipDocument(sequelize) {
  return sequelize.define('InternshipDocument', {
    id:             { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:  { type: DataTypes.BIGINT, allowNull: false },
    doc_type:       { type: DataTypes.TEXT, allowNull: false },
    version:        { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    original_name:  { type: DataTypes.TEXT, allowNull: false },
    file_path:      { type: DataTypes.TEXT, allowNull: false },
    file_size:      { type: DataTypes.BIGINT },
    mime_type:      { type: DataTypes.TEXT },
    status:         { type: DataTypes.TEXT, allowNull: false, defaultValue: 'submitted' },
    coach_feedback: { type: DataTypes.TEXT },
    reviewed_by:    { type: DataTypes.BIGINT },
    reviewed_at:    { type: DataTypes.DATE },
    uploaded_by:    { type: DataTypes.BIGINT },
  }, {
    tableName:   'internship_documents',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
