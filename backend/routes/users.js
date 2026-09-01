import express from 'express';
import { z } from 'zod';
import { Op } from 'sequelize';
import { validate } from '../middleware/validate.js';
import { hashPassword, strongPasswordRule } from '../lib/auth.js';

const router = express.Router();

const createUserSchema = z.object({
  email:            z.string().email(),
  password:         strongPasswordRule,
  first_name:       z.string().min(1).max(100),
  last_name:        z.string().min(1).max(100),
  roles:            z.array(z.enum(['admin', 'coordinator', 'teacher', 'student'])).min(1),
  class_id:         z.number().int().nullable().optional(),
  academic_year_id: z.number().int().nullable().optional(),
});

const updateUserSchema = z.object({
  first_name:       z.string().min(1).max(100).optional(),
  last_name:        z.string().min(1).max(100).optional(),
  roles:            z.array(z.enum(['admin', 'coordinator', 'teacher', 'student'])).optional(),
  is_active:        z.boolean().optional(),
  class_id:         z.number().int().nullable().optional(),
  academic_year_id: z.number().int().nullable().optional(),
  password:         strongPasswordRule.optional(),
});

// GET /api/users?role=student
router.get('/', async (req, res) => {
  try {
    const { User, Class, AcademicYear } = req.models;
    const where = {};
    if (req.query.role) where.roles = { [Op.contains]: [req.query.role] };
    const users = await User.findAll({
      where,
      attributes: ['id', 'email', 'first_name', 'last_name', 'roles', 'is_active', 'class_id', 'academic_year_id', 'created_at'],
      include: [
        { model: Class, as: 'enrolledClass', attributes: ['id', 'name', 'code'] },
        { model: AcademicYear, as: 'cohort', attributes: ['id', 'label', 'is_current'] },
      ],
      order: [['last_name', 'ASC']],
    });
    res.json(users);
  } catch (err) {
    console.error('[users GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/users — admin creates a student/teacher/coordinator account (no self-registration)
router.post('/', validate(createUserSchema), async (req, res) => {
  try {
    if (!req.user.roles?.includes('admin')) return res.status(403).json({ error: 'Only an admin can create users' });
    const { User } = req.models;
    const { email, password, first_name, last_name, roles, class_id, academic_year_id } = req.body;
    const existing = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists' });

    const password_hash = await hashPassword(password);
    const user = await User.create({
      email: email.toLowerCase().trim(), password_hash, first_name, last_name, roles,
      class_id: class_id || null,
      academic_year_id: academic_year_id || null,
    });
    res.status(201).json({
      id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name,
      roles: user.roles, class_id: user.class_id, academic_year_id: user.academic_year_id,
    });
  } catch (err) {
    console.error('[users POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/users/:id
router.put('/:id', validate(updateUserSchema), async (req, res) => {
  try {
    if (!req.user.roles?.includes('admin') && req.user.id !== Number(req.params.id)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const { User } = req.models;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    const updates = { ...req.body };
    if (!req.user.roles?.includes('admin')) {
      delete updates.roles; delete updates.is_active; delete updates.class_id; delete updates.academic_year_id;
    }
    if (updates.password) {
      updates.password_hash = await hashPassword(updates.password);
      updates.failed_login_attempts = 0;
      updates.locked_until = null;
      delete updates.password;
    }
    await user.update(updates);
    res.json({
      id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name,
      roles: user.roles, is_active: user.is_active, class_id: user.class_id, academic_year_id: user.academic_year_id,
    });
  } catch (err) {
    console.error('[users PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/users/:id — admin only, soft-delete (paranoid model — sets
// deleted_at, excluded from all default finds, not a hard row wipe).
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user.roles?.includes('admin')) return res.status(403).json({ error: 'Only an admin can delete users' });
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ error: 'You cannot delete your own account while signed in as it' });
    }
    const { User } = req.models;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await user.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[users DELETE]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
