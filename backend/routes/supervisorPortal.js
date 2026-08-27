/**
 * Public supervisor portal — no authentication required.
 * Access is controlled by a unique, scoped, expiring token (no user account).
 * Friction kills adoption: supervisors will not create accounts.
 */
import express from 'express';
const router = express.Router();

async function loadSupervisor(models, token) {
  return models.InternshipSupervisor.findOne({ where: { access_token: token } });
}

// GET /api/supervisor-portal/:token — load internship context
router.get('/:token', async (req, res) => {
  try {
    const models = req.models;
    const supervisor = await loadSupervisor(models, req.params.token);
    if (!supervisor) return res.status(404).json({ error: 'Invalid or expired invitation link.' });
    if (supervisor.token_expires_at && new Date(supervisor.token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invitation link has expired. Please contact the school.' });
    }

    const internship = await models.Internship.findByPk(supervisor.internship_id, {
      include: [{ model: models.User, as: 'student', attributes: ['id', 'first_name', 'last_name'] }],
    });
    if (!internship) return res.status(404).json({ error: 'Internship not found.' });

    const logs = await models.InternshipActivityLog.findAll({
      where: { internship_id: internship.id },
      order: [['week_starting', 'DESC']],
    });

    const [assignments] = await models.sequelize.query(
      `SELECT ia.id, ia.due_date_override, a.title, a.points_possible, a.discipline
       FROM internship_assignments ia
       JOIN assignments a ON a.id = ia.assignment_id
       WHERE ia.internship_id = :id AND ia.deleted_at IS NULL
       ORDER BY ia.display_order, ia.created_at`,
      { replacements: { id: internship.id } }
    );

    // Reviews this supervisor is involved in (not every review on the
    // internship — only ones where they were named as attending).
    const reviews = await models.InternshipReview.findAll({
      where: { internship_id: internship.id, supervisor_id: supervisor.id },
      order: [['scheduled_date', 'DESC']],
    });

    res.json({
      supervisor: {
        id: supervisor.id, name: supervisor.name, email: supervisor.email,
        phone: supervisor.phone, job_title: supervisor.job_title,
      },
      internship: {
        id: internship.id,
        company_name: internship.company_name,
        company_address: internship.company_address,
        start_date: internship.start_date,
        end_date: internship.end_date,
        working_schedule: internship.working_schedule,
        student_name: internship.student ? `${internship.student.first_name} ${internship.student.last_name}` : null,
      },
      logs,
      assignments,
      reviews,
    });
  } catch (err) {
    console.error('[supervisor-portal GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/supervisor-portal/:token — supervisor submits their details + setup info
router.put('/:token', async (req, res) => {
  try {
    const models = req.models;
    const supervisor = await loadSupervisor(models, req.params.token);
    if (!supervisor) return res.status(404).json({ error: 'Invalid or expired invitation link.' });
    if (supervisor.token_expires_at && new Date(supervisor.token_expires_at) < new Date()) {
      return res.status(410).json({ error: 'This invitation link has expired.' });
    }

    const { name, email, phone, job_title, start_date, end_date, working_schedule } = req.body;
    await supervisor.update({
      name: name || supervisor.name, email, phone, job_title,
    });

    const internship = await models.Internship.findByPk(supervisor.internship_id);
    if (!internship) return res.status(404).json({ error: 'Internship not found.' });

    await internship.update({
      start_date: start_date || internship.start_date,
      end_date: end_date || internship.end_date,
      working_schedule: working_schedule || internship.working_schedule,
    });

    const checksToComplete = ['company_supervisor_assigned', 'start_date_defined', 'end_date_defined', 'company_signed'];
    if (working_schedule) checksToComplete.push('working_schedule_defined');

    for (const checkKey of checksToComplete) {
      const definition = await models.InternshipCheckDefinition.findOne({ where: { check_key: checkKey } });
      if (!definition) continue;
      const [check] = await models.InternshipPlacementCheck.findOrCreate({
        where: { internship_id: internship.id, definition_id: definition.id },
        defaults: { internship_id: internship.id, definition_id: definition.id },
      });
      await check.update({
        is_completed: true, completed_at: new Date(),
        notes: 'Completed by company supervisor via invitation link',
      });
    }

    res.json({ success: true, message: 'Thank you! Your details have been saved. The school will review and be in touch.' });
  } catch (err) {
    console.error('[supervisor-portal PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/supervisor-portal/:token/logs/:logId — supervisor acknowledges a log
router.patch('/:token/logs/:logId', async (req, res) => {
  try {
    const models = req.models;
    const supervisor = await loadSupervisor(models, req.params.token);
    if (!supervisor) return res.status(404).json({ error: 'Invalid or expired invitation link.' });

    const log = await models.InternshipActivityLog.findOne({
      where: { id: req.params.logId, internship_id: supervisor.internship_id },
    });
    if (!log) return res.status(404).json({ error: 'Log not found.' });

    await log.update({ supervisor_ack: true, supervisor_comment: req.body.supervisor_comment || null });
    res.json({ success: true });
  } catch (err) {
    console.error('[supervisor-portal PATCH logs]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/supervisor-portal/:token/reviews/:reviewId/respond — supervisor
// confirms or declines their own review invitation.
router.put('/:token/reviews/:reviewId/respond', async (req, res) => {
  try {
    const models = req.models;
    const supervisor = await loadSupervisor(models, req.params.token);
    if (!supervisor) return res.status(404).json({ error: 'Invalid or expired invitation link.' });

    const response = req.body.response;
    if (!['confirmed', 'declined'].includes(response)) {
      return res.status(400).json({ error: 'response must be confirmed or declined' });
    }

    const review = await models.InternshipReview.findOne({
      where: { id: req.params.reviewId, supervisor_id: supervisor.id },
    });
    if (!review) return res.status(404).json({ error: 'Review not found.' });

    await review.update({ supervisor_response: response });
    res.json({ success: true });
  } catch (err) {
    console.error('[supervisor-portal PUT reviews respond]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
