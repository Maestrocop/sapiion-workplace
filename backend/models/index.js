import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { DataTypes } from 'sequelize';

export async function initModels(sequelize) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.js') && f !== 'index.js');
  const models = {};
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    let mod;
    try {
      mod = await import(pathToFileURL(filePath).href);
    } catch (err) {
      console.error('Failed to import model file:', filePath);
      console.error(err && err.message ? err.message : err);
      throw err;
    }
    const factory = mod.default;
    const model = factory(sequelize, DataTypes);
    models[model.name] = model;
  }

  // Companies
  if (models.Company && models.CompanyVisit) {
    models.Company.hasMany(models.CompanyVisit, { foreignKey: 'company_id', as: 'visits' });
    models.CompanyVisit.belongsTo(models.Company, { foreignKey: 'company_id', as: 'company' });
  }
  if (models.CompanyVisit && models.User) {
    models.CompanyVisit.belongsTo(models.User, { foreignKey: 'visited_by', as: 'visitor' });
  }

  // User's class (the group/course they're in, e.g. "BIM Year 3")
  if (models.User && models.Class) {
    models.User.belongsTo(models.Class, { foreignKey: 'class_id', as: 'enrolledClass' });
    models.Class.hasMany(models.User, { foreignKey: 'class_id', as: 'students' });
  }

  // User's cohort (their intake year, e.g. "2026-2027") — distinct from Class.
  // Reuses academic_years rather than a free-text field like ILS-dev's, since
  // Workplace already has that table for Internship Programme.
  if (models.User && models.AcademicYear) {
    models.User.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'cohort' });
    models.AcademicYear.hasMany(models.User, { foreignKey: 'academic_year_id', as: 'cohortUsers' });
  }

  // Internship campaign
  if (models.InternshipCampaign && models.Class) {
    models.InternshipCampaign.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
    models.Class.hasMany(models.InternshipCampaign, { foreignKey: 'class_id', as: 'internshipCampaigns' });
  }
  if (models.InternshipCampaign && models.AcademicYear) {
    models.InternshipCampaign.belongsTo(models.AcademicYear, { foreignKey: 'academic_year_id', as: 'academicYear' });
    models.AcademicYear.hasMany(models.InternshipCampaign, { foreignKey: 'academic_year_id', as: 'campaigns' });
  }
  if (models.InternshipCampaign && models.User) {
    models.InternshipCampaign.belongsTo(models.User, { foreignKey: 'coordinator_id', as: 'coordinator' });
  }
  if (models.InternshipCampaign && models.Internship) {
    models.InternshipCampaign.hasMany(models.Internship, { foreignKey: 'campaign_id', as: 'studentRecords' });
    models.Internship.belongsTo(models.InternshipCampaign, { foreignKey: 'campaign_id', as: 'campaign' });
  }

  // Internship student record
  if (models.Internship && models.User) {
    models.Internship.belongsTo(models.User, { foreignKey: 'student_id', as: 'student' });
    models.User.hasMany(models.Internship, { foreignKey: 'student_id', as: 'internships' });
  }
  if (models.Internship && models.Class) {
    models.Internship.belongsTo(models.Class, { foreignKey: 'class_id', as: 'legacyClass' });
  }
  if (models.Internship && models.InternshipSupervisor) {
    models.Internship.hasMany(models.InternshipSupervisor, { foreignKey: 'internship_id', as: 'supervisors' });
    models.InternshipSupervisor.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.Internship && models.InternshipActivityLog) {
    models.Internship.hasMany(models.InternshipActivityLog, { foreignKey: 'internship_id', as: 'activityLogs' });
    models.InternshipActivityLog.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipActivityLog && models.User) {
    models.InternshipActivityLog.belongsTo(models.User, { foreignKey: 'created_by', as: 'author' });
  }
  if (models.Internship && models.InternshipAssessment) {
    models.Internship.hasMany(models.InternshipAssessment, { foreignKey: 'internship_id', as: 'assessments' });
    models.InternshipAssessment.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipAssessment && models.User) {
    models.InternshipAssessment.belongsTo(models.User, { foreignKey: 'assessor_user_id', as: 'assessor' });
  }
  if (models.Internship && models.InternshipDocument) {
    models.Internship.hasMany(models.InternshipDocument, { foreignKey: 'internship_id', as: 'documents' });
    models.InternshipDocument.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.Internship && models.InternshipApplication) {
    models.Internship.hasMany(models.InternshipApplication, { foreignKey: 'internship_id', as: 'applications' });
    models.InternshipApplication.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipApplication && models.InternshipApplicationHistory) {
    models.InternshipApplication.hasMany(models.InternshipApplicationHistory, { foreignKey: 'application_id', as: 'history' });
    models.InternshipApplicationHistory.belongsTo(models.InternshipApplication, { foreignKey: 'application_id', as: 'application' });
  }
  if (models.InternshipApplication && models.InternshipDocument) {
    models.InternshipApplication.belongsTo(models.InternshipDocument, { foreignKey: 'cv_document_id', as: 'cvDocument' });
    models.InternshipApplication.belongsTo(models.InternshipDocument, { foreignKey: 'letter_document_id', as: 'letterDocument' });
  }
  if (models.Internship && models.InternshipPlacementCheck) {
    models.Internship.hasMany(models.InternshipPlacementCheck, { foreignKey: 'internship_id', as: 'placementChecks' });
    models.InternshipPlacementCheck.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipCheckDefinition && models.InternshipPlacementCheck) {
    models.InternshipCheckDefinition.hasMany(models.InternshipPlacementCheck, { foreignKey: 'definition_id', as: 'placementChecks' });
    models.InternshipPlacementCheck.belongsTo(models.InternshipCheckDefinition, { foreignKey: 'definition_id', as: 'definition' });
  }
  if (models.Internship && models.InternshipReview) {
    models.Internship.hasMany(models.InternshipReview, { foreignKey: 'internship_id', as: 'reviews' });
    models.InternshipReview.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipReview && models.User) {
    models.InternshipReview.belongsTo(models.User, { foreignKey: 'reviewer_id', as: 'reviewer' });
  }
  if (models.InternshipReview && models.InternshipSupervisor) {
    models.InternshipReview.belongsTo(models.InternshipSupervisor, { foreignKey: 'supervisor_id', as: 'supervisor' });
  }
  if (models.Internship && models.InternshipPhaseHistory) {
    models.Internship.hasMany(models.InternshipPhaseHistory, { foreignKey: 'internship_id', as: 'phaseHistory' });
    models.InternshipPhaseHistory.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.InternshipPhaseHistory && models.User) {
    models.InternshipPhaseHistory.belongsTo(models.User, { foreignKey: 'created_by', as: 'reversedBy' });
  }
  if (models.Internship && models.InternshipAssignmentLink) {
    models.Internship.hasMany(models.InternshipAssignmentLink, { foreignKey: 'internship_id', as: 'assignmentLinks' });
    models.InternshipAssignmentLink.belongsTo(models.Internship, { foreignKey: 'internship_id', as: 'internship' });
  }
  if (models.Assignment && models.InternshipAssignmentLink) {
    models.Assignment.hasMany(models.InternshipAssignmentLink, { foreignKey: 'assignment_id', as: 'internshipLinks' });
    models.InternshipAssignmentLink.belongsTo(models.Assignment, { foreignKey: 'assignment_id', as: 'assignment' });
  }

  models.sequelize = sequelize;
  return models;
}
