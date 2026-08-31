import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const createAcademicYearSchema = z.object({
  start_year: z.number().int().min(2000).max(2100),
  is_current: z.boolean().optional(),
});

const campaignSchema = z.object({
  class_id:              z.number().int(),
  academic_year_id:      z.number().int(),
  campaign_type:         z.enum(['graduation', 'summer', 'optional']).optional(),
  name:                  z.string().min(1).max(255),
  coordinator_id:        z.number().int().optional(),
  search_start_date:     z.string().optional(),
  placement_target_date: z.string().optional(),
  internship_start_date: z.string().optional(),
  internship_end_date:   z.string().optional(),
  document_policy:       z.enum(['required_before_apply', 'recommended', 'disabled']).optional(),
  notes:                 z.string().optional(),
});

// GET /api/internship-campaigns/academic-years
router.get('/academic-years', async (req, res) => {
  try {
    const { AcademicYear } = req.models;
    const years = await AcademicYear.findAll({ order: [['start_date', 'ASC']] });
    res.json(years);
  } catch (err) {
    console.error('[internship-campaigns GET academic-years]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internship-campaigns/academic-years — same Sept-1..Aug-31 convention
// the initial migration seed used, so admins aren't stuck once that seed ages out.
router.post('/academic-years', validate(createAcademicYearSchema), async (req, res) => {
  try {
    if (!req.user.roles?.some((r) => ['admin', 'coordinator'].includes(r))) {
      return res.status(403).json({ error: 'Only admin/coordinator can create academic years' });
    }
    const { AcademicYear, sequelize } = req.models;
    const { start_year, is_current } = req.body;
    const label = `${start_year}-${start_year + 1}`;

    const existing = await AcademicYear.findOne({ where: { label } });
    if (existing) return res.status(409).json({ error: `Academic year ${label} already exists` });

    const year = await sequelize.transaction(async (t) => {
      if (is_current) {
        await AcademicYear.update({ is_current: false }, { where: { is_current: true }, transaction: t });
      }
      return AcademicYear.create({
        label,
        start_date: `${start_year}-09-01`,
        end_date: `${start_year + 1}-08-31`,
        is_current: !!is_current,
      }, { transaction: t });
    });
    res.status(201).json(year);
  } catch (err) {
    console.error('[internship-campaigns POST academic-years]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/internship-campaigns — admins see every programme (platform
// oversight); everyone else only sees their own, so a coach managing several
// classes isn't scrolling through every other coordinator's programmes too.
// ?all=1 lets a non-admin coordinator explicitly see the full list when they
// need to (e.g. covering for someone), without changing the default.
router.get('/', async (req, res) => {
  try {
    const { InternshipCampaign, Class, AcademicYear, User } = req.models;
    const { class_id, status, all } = req.query;
    const where = {};
    if (class_id) where.class_id = class_id;
    if (status) where.status = status;
    if (!req.user.roles?.includes('admin') && all !== '1') {
      where.coordinator_id = req.user.id;
    }
    const campaigns = await InternshipCampaign.findAll({
      where,
      include: [
        { model: Class, as: 'class' },
        { model: AcademicYear, as: 'academicYear' },
        { model: User, as: 'coordinator', attributes: ['id', 'first_name', 'last_name'] },
      ],
      order: [['created_at', 'DESC']],
    });

    // Phase-distribution stats per campaign, for the list's progress bar —
    // counts by phase (active internships only) plus a separate inactive
    // count (cancelled/withdrawn), so the list shows at a glance which
    // programmes need attention instead of just a plain status pill.
    const campaignIds = campaigns.map((c) => c.id);
    const statsByCampaign = {};
    if (campaignIds.length > 0) {
      const [rows] = await req.models.sequelize.query(
        `SELECT campaign_id,
                phase,
                (status IN ('cancelled', 'withdrawn')) AS is_inactive,
                COUNT(*) AS count
         FROM internships
         WHERE campaign_id IN (:campaignIds) AND deleted_at IS NULL
         GROUP BY campaign_id, phase, is_inactive`,
        { replacements: { campaignIds } }
      );
      for (const row of rows) {
        const stats = statsByCampaign[row.campaign_id] || {
          total: 0, searching: 0, placed: 0, on_site: 0, evaluating: 0, completed: 0, inactive: 0,
        };
        const count = Number(row.count);
        stats.total += count;
        if (row.is_inactive) stats.inactive += count;
        else if (stats[row.phase] !== undefined) stats[row.phase] += count;
        statsByCampaign[row.campaign_id] = stats;
      }
    }

    const result = campaigns.map((c) => ({
      ...c.toJSON(),
      stats: statsByCampaign[c.id] || { total: 0, searching: 0, placed: 0, on_site: 0, evaluating: 0, completed: 0, inactive: 0 },
    }));
    res.json(result);
  } catch (err) {
    console.error('[internship-campaigns GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/internship-campaigns/:id
router.get('/:id', async (req, res) => {
  try {
    const { InternshipCampaign, Class, AcademicYear, User, Internship } = req.models;
    const campaign = await InternshipCampaign.findByPk(req.params.id, {
      include: [
        { model: Class, as: 'class' },
        { model: AcademicYear, as: 'academicYear' },
        { model: User, as: 'coordinator', attributes: ['id', 'first_name', 'last_name'] },
        { model: Internship, as: 'studentRecords', include: [{ model: User, as: 'student', attributes: ['id', 'first_name', 'last_name', 'email'] }] },
      ],
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json(campaign);
  } catch (err) {
    console.error('[internship-campaigns GET :id]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internship-campaigns
router.post('/', validate(campaignSchema), async (req, res) => {
  try {
    const { InternshipCampaign } = req.models;
    const campaign = await InternshipCampaign.create({ ...req.body, coordinator_id: req.body.coordinator_id || req.user.id });
    res.status(201).json(campaign);
  } catch (err) {
    console.error('[internship-campaigns POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/internship-campaigns/:id — admin, or the coordinator who owns
// this programme (same rule the GET list uses to scope visibility).
router.put('/:id', validate(campaignSchema.partial()), async (req, res) => {
  try {
    const { InternshipCampaign } = req.models;
    const campaign = await InternshipCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const isAdmin = req.user.roles?.includes('admin');
    const isOwner = String(campaign.coordinator_id) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only an admin or this programme\'s coordinator can edit it' });
    }
    await campaign.update(req.body);
    res.json(campaign);
  } catch (err) {
    console.error('[internship-campaigns PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/internship-campaigns/:id
router.delete('/:id', async (req, res) => {
  try {
    const { InternshipCampaign } = req.models;
    const campaign = await InternshipCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    const isAdmin = req.user.roles?.includes('admin');
    const isOwner = String(campaign.coordinator_id) === String(req.user.id);
    if (!isAdmin && !isOwner) {
      return res.status(403).json({ error: 'Only an admin or this programme\'s coordinator can delete it' });
    }
    await campaign.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[internship-campaigns DELETE]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/internship-campaigns/:id/enroll — create internship records for given student_ids
router.post('/:id/enroll', async (req, res) => {
  try {
    const { InternshipCampaign, Internship } = req.models;
    const campaign = await InternshipCampaign.findByPk(req.params.id);
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });

    const studentIds = Array.isArray(req.body.student_ids) ? req.body.student_ids : [];
    if (!studentIds.length) return res.status(400).json({ error: 'student_ids array is required' });

    const created = [];
    for (const student_id of studentIds) {
      const [record] = await Internship.findOrCreate({
        where: { student_id, campaign_id: campaign.id },
        defaults: { student_id, campaign_id: campaign.id, class_id: campaign.class_id, status: 'active' },
      });
      created.push(record);
    }
    res.status(201).json(created);
  } catch (err) {
    console.error('[internship-campaigns POST enroll]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
