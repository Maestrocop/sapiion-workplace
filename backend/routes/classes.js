import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Deliberately minimal — see CLAUDE.md: no institution/campus/course
// hierarchy like ILS-dev's classes table has. Just a name + code grouping
// (cohort) for internship campaigns to attach to.
const classSchema = z.object({
  name: z.string().min(1).max(255),
  code: z.string().max(100).optional(),
});

router.get('/', async (req, res) => {
  try {
    const { Class } = req.models;
    const classes = await Class.findAll({ order: [['name', 'ASC']] });
    res.json(classes);
  } catch (err) {
    console.error('[classes GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(classSchema), async (req, res) => {
  try {
    if (!req.user.roles?.some((r) => ['admin', 'coordinator'].includes(r))) {
      return res.status(403).json({ error: 'Only admin/coordinator can create classes' });
    }
    const { Class } = req.models;
    const klass = await Class.create(req.body);
    res.status(201).json(klass);
  } catch (err) {
    console.error('[classes POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
