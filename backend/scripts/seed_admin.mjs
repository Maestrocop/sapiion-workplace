// Creates (or updates) a first admin user for a fresh install.
// Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=... node scripts/seed_admin.mjs
import dotenv from 'dotenv';
import { Sequelize } from 'sequelize';
import { initModels } from '../models/index.js';
import { hashPassword } from '../lib/auth.js';

dotenv.config({ path: '.env' });

const email    = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) {
  console.error('Usage: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=strongpassword node scripts/seed_admin.mjs');
  process.exit(2);
}

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });

async function main() {
  await sequelize.authenticate();
  const { User } = await initModels(sequelize);
  const password_hash = await hashPassword(password);

  const [user, created] = await User.findOrCreate({
    where: { email: email.toLowerCase().trim() },
    defaults: { email: email.toLowerCase().trim(), password_hash, first_name: 'Admin', last_name: 'User', roles: ['admin'] },
  });

  if (!created) {
    await user.update({ password_hash, roles: ['admin'], is_active: true });
    console.log(`Updated existing admin user: ${email}`);
  } else {
    console.log(`Created admin user: ${email}`);
  }

  await sequelize.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
