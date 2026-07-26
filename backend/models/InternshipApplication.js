import { DataTypes } from 'sequelize';

export default function defineInternshipApplication(sequelize) {
  return sequelize.define('InternshipApplication', {
    id:                   { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    internship_id:        { type: DataTypes.BIGINT, allowNull: false },
    company_name:         { type: DataTypes.TEXT, allowNull: false },
    company_email:        { type: DataTypes.TEXT },
    company_website:      { type: DataTypes.TEXT },
    company_contact_name: { type: DataTypes.TEXT },
    company_address:      { type: DataTypes.TEXT },
    company_city:         { type: DataTypes.STRING(100) },
    company_postal_code:  { type: DataTypes.STRING(20) },
    company_country:      { type: DataTypes.STRING(100) },
    cv_document_id:       { type: DataTypes.BIGINT },
    letter_document_id:   { type: DataTypes.BIGINT },
    sent_via_app:         { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    sent_at:              { type: DataTypes.DATE },
    email_subject:        { type: DataTypes.TEXT },
    outcome:              { type: DataTypes.TEXT, allowNull: false, defaultValue: 'pending' },
    interview_date:       { type: DataTypes.DATEONLY },
    notes:                { type: DataTypes.TEXT },
    coach_note:           { type: DataTypes.TEXT },
  }, {
    tableName:   'internship_applications',
    underscored: true,
    paranoid:    true,
    timestamps:  true,
    createdAt:   'created_at',
    updatedAt:   'updated_at',
    deletedAt:   'deleted_at',
  });
}
