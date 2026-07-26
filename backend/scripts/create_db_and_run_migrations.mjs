import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

const conn = process.env.DATABASE_URL;
if (!conn) {
  console.error('DATABASE_URL is required. No script may hardcode a DB name.');
  process.exit(2);
}

const client = new Client({ connectionString: conn });
await client.connect();
await client.query('SET search_path TO public;');
console.log('Connected to DB.');

await client.query(`
  CREATE TABLE IF NOT EXISTS migrations_log (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    filename TEXT NOT NULL UNIQUE,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`);

const { rows: applied } = await client.query('SELECT filename FROM migrations_log');
const appliedSet = new Set(applied.map(r => r.filename));

const allFiles = fs.readdirSync(migrationsDir)
  .filter(f => /^\d{4}_/.test(f) && f.endsWith('.sql'))
  .sort();

const pending = allFiles.filter(f => !appliedSet.has(f));
console.log(`Found ${allFiles.length} migration files, ${pending.length} pending.`);

for (const file of pending) {
  const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL search_path TO public;');
    await client.query(sql);
    await client.query('INSERT INTO migrations_log (filename) VALUES ($1)', [file]);
    await client.query('COMMIT');
    console.log(`✓ ${file}`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error(`✗ ${file}: ${err.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('\nDone. All migrations applied.');
