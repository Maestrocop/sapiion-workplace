import express from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { validate } from '../middleware/validate.js';

const router = express.Router();

const companySchema = z.object({
  name:         z.string().min(1).max(255),
  address:      z.string().max(1000).optional(),
  city:         z.string().max(100).optional(),
  postal_code:  z.string().max(20).optional(),
  country:      z.string().max(100).optional(),
  website:      z.string().max(500).optional(),
  phone:        z.string().max(50).optional(),
  email:        z.string().email().optional().or(z.literal('')),
  sector:       z.string().max(100).optional(),
  company_size: z.enum(['micro', 'small', 'medium', 'large']).optional(),
  notes:        z.string().optional(),
}).partial({ name: false });

const visitSchema = z.object({
  visit_date: z.string().min(1),
  visit_type: z.string().max(20).optional(),
  notes:      z.string().optional(),
});

// GET /api/companies?search=&partnership_status=
router.get('/', async (req, res) => {
  try {
    const { Company } = req.models;
    const { search, partnership_status } = req.query;
    const where = {};
    if (partnership_status) where.partnership_status = partnership_status;
    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }
    const companies = await Company.findAll({ where, order: [['name', 'ASC']] });
    res.json(companies);
  } catch (err) {
    console.error('[companies GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/companies/:id
router.get('/:id', async (req, res) => {
  try {
    const { Company, CompanyVisit, User } = req.models;
    const company = await Company.findByPk(req.params.id, {
      include: [{ model: CompanyVisit, as: 'visits', include: [{ model: User, as: 'visitor', attributes: ['id', 'first_name', 'last_name'] }] }],
    });
    if (!company) return res.status(404).json({ error: 'Company not found' });
    res.json(company);
  } catch (err) {
    console.error('[companies GET :id]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies
router.post('/', validate(companySchema), async (req, res) => {
  try {
    const { Company } = req.models;
    const company = await Company.create({ ...req.body, source_type: 'manual_import' });
    res.status(201).json(company);
  } catch (err) {
    console.error('[companies POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/companies/:id
router.put('/:id', validate(companySchema.partial()), async (req, res) => {
  try {
    const { Company } = req.models;
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    await company.update(req.body);
    res.json(company);
  } catch (err) {
    console.error('[companies PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/companies/:id/flag
router.patch('/:id/flag', async (req, res) => {
  try {
    const { Company } = req.models;
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const { is_flagged, flag_reason } = req.body;
    await company.update({ is_flagged: Boolean(is_flagged), flag_reason: flag_reason || null });
    res.json(company);
  } catch (err) {
    console.error('[companies PATCH flag]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/companies/:id/visits
router.post('/:id/visits', validate(visitSchema), async (req, res) => {
  try {
    const { Company, CompanyVisit } = req.models;
    const company = await Company.findByPk(req.params.id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    const visit = await CompanyVisit.create({ ...req.body, company_id: company.id, visited_by: req.user.id });
    await company.update({ last_contact_date: req.body.visit_date });
    res.status(201).json(visit);
  } catch (err) {
    console.error('[companies POST visits]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/companies/:id/visits/:visitId
router.delete('/:id/visits/:visitId', async (req, res) => {
  try {
    const { CompanyVisit } = req.models;
    const visit = await CompanyVisit.findOne({ where: { id: req.params.visitId, company_id: req.params.id } });
    if (!visit) return res.status(404).json({ error: 'Visit not found' });
    await visit.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[companies DELETE visits]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
