const fs = require('fs');
const { Client } = require('pg');

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node apply_migration.cjs <sql-file>');
    process.exit(2);
  }
  const sql = fs.readFileSync(file, 'utf8');
  const conn = process.env.DATABASE_URL;
  if (!conn) {
    console.error('DATABASE_URL is required. No script is allowed to hardcode DB names.');
    process.exit(2);
  }
  const client = new Client({ connectionString: conn });
  try {
    await client.connect();
    console.log('Connected to DB, executing migration:', file);
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err && err.message ? err.message : err);
    try { await client.query('ROLLBACK'); } catch(e){}
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
