import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ ok: true, service: 'sapiion-workplace-backend' });
});

export default router;
