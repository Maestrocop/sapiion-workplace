import express from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';

const router = express.Router();

// Deliberately minimal — see CLAUDE.md scope boundaries. No grading/rubric fields.
const assignmentSchema = z.object({
  title:           z.string().min(1).max(500),
  points_possible: z.number().nonnegative().optional(),
  discipline:      z.string().max(255).optional(),
  due_date:        z.string().optional(),
  status:          z.enum(['draft', 'published', 'archived']).optional(),
});

router.get('/', async (req, res) => {
  try {
    const { Assignment } = req.models;
    const assignments = await Assignment.findAll({ order: [['title', 'ASC']] });
    res.json(assignments);
  } catch (err) {
    console.error('[assignments GET]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', validate(assignmentSchema), async (req, res) => {
  try {
    const { Assignment } = req.models;
    const assignment = await Assignment.create(req.body);
    res.status(201).json(assignment);
  } catch (err) {
    console.error('[assignments POST]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', validate(assignmentSchema.partial()), async (req, res) => {
  try {
    const { Assignment } = req.models;
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    await assignment.update(req.body);
    res.json(assignment);
  } catch (err) {
    console.error('[assignments PUT]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { Assignment } = req.models;
    const assignment = await Assignment.findByPk(req.params.id);
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    await assignment.destroy();
    res.json({ ok: true });
  } catch (err) {
    console.error('[assignments DELETE]', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
