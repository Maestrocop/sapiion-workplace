// Seeds a small realistic demo dataset so a fresh install has something to
// look at immediately: a class, a campaign, two students, a company, a
// placement with a supervisor, activity logs, and a teacher assessment.
// Safe to re-run — uses findOrCreate throughout.
import dotenv from 'dotenv';
import crypto from 'crypto';
import { Sequelize } from 'sequelize';
import { initModels } from '../models/index.js';
import { hashPassword } from '../lib/auth.js';

dotenv.config({ path: '.env' });

const sequelize = new Sequelize(process.env.DATABASE_URL, { logging: false });

async function main() {
  await sequelize.authenticate();
  const models = await initModels(sequelize);
  const { User, Class, AcademicYear, InternshipCampaign, Internship, InternshipSupervisor, InternshipActivityLog, InternshipAssessment, Company, InternshipCheckDefinition, InternshipPlacementCheck } = models;

  const [coordinator] = await User.findOrCreate({
    where: { email: 'coordinator@example.com' },
    defaults: {
      email: 'coordinator@example.com',
      password_hash: await hashPassword('DemoPassword123'),
      first_name: 'Coordinator', last_name: 'Demo', roles: ['coordinator', 'admin'],
    },
  });

  const students = [];
  for (const [i, firstName] of ['Alex', 'Sam', 'Robin'].entries()) {
    const [student] = await User.findOrCreate({
      where: { email: `student${i + 1}@example.com` },
      defaults: {
        email: `student${i + 1}@example.com`,
        password_hash: await hashPassword('DemoPassword123'),
        first_name: firstName, last_name: 'Student', roles: ['student'],
      },
    });
    students.push(student);
  }

  const [klass] = await Class.findOrCreate({ where: { code: 'BIM3' }, defaults: { name: 'BIM Year 3', code: 'BIM3' } });
  const year = await AcademicYear.findOne({ where: { is_current: true } });

  const [campaign] = await InternshipCampaign.findOrCreate({
    where: { class_id: klass.id, academic_year_id: year.id, campaign_type: 'graduation' },
    defaults: {
      class_id: klass.id, academic_year_id: year.id, campaign_type: 'graduation',
      name: `Graduation Internship ${year.label}`, coordinator_id: coordinator.id, status: 'active',
    },
  });

  const [company] = await Company.findOrCreate({
    where: { name: 'Acme BIM Consultants' },
    defaults: { name: 'Acme BIM Consultants', city: 'Rotterdam', sector: 'Engineering', partnership_status: 'active' },
  });

  const [internship] = await Internship.findOrCreate({
    where: { student_id: students[0].id, campaign_id: campaign.id },
    defaults: {
      student_id: students[0].id, campaign_id: campaign.id, class_id: klass.id,
      company_name: company.name, status: 'active',
      start_date: '2026-09-01', end_date: '2027-01-31',
    },
  });

  const [supervisor] = await InternshipSupervisor.findOrCreate({
    where: { internship_id: internship.id, name: 'Sam Supervisor' },
    defaults: {
      internship_id: internship.id, name: 'Sam Supervisor', email: 'supervisor@acme.example',
      job_title: 'Team Lead', access_token: crypto.randomBytes(24).toString('hex'),
      token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  await InternshipActivityLog.findOrCreate({
    where: { internship_id: internship.id, week_starting: '2026-09-01' },
    defaults: {
      internship_id: internship.id, week_starting: '2026-09-01', hours_logged: 32,
      content: 'Onboarding and Revit/BIM software training.', created_by: students[0].id,
    },
  });

  await InternshipAssessment.findOrCreate({
    where: { internship_id: internship.id, assessor_role: 'teacher' },
    defaults: {
      internship_id: internship.id, assessor_role: 'teacher', assessor_user_id: coordinator.id,
      score: 85, feedback: 'Strong start, good communication.', is_completed: true, submitted_at: new Date(),
    },
  });

  const requiredChecks = ['company_details_verified', 'company_supervisor_assigned'];
  for (const checkKey of requiredChecks) {
    const definition = await InternshipCheckDefinition.findOne({ where: { check_key: checkKey } });
    if (!definition) continue;
    await InternshipPlacementCheck.findOrCreate({
      where: { internship_id: internship.id, definition_id: definition.id },
      defaults: { internship_id: internship.id, definition_id: definition.id, is_completed: true, completed_at: new Date() },
    });
  }

  console.log('Demo data seeded:');
  console.log(`  Coordinator login: coordinator@example.com / DemoPassword123`);
  console.log(`  Student logins:    student1@example.com, student2@example.com, student3@example.com / DemoPassword123`);
  console.log(`  Campaign: ${campaign.name}`);
  console.log(`  Internship #${internship.id} for ${students[0].first_name} ${students[0].last_name} at ${company.name}`);
  console.log(`  Supervisor portal link: /supervisor/${supervisor.access_token}`);

  await sequelize.close();
}

main().catch((err) => { console.error(err); process.exit(1); });
