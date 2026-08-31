import express from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { sendReviewScheduledEmail } from '../lib/mailer.js';

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

// total_hours and final_score are computed, not entered — see the /complete
// handler. Only completion_note is actual coordinator input.
const completeSchema = z.object({
  completion_note: z.string().optional(),
});

function includeStudent(models) {
  return { model: models.User, as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] };
}

const STAFF_ROLES = ['admin', 'coordinator', 'teacher'];
function isStaff(user) {
  return Array.isArray(user?.roles) && user.roles.some((r) => STAFF_ROLES.includes(r));
}

// Execution Monitoring is coordinator-only in ILS-dev too — teachers don't get it.
function isCoordinator(user) {
  return Array.isArray(user?.roles) && (user.roles.includes('coordinator') || user.roles.includes('admin'));
}

// A student may only touch their own internship's activity logs; staff can touch any.
async function canManageInternship(models, internshipId, user) {
  if (isStaff(user)) return true;
  const internship = await models.Internship.findByPk(internshipId, { attributes: ['student_id'] });
  return Boolean(internship) && Number(internship.student_id) === Number(user.id);
}

// GET /api/internships/mine — current student's own internship record(s)
router.get('/mine', async (req, res) => {
  try {
    const {
      Internship, InternshipSupervisor, InternshipActivityLog, InternshipAssessment,
      InternshipDocument, InternshipApplication, InternshipApplicationHistory,
      InternshipReview, User,
    } = req.models;
    const internships = await Internship.findAll({
      where: { student_id: req.user.id },
      include: [
        { model: InternshipSupervisor, as: 'supervisors' },
        { model: InternshipActivityLog, as: 'activityLogs' },
        { model: InternshipAssessment, as: 'assessments' },
        { model: InternshipDocument, as: 'documents' },
        {
          model: InternshipApplication, as: 'applications',
          include: [{ model: InternshipApplicationHistory, as: 'history' }],
        },
        { model: InternshipReview, as: 'reviews', include: [{ model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] }] },
      ],
      order: [
        ['created_at', 'DESC'],
        [{ model: InternshipActivityLog, as: 'activityLogs' }, 'week_starting', 'DESC'],
      ],
    });
    res.json(internships);
  } catch (err) {
    console.error('[internships GET mine]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/internships/execution-risk — coordinator dashboard: students in
// the on_site phase with engagement/risk indicators. Must stay before /:id.
router.get('/execution-risk', async (req, res) => {
  try {
    if (!isCoordinator(req.user)) return res.status(403).json({ error: 'Coordinator access only' });

    const { campaign_id } = req.query;
    const seq = req.models.sequelize;

    const [rows] = await seq.query(`
      SELECT
        i.id, i.student_id, i.company_name, i.start_date, i.end_date,
        u.first_name, u.last_name, u.email,
        COALESCE(SUM(ial.hours_logged), 0) AS total_hours,
        COUNT(ial.id)                       AS log_count,
        MAX(ial.created_at)                 AS last_log_date,
        COUNT(DISTINCT sv.id)               AS supervisor_count,
        ic.id   AS campaign_id,
        ic.name AS campaign_name
      FROM internships i
      JOIN users u ON u.id = i.student_id
      LEFT JOIN internship_activity_logs ial ON ial.internship_id = i.id AND ial.deleted_at IS NULL
      LEFT JOIN internship_supervisors sv    ON sv.internship_id  = i.id AND sv.deleted_at IS NULL
      LEFT JOIN internship_campaigns ic      ON ic.id = i.campaign_id    AND ic.deleted_at IS NULL
      WHERE i.deleted_at IS NULL AND i.phase = 'on_site'
        AND (:campaignId IS NULL OR ic.id = :campaignId)
      GROUP BY i.id, u.id, ic.id
      ORDER BY u.last_name, u.first_name
    `, { replacements: { campaignId: campaign_id || null } });

    const now = Date.now();
    const withRisk = rows.map((r) => {
      const lastLog = r.last_log_date ? new Date(r.last_log_date) : null;
      const daysSinceLast = lastLog ? Math.floor((now - lastLog) / 86400000) : null;
      const noSupervisor = Number(r.supervisor_count) === 0;

      let risk = 'green';
      if (noSupervisor || daysSinceLast === null || daysSinceLast > 14) risk = 'red';
      else if (daysSinceLast > 7) risk = 'amber';

      return { ...r, days_since_last_log: daysSinceLast, risk };
    });

    res.json(withRisk);
  } catch (err) {
    console.error('[internships GET execution-risk]', err.message);
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
    const { Internship, InternshipSupervisor, InternshipActivityLog, InternshipAssessment, InternshipDocument, InternshipApplication, InternshipPlacementCheck, InternshipCheckDefinition, InternshipAssignmentLink, Assignment, InternshipReview, InternshipPhaseHistory, User } = req.models;
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
        { model: InternshipReview, as: 'reviews', include: [{ model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] }] },
        { model: InternshipPhaseHistory, as: 'phaseHistory', include: [{ model: User, as: 'reversedBy', attributes: ['id', 'first_name', 'last_name'] }] },
      ],
      order: [
        [{ model: InternshipPhaseHistory, as: 'phaseHistory' }, 'created_at', 'DESC'],
        [{ model: InternshipActivityLog, as: 'activityLogs' }, 'week_starting', 'DESC'],
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
    if (internship.completed_at) return res.status(400).json({ error: 'Internship is already completed.' });

    const seq = req.models.sequelize;

    // Total hours: sum of activity logs.
    const [[hoursRow]] = await seq.query(
      `SELECT COALESCE(SUM(hours_logged), 0) AS total FROM internship_activity_logs WHERE internship_id = :id AND deleted_at IS NULL`,
      { replacements: { id: internship.id } }
    );

    // Final score: average of submitted teacher + supervisor assessments, as a percentage.
    const [assessRows] = await seq.query(
      `SELECT score, max_score FROM internship_assessments
       WHERE internship_id = :id AND deleted_at IS NULL AND submitted_at IS NOT NULL
         AND assessor_role IN ('teacher', 'supervisor') AND score IS NOT NULL`,
      { replacements: { id: internship.id } }
    );
    let finalScore = null;
    if (assessRows.length > 0) {
      const pcts = assessRows.map((a) => (Number(a.score) / Number(a.max_score || 100)) * 100);
      finalScore = Math.round((pcts.reduce((s, p) => s + p, 0) / pcts.length) * 100) / 100;
    }

    await internship.update({
      completed_at: new Date(),
      total_hours: Number(hoursRow.total) || 0,
      final_score: finalScore,
      completion_note: req.body.completion_note || null,
      status: 'completed',
      phase: 'completed',
    });
    res.json(internship);
  } catch (err) {
    console.error('[internships POST complete]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internships/:id/advance-phase — manual, staff-only.
// Judgment-call transitions: placed -> on_site, on_site -> evaluating.
// (searching -> placed and -> completed happen automatically elsewhere.)
const PHASE_ADVANCE = { placed: 'on_site', on_site: 'evaluating' };

router.post('/:id/advance-phase', async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can advance an internship phase' });

    const { Internship } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    const next = PHASE_ADVANCE[internship.phase];
    if (!next) {
      return res.status(400).json({ error: `Cannot advance from phase "${internship.phase}"` });
    }
    await internship.update({ phase: next });
    res.json(internship);
  } catch (err) {
    console.error('[internships POST advance-phase]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internships/:id/reverse-phase — mirror of advance-phase, staff-only.
// An unusual, correction-only action, so it requires a reason and leaves a
// permanent record of why (internship_phase_history), same spirit as
// internship_application_history.
const PHASE_REVERSE = { on_site: 'placed', evaluating: 'on_site' };
const reversePhaseSchema = z.object({ reason: z.string().min(1).max(500) });

router.post('/:id/reverse-phase', validate(reversePhaseSchema), async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can reverse an internship phase' });

    const { Internship, InternshipPhaseHistory } = req.models;
    const internship = await Internship.findByPk(req.params.id);
    if (!internship) return res.status(404).json({ error: 'Internship not found' });

    const prev = PHASE_REVERSE[internship.phase];
    if (!prev) {
      return res.status(400).json({ error: `Cannot reverse from phase "${internship.phase}"` });
    }

    await InternshipPhaseHistory.create({
      internship_id: internship.id,
      from_phase: internship.phase,
      to_phase: prev,
      reason: req.body.reason,
      created_by: req.user.id,
    });
    await internship.update({ phase: prev });
    res.json(internship);
  } catch (err) {
    console.error('[internships POST reverse-phase]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Interim reviews (school visits during the internship) ───────────────────
// Staff schedules and completes these; a student can only view their own.
// Deliberately separate from the final teacher/supervisor assessment and
// from company_visits (which is CRM outreach to companies, not this).
const scheduleReviewSchema = z.object({
  scheduled_date: z.string().min(1),
  supervisor_id:  z.number().int().optional(),
});

const completeReviewSchema = z.object({
  report: z.string().optional(),
});

router.get('/:id/reviews', async (req, res) => {
  try {
    const { InternshipReview, User, InternshipSupervisor } = req.models;
    const reviews = await InternshipReview.findAll({
      where: { internship_id: req.params.id },
      include: [
        { model: User, as: 'reviewer', attributes: ['id', 'first_name', 'last_name'] },
        { model: InternshipSupervisor, as: 'supervisor', attributes: ['id', 'name'] },
      ],
      order: [['scheduled_date', 'DESC']],
    });
    res.json(reviews);
  } catch (err) {
    console.error('[internships GET reviews]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/reviews', validate(scheduleReviewSchema), async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can schedule an interim review' });
    const { InternshipReview, Internship, User, InternshipSupervisor } = req.models;
    const review = await InternshipReview.create({
      internship_id: req.params.id,
      scheduled_date: req.body.scheduled_date,
      supervisor_id: req.body.supervisor_id || null,
      reviewer_id: req.user.id,
    });

    // Notify both sides — each needs to confirm/decline independently.
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const internship = await Internship.findByPk(req.params.id, { include: [{ model: User, as: 'student' }] });
    if (internship?.student?.email) {
      sendReviewScheduledEmail({
        to: internship.student.email,
        studentName: `${internship.student.first_name} ${internship.student.last_name}`,
        scheduledDate: req.body.scheduled_date,
        actionUrl: `${frontendUrl}/my-internship`,
      }).catch((err) => console.error('[reviews] student email failed:', err.message));
    }
    if (review.supervisor_id) {
      const supervisor = await InternshipSupervisor.findByPk(review.supervisor_id);
      if (supervisor?.email) {
        sendReviewScheduledEmail({
          to: supervisor.email,
          studentName: internship?.student ? `${internship.student.first_name} ${internship.student.last_name}` : 'the student',
          scheduledDate: req.body.scheduled_date,
          actionUrl: `${frontendUrl}/supervisor/${supervisor.access_token}`,
        }).catch((err) => console.error('[reviews] supervisor email failed:', err.message));
      }
    }

    res.status(201).json(review);
  } catch (err) {
    console.error('[internships POST reviews]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/internships/:id/reviews/:reviewId/respond — the student confirms
// or declines their own review invitation.
const respondSchema = z.object({ response: z.enum(['confirmed', 'declined']) });

router.put('/:id/reviews/:reviewId/respond', validate(respondSchema), async (req, res) => {
  try {
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { InternshipReview } = req.models;
    const review = await InternshipReview.findOne({ where: { id: req.params.reviewId, internship_id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await review.update({ student_response: req.body.response });
    res.json(review);
  } catch (err) {
    console.error('[internships PUT reviews respond]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/reviews/:reviewId/complete', validate(completeReviewSchema), async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can complete an interim review' });
    const { InternshipReview } = req.models;
    const review = await InternshipReview.findOne({ where: { id: req.params.reviewId, internship_id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const [[hoursRow]] = await req.models.sequelize.query(
      `SELECT COALESCE(SUM(hours_logged), 0) AS total FROM internship_activity_logs WHERE internship_id = :id AND deleted_at IS NULL`,
      { replacements: { id: req.params.id } }
    );

    await review.update({
      status: 'completed',
      report: req.body.report || null,
      hours_logged_snapshot: Number(hoursRow.total) || 0,
      completed_at: new Date(),
    });
    res.json(review);
  } catch (err) {
    console.error('[internships PUT reviews complete]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id/reviews/:reviewId/cancel', async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can cancel an interim review' });
    const { InternshipReview } = req.models;
    const review = await InternshipReview.findOne({ where: { id: req.params.reviewId, internship_id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await review.update({ status: 'cancelled' });
    res.json(review);
  } catch (err) {
    console.error('[internships PUT reviews cancel]', err.message);
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

// Staff can toggle any check; a student may only toggle their own
// "student_signed" item (self-signing the placement agreement) on their own
// internship — everything else on this endpoint stays staff-only.
router.patch('/:id/placement-checklist/:checkKey', async (req, res) => {
  try {
    const staff = isStaff(req.user);
    if (!staff) {
      if (req.params.checkKey !== 'student_signed') return res.status(403).json({ error: 'Not allowed' });
      if (!(await canManageInternship(req.models, req.params.id, req.user))) return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can submit teacher/supervisor assessments' });
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

// POST /api/internships/:id/reflection — student's own self-reflection,
// stored as an assessment row with assessor_role='student' (separate from
// the teacher/supervisor bilateral assessment, which is scoring — this is
// the student's own words, no score).
const reflectionSchema = z.object({
  reflection:       z.string().optional(),
  competency_notes: z.string().optional(),
  submit:           z.boolean().optional(),
});

router.post('/:id/reflection', validate(reflectionSchema), async (req, res) => {
  try {
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { InternshipAssessment } = req.models;
    const [assessment] = await InternshipAssessment.findOrCreate({
      where: { internship_id: req.params.id, assessor_role: 'student' },
      defaults: { internship_id: req.params.id, assessor_role: 'student', assessor_user_id: req.user.id },
    });
    await assessment.update({
      reflection: req.body.reflection ?? assessment.reflection,
      competency_notes: req.body.competency_notes ?? assessment.competency_notes,
      is_completed: req.body.submit ? true : assessment.is_completed,
      submitted_at: req.body.submit ? new Date() : assessment.submitted_at,
    });
    res.status(201).json(assessment);
  } catch (err) {
    console.error('[internships POST reflection]', err.message);
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      if (req.file) fs.unlink(req.file.path, () => {});
      return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!isStaff(req.user)) return res.status(403).json({ error: 'Only staff can review documents' });
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
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
    if (!(await canManageInternship(req.models, req.params.id, req.user))) {
      return res.status(403).json({ error: 'Not allowed' });
    }
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

    // Automatic transition: an accepted application moves the internship
    // from searching to placed. Doesn't regress a placement further along.
    if (req.body.outcome === 'accepted') {
      const { Internship } = req.models;
      const internship = await Internship.findByPk(req.params.id);
      if (internship && internship.phase === 'searching') {
        await internship.update({ phase: 'placed' });
      }
    }

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
