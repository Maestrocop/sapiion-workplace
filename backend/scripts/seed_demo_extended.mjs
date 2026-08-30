// Expanded demo dataset — built entirely through the real HTTP API (never
// raw SQL/model inserts), so every record goes through the same validation
// and phase-transition logic a real user's clicks would trigger. Safe to
// re-run: user/company creation is skip-on-conflict (409), and downstream
// steps are best-effort per student.
//
// Usage: node scripts/seed_demo_extended.mjs
// Optional: API_URL=http://localhost:4100 node scripts/seed_demo_extended.mjs

const API_URL = process.env.API_URL || 'http://localhost:4100';
const COORDINATOR_EMAIL = 'coordinator@example.com';
const COORDINATOR_PASSWORD = 'DemoPassword123';
const STUDENT_PASSWORD = 'DemoPassword123';

const ALL_CHECKS = [
  'company_details_verified', 'company_supervisor_assigned', 'start_date_defined',
  'end_date_defined', 'working_schedule_defined', 'learning_objectives_set',
  'assessment_method_set', 'documents_uploaded', 'student_signed', 'company_signed', 'school_signed',
];
const PARTIAL_CHECKS = ['company_details_verified', 'company_supervisor_assigned', 'start_date_defined'];

let token = '';

async function api(method, path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `${method} ${path} failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

async function login() {
  const data = await api('POST', '/api/auth/login', { email: COORDINATOR_EMAIL, password: COORDINATOR_PASSWORD });
  token = data.token;
  console.log(`Logged in as ${COORDINATOR_EMAIL}`);
}

async function ensureCompany(company) {
  // No unique constraint on company name — check first, don't rely on a
  // 409 that will never come (a naive create-or-catch here would just
  // create a duplicate row every time this script re-runs).
  const list = await api('GET', `/api/companies?search=${encodeURIComponent(company.name)}`);
  const existing = list.find((c) => c.name === company.name);
  if (existing) { console.log(`  = company already exists: ${company.name}`); return existing; }
  const created = await api('POST', '/api/companies', company);
  console.log(`  + company: ${company.name}`);
  return created;
}

async function ensureStudent(user) {
  try {
    const created = await api('POST', '/api/users', user);
    console.log(`  + student: ${user.first_name} ${user.last_name} <${user.email}>`);
    return created;
  } catch (err) {
    if (err.status === 409) {
      const list = await api('GET', '/api/users?role=student');
      const existing = list.find((u) => u.email === user.email);
      if (existing) { console.log(`  = student already exists: ${user.email}`); return existing; }
    }
    throw err;
  }
}

async function enroll(campaignId, studentId) {
  const [internship] = await api('POST', `/api/internship-campaigns/${campaignId}/enroll`, { student_ids: [studentId] });
  return internship;
}

async function logApplication(internshipId, companyName, outcome) {
  const app = await api('POST', `/api/internships/${internshipId}/applications`, {
    company_name: companyName, company_email: `hr@${companyName.toLowerCase().replace(/[^a-z]/g, '')}.example`,
  });
  if (outcome && outcome !== 'pending') {
    await api('PUT', `/api/internships/${internshipId}/applications/${app.id}`, { outcome });
  }
  return app;
}

async function setCompanyDetails(internshipId, company, startDate, endDate) {
  await api('PUT', `/api/internships/${internshipId}`, {
    company_name: company.name, company_address: `${company.city}, Netherlands`,
    start_date: startDate, end_date: endDate, working_schedule: 'Mon-Fri 09:00-17:00',
  });
}

async function addSupervisor(internshipId, name, email) {
  return api('POST', `/api/internships/${internshipId}/supervisors`, { name, email, job_title: 'Team Lead' });
}

async function completeChecks(internshipId, keys) {
  for (const key of keys) {
    await api('PATCH', `/api/internships/${internshipId}/placement-checklist/${key}`, { is_completed: true });
  }
}

async function addLogs(internshipId, weeks) {
  for (const w of weeks) {
    await api('POST', `/api/internships/${internshipId}/activity-logs`, {
      week_starting: w.date, hours_logged: w.hours, content: w.content,
    });
  }
}

async function submitAssessment(internshipId, role, score, feedback) {
  await api('POST', `/api/internships/${internshipId}/assessments`, {
    assessor_role: role, score, max_score: 100, feedback, is_completed: true,
  });
}

async function submitReflection(internshipId, text, notes) {
  await api('POST', `/api/internships/${internshipId}/reflection`, {
    reflection: text, competency_notes: notes, submit: true,
  });
}

async function advancePhase(internshipId) {
  return api('POST', `/api/internships/${internshipId}/advance-phase`, {});
}

async function markComplete(internshipId, note) {
  return api('POST', `/api/internships/${internshipId}/complete`, { completion_note: note });
}

const WEEKLY_LOGS = [
  { date: '2026-09-01', hours: 36, content: 'Onboarding, introduction to the team and tools.' },
  { date: '2026-09-08', hours: 38, content: 'Started work on the assigned project, shadowing senior staff.' },
  { date: '2026-09-15', hours: 40, content: 'First independent task completed and reviewed.' },
  { date: '2026-09-22', hours: 38, content: 'Continued project work, attended client meeting.' },
  { date: '2026-09-29', hours: 40, content: 'Presented progress to the team, positive feedback.' },
  { date: '2026-10-06', hours: 40, content: 'Deeper involvement in project delivery, mentoring a junior colleague.' },
  { date: '2026-10-13', hours: 40, content: 'Wrapped up main deliverable, started documentation.' },
  { date: '2026-10-20', hours: 24, content: 'Final week — handover and closing report.' },
];

async function main() {
  await login();

  console.log('Companies:');
  const companies = {};
  for (const c of [
    { name: 'Van Dijk Architecture', city: 'Amsterdam', sector: 'Architecture' },
    { name: 'NorthPeak Software', city: 'Utrecht', sector: 'Software Development' },
    { name: 'GreenGrid Energy', city: 'Rotterdam', sector: 'Energy' },
    { name: 'Media Loop Studio', city: 'The Hague', sector: 'Media & Design' },
    { name: 'Solidus Manufacturing', city: 'Eindhoven', sector: 'Manufacturing' },
    { name: 'Acme BIM Consultants', city: 'Rotterdam', sector: 'Engineering' }, // pre-existing from seed_demo.mjs
  ]) {
    companies[c.name] = await ensureCompany(c);
  }

  console.log('Classes & campaigns:');
  const classes = await api('GET', '/api/classes');
  const bimClass = classes.find((c) => c.name === 'BIM Year 3');
  const ictClass = classes.find((c) => c.name.includes('ICT'));
  const campaigns = await api('GET', '/api/internship-campaigns?all=1');
  const bimCampaign = campaigns.find((c) => c.class?.id === bimClass?.id);
  const ictCampaign = campaigns.find((c) => c.class?.id === ictClass?.id);
  if (!bimCampaign || !ictCampaign) {
    throw new Error('Expected an existing campaign for both BIM Year 3 and the ICT class — run the base seed_demo.mjs first.');
  }
  console.log(`  BIM Year 3 -> campaign #${bimCampaign.id}, ICT class -> campaign #${ictCampaign.id}`);

  const plan = [
    // phase: searching
    { first: 'Emma', last: 'de Vries', klass: bimClass, campaign: bimCampaign, phase: 'searching',
      applications: [['Van Dijk Architecture', 'interview_scheduled'], ['NorthPeak Software', 'pending']] },
    { first: 'Liam', last: 'Bakker', klass: ictClass, campaign: ictCampaign, phase: 'searching',
      applications: [['GreenGrid Energy', 'no_reply']] },
    { first: 'Noor', last: 'El Idrissi', klass: bimClass, campaign: bimCampaign, phase: 'searching', applications: [] },

    // phase: placed
    { first: 'Sophie', last: 'Jansen', klass: bimClass, campaign: bimCampaign, phase: 'placed', company: 'Van Dijk Architecture' },
    { first: 'Daan', last: 'Visser', klass: ictClass, campaign: ictCampaign, phase: 'placed', company: 'NorthPeak Software' },

    // phase: on_site
    { first: 'Fleur', last: 'Mulder', klass: bimClass, campaign: bimCampaign, phase: 'on_site', company: 'GreenGrid Energy', weeks: 3 },
    { first: 'Sem', last: 'Bos', klass: ictClass, campaign: ictCampaign, phase: 'on_site', company: 'Media Loop Studio', weeks: 4 },
    { first: 'Julia', last: 'Peters', klass: bimClass, campaign: bimCampaign, phase: 'on_site', company: 'Solidus Manufacturing', weeks: 5 },

    // phase: evaluating
    { first: 'Milan', last: 'de Groot', klass: ictClass, campaign: ictCampaign, phase: 'evaluating', company: 'Acme BIM Consultants',
      weeks: 6, teacherScore: 82, supervisorScore: 78,
      reflection: 'I learned a lot about working in a professional software team, especially around code review and testing.',
      notes: 'Communication, teamwork, time management.' },
    { first: 'Anna', last: 'Willems', klass: bimClass, campaign: bimCampaign, phase: 'evaluating', company: 'Van Dijk Architecture',
      weeks: 5, teacherScore: 90, supervisorScore: 88,
      reflection: 'This internship gave me hands-on experience with real client projects and BIM coordination.',
      notes: 'Technical drawing accuracy, client communication.' },

    // phase: completed
    { first: 'Bram', last: 'Dekker', klass: ictClass, campaign: ictCampaign, phase: 'completed', company: 'NorthPeak Software',
      weeks: 8, teacherScore: 85, supervisorScore: 80,
      reflection: 'A great introduction to full-stack development in a real product team.',
      notes: 'Problem solving, adaptability.', completionNote: 'Completed all deliverables on schedule, strong final presentation.' },
    { first: 'Isa', last: 'van Dijk', klass: bimClass, campaign: bimCampaign, phase: 'completed', company: 'GreenGrid Energy',
      weeks: 6, teacherScore: 95, supervisorScore: 92,
      reflection: 'I gained real insight into sustainable energy project management.',
      notes: 'Leadership, sustainability analysis.', completionNote: 'Excellent internship — company has asked about a graduate role.' },
  ];

  console.log('Students & internships:');
  for (const p of plan) {
    const email = `${p.first.toLowerCase().replace(/[^a-z]/g, '')}.${p.last.toLowerCase().replace(/[^a-z]/g, '')}@example.com`;
    const student = await ensureStudent({
      email, password: STUDENT_PASSWORD, first_name: p.first, last_name: p.last,
      roles: ['student'], class_id: p.klass?.id ? Number(p.klass.id) : null,
    });

    const internship = await enroll(Number(p.campaign.id), Number(student.id));
    console.log(`  enrolled ${p.first} ${p.last} -> internship #${internship.id} (target phase: ${p.phase})`);

    if (p.phase === 'searching') {
      for (const [companyName, outcome] of p.applications) {
        await logApplication(internship.id, companyName, outcome);
      }
      continue;
    }

    // Every phase beyond searching starts with an accepted application
    // (the real trigger that flips searching -> placed).
    const company = companies[p.company];
    const app = await logApplication(internship.id, p.company, null);
    await api('PUT', `/api/internships/${internship.id}/applications/${app.id}`, { outcome: 'accepted' });
    await setCompanyDetails(internship.id, company, '2026-09-01', '2027-01-31');
    await addSupervisor(internship.id, `${p.company.split(' ')[0]} Supervisor`, `supervisor@${p.company.toLowerCase().replace(/[^a-z]/g, '')}.example`);

    if (p.phase === 'placed') {
      await completeChecks(internship.id, PARTIAL_CHECKS);
      continue;
    }

    await completeChecks(internship.id, ALL_CHECKS);
    await advancePhase(internship.id); // placed -> on_site
    await addLogs(internship.id, WEEKLY_LOGS.slice(0, p.weeks));

    if (p.phase === 'on_site') continue;

    await advancePhase(internship.id); // on_site -> evaluating
    await submitAssessment(internship.id, 'teacher', p.teacherScore, 'Solid progress, good professional attitude.');
    await submitAssessment(internship.id, 'supervisor', p.supervisorScore, 'Reliable and quick to learn.');
    await submitReflection(internship.id, p.reflection, p.notes);

    if (p.phase === 'evaluating') continue;

    await markComplete(internship.id, p.completionNote);
  }

  console.log('\nDone. Extended demo data seeded across every phase.');
}

main().catch((err) => { console.error('Seed failed:', err.message); process.exit(1); });
