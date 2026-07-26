import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, '..', 'uploads', 'internship-documents');
fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ dest: uploadDir, limits: { fileSize: 20 * 1024 * 1024 } });

const internshipSchema = z.object({
  student_id:       z.number().int(),
  campaign_id:      z.number().int().optional(),
  title:            z.string().max(500).optional(),
  company_name:     z.string().max(500).optional(),
  company_address:  z.string().optional(),
  company_sector:   z.string().max(100).optional(),
  start_date:       z.string().optional(),
  end_date:         z.string().optional(),
  working_schedule: z.string().optional(),
});

const completeSchema = z.object({
  total_hours:     z.number().nonnegative().optional(),
  final_score:     z.number().min(0).max(100).optional(),
  completion_note: z.string().optional(),
});

function includeStudent(models) {
  return { model: models.User, as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] };
}

// GET /api/internships/mine — current student's own internship record(s)
router.get('/mine', async (req, res) => {
  try {
    const { Internship, InternshipSupervisor, InternshipActivityLog, InternshipAssessment } = req.models;
    const internships = await Internship.findAll({
      where: { student_id: req.user.id },
      include: [
        { model: InternshipSupervisor, as: 'supervisors' },
        { model: InternshipActivityLog, as: 'activityLogs' },
        { model: InternshipAssessment, as: 'assessments' },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(internships);
  } catch (err) {
    console.error('[internships GET mine]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/internships?campaign_id=&status=
router.get('/', async (req, res) => {
  try {
    const { Internship } = req.models;
    const { campaign_id, status } = req.query;
    const where = {};
    if (campaign_id) where.campaign_id = campaign_id;
    if (status) where.status = status;
    const internships = await Internship.findAll({ where, include: [includeStudent(req.models)], order: [['created_at', 'DESC']] });
    res.json(internships);
  } catch (err) {
    console.error('[internships GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internships
router.post('/', validate(internshipSchema), async (req, res) => {
  try {
    const { Internship } = req.models;
    const internship = await Internship.create(req.body);
    res.status(201).json(internship);
  } catch (err) {
    console.error('[internships POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/internships/:id
router.get('/:id', async (req, res) => {
  try {
    const { Internship, InternshipSupervisor, InternshipActivityLog, InternshipAssessment, InternshipDocument, InternshipApplication, InternshipPlacementCheck, InternshipCheckDefinition, InternshipAssignmentLink, Assignment } = req.models;
    const internship = await Internship.findByPk(req.params.id, {
      include: [
        includeStudent(req.models),
        { model: InternshipSupervisor, as: 'supervisors' },
        { model: InternshipActivityLog, as: 'activityLogs' },
        { model: InternshipAssessment, as: 'assessments' },
        { model: InternshipDocument, as: 'documents' },
        { model: InternshipApplication, as: 'applications' },
        { model: InternshipPlacementCheck, as: 'placementChecks', include: [{ model: InternshipCheckDefinition, as: 'definition' }] },
        { model: InternshipAssignmentLink, as: 'assignmentLinks', include: [{ model: Assignment, as: 'assignment' }] },
      ],
    });
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    res.json(internship);
  } catch (err) {
    console.error('[internships GET :id]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/internships/:id
router.put('/:id', validate(internshipSchema.partial()), async (req, res) => {
  try {
    const { Internship } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    await internship.update(req.body);
    res.json(internship);
  } catch (err) {
    console.error('[internships PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/internships/:id
router.delete('/:id', async (req, res) => {
  try {
    const { Internship } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    await internship.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[internships DELETE]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internships/:id/complete
router.post('/:id/complete', validate(completeSchema), async (req, res) => {
  try {
    const { Internship } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });
    await internship.update({ ...req.body, status: 'completed', completed_at: new Date() });
    res.json(internship);
  } catch (err) {
    console.error('[internships POST complete]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Placement checklist ───────────────────────────────────────────────────────
router.get('/:id/placement-checklist', async (req, res) => {
  try {
    const { InternshipCheckDefinition, InternshipPlacementCheck } = req.models;
    const definitions = await InternshipCheckDefinition.findAll({ where: { is_active: true }, order: [['sort_order', 'ASC']] });
    const checks = await InternshipPlacementCheck.findAll({ where: { internship_id: req.params.id } });
    const byDefId = Object.fromEntries(checks.map(c => [String(c.definition_id), c]));
    res.json(definitions.map(def => ({ definition: def, check: byDefId[String(def.id)] || null })));
  } catch (err) {
    console.error('[internships GET checklist]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id/placement-checklist/:checkKey', async (req, res) => {
  try {
    const { InternshipCheckDefinition, InternshipPlacementCheck } = req.models;
    const definition = await InternshipCheckDefinition.findOne({ where: { check_key: req.params.checkKey } });
    if (!definition) return res.status(404).json({ error: 'Unknown check' });
    const is_completed = Boolean(req.body.is_completed);
    const [check] = await InternshipPlacementCheck.findOrCreate({
      where: { internship_id: req.params.id, definition_id: definition.id },
      defaults: { internship_id: req.params.id, definition_id: definition.id },
    });
    await check.update({
      is_completed,
      completed_by: is_completed ? req.user.id : null,
      completed_at: is_completed ? new Date() : null,
      notes: req.body.notes ?? check.notes,
    });
    res.json(check);
  } catch (err) {
    console.error('[internships PATCH checklist]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Supervisors (token-based external access) ────────────────────────────────
const supervisorSchema = z.object({
  name:      z.string().min(1).max(255),
  email:     z.string().email().optional().or(z.literal('')),
  phone:     z.string().max(50).optional(),
  job_title: z.string().max(255).optional(),
});

router.post('/:id/supervisors', validate(supervisorSchema), async (req, res) => {
  try {
    const { Internship, InternshipSupervisor } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    const access_token = crypto.randomBytes(24).toString('hex');
    const expiryBase = internship.end_date ? new Date(internship.end_date) : new Date();
    const token_expires_at = new Date(expiryBase.getTime() + 30 * 24 * 60 * 60 * 1000);

    const supervisor = await InternshipSupervisor.create({ ...req.body, internship_id: internship.id, access_token, token_expires_at });
    res.status(201).json(supervisor);
  } catch (err) {
    console.error('[internships POST supervisors]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/supervisors/:supId/regenerate-token', async (req, res) => {
  try {
    const { InternshipSupervisor } = req.models;
    const supervisor = await InternshipSupervisor.findOne({ where: { id: req.params.supId, internship_id: req.params.id } });
    if (!supervisor) return res.status(404).json({ error: 'Supervisor not found' });
    const access_token = crypto.randomBytes(24).toString('hex');
    const token_expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await supervisor.update({ access_token, token_expires_at });
    res.json(supervisor);
  } catch (err) {
    console.error('[internships POST regenerate-token]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Activity logs ─────────────────────────────────────────────────────────────
const activityLogSchema = z.object({
  title:         z.string().max(200).optional(),
  week_starting: z.string().optional(),
  hours_logged:  z.number().nonnegative().optional(),
  content:       z.string().min(1),
});

router.get('/:id/activity-logs', async (req, res) => {
  try {
    const { InternshipActivityLog } = req.models;
    const logs = await InternshipActivityLog.findAll({ where: { internship_id: req.params.id }, order: [['week_starting', 'DESC']] });
    res.json(logs);
  } catch (err) {
    console.error('[internships GET activity-logs]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/activity-logs', validate(activityLogSchema), async (req, res) => {
  try {
    const { InternshipActivityLog } = req.models;
    const log = await InternshipActivityLog.create({ ...req.body, internship_id: req.params.id, created_by: req.user.id });
    res.status(201).json(log);
  } catch (err) {
    console.error('[internships POST activity-logs]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/activity-logs/:logId', validate(activityLogSchema.partial()), async (req, res) => {
  try {
    const { InternshipActivityLog } = req.models;
    const log = await InternshipActivityLog.findOne({ where: { id: req.params.logId, internship_id: req.params.id } });
    if (!log) return res.status(404).json({ error: 'Activity log not found' });
    await log.update(req.body);
    res.json(log);
  } catch (err) {
    console.error('[internships PUT activity-logs]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/activity-logs/:logId', async (req, res) => {
  try {
    const { InternshipActivityLog } = req.models;
    const log = await InternshipActivityLog.findOne({ where: { id: req.params.logId, internship_id: req.params.id } });
    if (!log) return res.status(404).json({ error: 'Activity log not found' });
    await log.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[internships DELETE activity-logs]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Assessments (bilateral: teacher + supervisor) ─────────────────────────────
const assessmentSchema = z.object({
  assessor_role:    z.enum(['teacher', 'supervisor']),
  score:            z.number().min(0).max(1000).optional(),
  max_score:        z.number().positive().optional(),
  feedback:         z.string().optional(),
  reflection:       z.string().optional(),
  competency_notes: z.string().optional(),
  is_completed:     z.boolean().optional(),
});

router.get('/:id/assessments', async (req, res) => {
  try {
    const { InternshipAssessment, User } = req.models;
    const assessments = await InternshipAssessment.findAll({
      where: { internship_id: req.params.id },
      include: [{ model: User, as: 'assessor', attributes: ['id', 'first_name', 'last_name'] }],
    });
    res.json(assessments);
  } catch (err) {
    console.error('[internships GET assessments]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/assessments', validate(assessmentSchema), async (req, res) => {
  try {
    const { InternshipAssessment } = req.models;
    const [assessment] = await InternshipAssessment.findOrCreate({
      where: { internship_id: req.params.id, assessor_role: req.body.assessor_role },
      defaults: { internship_id: req.params.id, assessor_role: req.body.assessor_role, assessor_user_id: req.user.id },
    });
    const isCompleted = req.body.is_completed;
    await assessment.update({
      ...req.body,
      assessor_user_id: assessment.assessor_user_id || req.user.id,
      submitted_at: isCompleted ? new Date() : assessment.submitted_at,
    });
    res.status(201).json(assessment);
  } catch (err) {
    console.error('[internships POST assessments]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Documents ──────────────────────────────────────────────────────────────────
router.get('/:id/documents', async (req, res) => {
  try {
    const { InternshipDocument } = req.models;
    const docs = await InternshipDocument.findAll({ where: { internship_id: req.params.id }, order: [['created_at', 'DESC']] });
    res.json(docs);
  } catch (err) {
    console.error('[internships GET documents]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/documents', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { InternshipDocument } = req.models;
    const { doc_type } = req.body;
    if (!['cv', 'motivation_letter', 'other'].includes(doc_type)) {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: 'doc_type must be cv, motivation_letter, or other' });
    }
    const existingCount = await InternshipDocument.count({ where: { internship_id: req.params.id, doc_type } });
    const doc = await InternshipDocument.create({
      internship_id: req.params.id,
      doc_type,
      version: existingCount + 1,
      original_name: req.file.originalname,
      file_path: req.file.path,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      uploaded_by: req.user.id,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error('[internships POST documents]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/documents/:docId/download', async (req, res) => {
  try {
    const { InternshipDocument } = req.models;
    const doc = await InternshipDocument.findOne({ where: { id: req.params.docId, internship_id: req.params.id } });
    if (!doc || !fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'Document not found' });
    res.download(doc.file_path, doc.original_name);
  } catch (err) {
    console.error('[internships GET download]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/documents/:docId/review', async (req, res) => {
  try {
    const { InternshipDocument } = req.models;
    const doc = await InternshipDocument.findOne({ where: { id: req.params.docId, internship_id: req.params.id } });
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    const { status, coach_feedback } = req.body;
    if (!['submitted', 'under_review', 'approved', 'needs_revision'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    await doc.update({ status, coach_feedback, reviewed_by: req.user.id, reviewed_at: new Date() });
    res.json(doc);
  } catch (err) {
    console.error('[internships PUT documents review]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Applications ───────────────────────────────────────────────────────────────
const applicationSchema = z.object({
  company_name:         z.string().min(1).max(500),
  company_email:        z.string().email().optional().or(z.literal('')),
  company_website:      z.string().max(500).optional(),
  company_contact_name: z.string().max(255).optional(),
  company_address:      z.string().optional(),
  company_city:         z.string().max(100).optional(),
  company_postal_code:  z.string().max(20).optional(),
  company_country:      z.string().max(100).optional(),
  cv_document_id:       z.number().int().optional(),
  letter_document_id:   z.number().int().optional(),
  notes:                z.string().optional(),
});

const applicationUpdateSchema = z.object({
  outcome:        z.enum(['pending', 'no_reply', 'interview_scheduled', 'rejected', 'accepted']),
  interview_date: z.string().optional(),
  notes:          z.string().optional(),
});

router.get('/:id/applications', async (req, res) => {
  try {
    const { InternshipApplication, InternshipApplicationHistory } = req.models;
    const applications = await InternshipApplication.findAll({
      where: { internship_id: req.params.id },
      include: [{ model: InternshipApplicationHistory, as: 'history' }],
      order: [['created_at', 'DESC']],
    });
    res.json(applications);
  } catch (err) {
    console.error('[internships GET applications]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/applications', validate(applicationSchema), async (req, res) => {
  try {
    const { InternshipApplication } = req.models;
    const application = await InternshipApplication.create({ ...req.body, internship_id: req.params.id });
    res.status(201).json(application);
  } catch (err) {
    console.error('[internships POST applications]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/applications/:appId', validate(applicationUpdateSchema), async (req, res) => {
  try {
    const { InternshipApplication, InternshipApplicationHistory } = req.models;
    const application = await InternshipApplication.findOne({ where: { id: req.params.appId, internship_id: req.params.id } });
    if (!application) return res.status(404).json({ error: 'Application not found' });

    await InternshipApplicationHistory.create({
      application_id: application.id,
      outcome: req.body.outcome,
      interview_date: req.body.interview_date || null,
      notes: req.body.notes || null,
      created_by: req.user.id,
    });
    await application.update(req.body);
    res.json(application);
  } catch (err) {
    console.error('[internships PUT applications]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Assignment links (plain deliverables — see CLAUDE.md scope boundaries) ────
router.get('/:id/assignments', async (req, res) => {
  try {
    const { InternshipAssignmentLink, Assignment } = req.models;
    const links = await InternshipAssignmentLink.findAll({
      where: { internship_id: req.params.id },
      include: [{ model: Assignment, as: 'assignment' }],
      order: [['display_order', 'ASC']],
    });
    res.json(links);
  } catch (err) {
    console.error('[internships GET assignments]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/assignments', async (req, res) => {
  try {
    const { InternshipAssignmentLink } = req.models;
    const { assignment_id, due_date_override, display_order } = req.body;
    if (!assignment_id) return res.status(400).json({ error: 'assignment_id is required' });
    const link = await InternshipAssignmentLink.create({
      internship_id: req.params.id, assignment_id, due_date_override, display_order: display_order || 0,
    });
    res.status(201).json(link);
  } catch (err) {
    console.error('[internships POST assignments]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/assignments/:linkId', async (req, res) => {
  try {
    const { InternshipAssignmentLink } = req.models;
    const link = await InternshipAssignmentLink.findOne({ where: { id: req.params.linkId, internship_id: req.params.id } });
    if (!link) return res.status(404).json({ error: 'Link not found' });
    await link.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[internships DELETE assignments]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
