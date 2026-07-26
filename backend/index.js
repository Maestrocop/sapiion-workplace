import express from 'express';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import healthRouter from './routes/health.js';

dotenv.config({ path: '.env' });

const DATABASE_URL = process.env.DATABASE_URL || '';
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set in backend/.env');
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET || '';
if (!JWT_SECRET) {
  console.error('JWT_SECRET not set in backend/.env');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'sapiion-workplace-dev-secret-change-in-production') {
  console.error('FATAL: JWT_SECRET is still the default dev value. Set a strong random secret before running in production.');
  process.exit(1);
}

const sequelize = new Sequelize(DATABASE_URL, { logging: false });

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Sequelize connected to DB');

    const app = express();
    app.set('trust proxy', 1);
    app.use(helmet());
    app.use(express.json());

    // BigInt-safe JSON serializer: convert BigInt to string to avoid JSON.stringify errors in Node
    app.use((req, res, next) => {
      const origJson = res.json.bind(res);
      res.json = (body) => {
        const replacer = (k, v) => (typeof v === 'bigint' ? v.toString() : v);
        try {
          const text = JSON.stringify(body, replacer);
          res.setHeader('Content-Type', 'application/json');
          return res.send(text);
        } catch (err) {
          return origJson(body);
        }
      };
      next();
    });

    const corsOrigin = process.env.CORS_ORIGIN || '*';
    if (process.env.NODE_ENV === 'production' && corsOrigin === '*') {
      console.error('FATAL: CORS_ORIGIN is not set. Set it to your frontend URL before running in production.');
      process.exit(1);
    }
    app.use((req, res, next) => {
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      if (req.method === 'OPTIONS') return res.sendStatus(204);
      next();
    });

    app.use('/api/health', healthRouter);

    // Additional routers are mounted here as later phases add them
    // (auth, companies, students, internships, campaigns, applications,
    // activity logs, assessments, documents, supervisor portal).

    const port = process.env.PORT || 4100;
    const server = app.listen(port, () => console.log(`Backend listening on http://localhost:${port}`));
    const shutdown = () => server.close(() => process.exit(0));
    process.on('SIGTERM', shutdown);
    process.on('SIGINT',  shutdown);
  } catch (err) {
    console.error('Failed to start backend:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
    process.exit(1);
  }
}

start();
