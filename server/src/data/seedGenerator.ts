import fs from 'fs';
import path from 'path';

export interface EventRecord {
  event_id: string;
  title: string;
  description: string;
  short_pitch: string;
  category: 'hackathon' | 'tech_talk' | 'workshop' | 'cultural' | 'sports' | 'career_fair' | 'club_meet';
  subcategory: string;
  mode: 'offline' | 'online' | 'hybrid';
  venue: string;
  area: string;
  college: string;
  organizer: string;
  organizer_type: 'club' | 'company' | 'college' | 'community';
  start_ts: string;
  end_ts: string;
  duration_days: number;
  registration_deadline: string;
  is_free: boolean;
  fee_inr: number;
  prize_pool_inr: number;
  team_size_min: number;
  team_size_max: number;
  eligibility: string;
  capacity: number;
  registered_count: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  registration_url: string;
  registration_type: 'external' | 'platform_hosted';
  organizer_owned: boolean;
  organizer_contact: string;
  banner_url: string;
  rulebook_doc_id: string | null;
  status: 'open' | 'closing_soon' | 'closed';
  tags: string[];
}

export interface PolicyDocument {
  doc_id: string;
  title: string;
  category: string;
  college: string;
  clauses: {
    clause_number: string;
    heading: string;
    text: string;
  }[];
}

const COLLEGES = [
  'RV College of Engineering (RVCE)',
  'PES University (RR Campus)',
  'BMS College of Engineering (BMSCE)',
  'M.S. Ramaiah Institute of Technology (MSRIT)',
  'IIIT Bangalore',
  'Christ University (Kengeri Campus)',
  'Dayananda Sagar College of Engineering (DSCE)',
  'Nitte Meenakshi Institute of Technology (NMIT)'
];

const BANGALORE_AREAS = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'Electronic City',
  'Jayanagar',
  'HSR Layout',
  'Malleshwaram',
  'Yelahanka'
];

const ORGANIZERS = [
  { name: 'IEEE Student Branch', type: 'club' },
  { name: 'Google Developer Group (GDG) Bangalore', type: 'community' },
  { name: 'ACM Chapter', type: 'club' },
  { name: 'Devfolio Community', type: 'community' },
  { name: 'Null Bangalore Security Chapter', type: 'community' },
  { name: 'Microsoft Student Ambassadors', type: 'company' },
  { name: 'Coding Club', type: 'club' },
  { name: 'Robotics & Automation Society', type: 'club' }
];

const TAG_POOL = [
  'ai_ml', 'genai', 'python', 'deep_learning', 'llm', 'rag',
  'web_development', 'react', 'nextjs', 'typescript', 'tailwind',
  'web3', 'solidity', 'blockchain', 'defi',
  'cybersecurity', 'ctf', 'cloud', 'aws', 'docker', 'devops',
  'robotics', 'iot', 'embedded', 'hardware', 'arduino',
  'design', 'ui_ux', 'figma', 'product_management',
  'dance', 'music', 'drama', 'photography', 'gaming', 'esports'
];

const POLICIES: PolicyDocument[] = [
  {
    doc_id: 'POL-OD-2025',
    title: 'Bangalore Technical Universities General Regulations on On-Duty (OD) Leave',
    category: 'attendance_leave',
    college: 'All Affiliated Engineering Colleges',
    clauses: [
      {
        clause_number: 'Clause 4.1',
        heading: 'Eligibility for On-Duty (OD) Leave',
        text: 'A student maintaining a minimum cumulative class attendance of 75% prior to the event date is eligible to apply for up to three (3) consecutive working days of On-Duty (OD) leave per semester for recognized collegiate hackathons, technical conferences, or inter-university competitions.'
      },
      {
        clause_number: 'Clause 4.2',
        heading: 'Mandatory Prior Written Permission',
        text: 'To claim OD attendance waiver, the student must submit an official permission letter signed by the Faculty Advisor and Head of Department (HoD) at least forty-eight (48) hours before the event commencement.'
      },
      {
        clause_number: 'Clause 4.3',
        heading: 'Participation Verification Requirement',
        text: 'Upon returning, the student must produce a verified Certificate of Participation or verified Attendance Record issued by the organizing body within three (3) working days to confirm attendance credit.'
      }
    ]
  },
  {
    doc_id: 'POL-IP-2025',
    title: 'Campus Intellectual Property & Hackathon Project Ownership Code',
    category: 'intellectual_property',
    college: 'Institutional Research & Innovation Council',
    clauses: [
      {
        clause_number: 'Clause 8.1',
        heading: 'Student Ownership of Hackathon Creations',
        text: 'All source code, software prototypes, designs, and intellectual property conceived and created solely by students during hackathons, workshops, or extracurricular events belong 100% to the student team members.'
      },
      {
        clause_number: 'Clause 8.2',
        heading: 'Sponsor and Organizer License Restrictions',
        text: 'Event sponsors and host colleges may retain non-exclusive rights to showcase, demonstrate, and archive project submissions for evaluation and promotional purposes, but acquire no equity, proprietary license, or patent rights without explicit written student consent.'
      }
    ]
  },
  {
    doc_id: 'POL-CODE-2025',
    title: 'Inter-Collegiate Hackathon Code of Conduct & Ethics',
    category: 'ethics',
    college: 'Consortium of Bangalore Engineering Institutes',
    clauses: [
      {
        clause_number: 'Clause 2.1',
        heading: 'Pre-existing Work Disclosure',
        text: 'All projects submitted for judging must be developed during the designated hackathon hack period. Third-party open-source libraries and public foundation models (e.g., HuggingFace, Databricks DBRX, OpenAI APIs) are permitted provided they are disclosed in the project readme.'
      }
    ]
  },
  {
    doc_id: 'POL-REIMB-2025',
    title: 'Student Travel Grant & Competitive Representation Reimbursement Policy',
    category: 'finance',
    college: 'Student Welfare Directorate',
    clauses: [
      {
        clause_number: 'Clause 5.1',
        heading: 'Travel and Registration Grants',
        text: 'Teams selected for finals of national-level hackathons with prize pools exceeding INR 1,00,000 are eligible for up to 100% travel reimbursement (second sleeper train/bus fare) and entry fee waiver subject to Dean approval.'
      }
    ]
  }
];

export function generateSeedEvents(): EventRecord[] {
  const events: EventRecord[] = [];
  const now = new Date();

  // Distinct titles
  const titlesTemplates = [
    { title: 'Bangalore GenAI Buildathon', category: 'hackathon', sub: 'genai', tags: ['ai_ml', 'genai', 'llm', 'python'] },
    { title: 'Koramangala Agents Hack 2025', category: 'hackathon', sub: 'ai_ml', tags: ['ai_ml', 'rag', 'typescript'] },
    { title: 'RVCE National Cyber Defense CTF', category: 'hackathon', sub: 'cybersecurity', tags: ['cybersecurity', 'ctf', 'cloud'] },
    { title: 'PES OpenWeb3 Summer Summit', category: 'hackathon', sub: 'web3', tags: ['web3', 'solidity', 'blockchain'] },
    { title: 'Databricks Lakehouse & AI Deep Dive', category: 'tech_talk', sub: 'ai_ml', tags: ['ai_ml', 'cloud', 'devops'] },
    { title: 'Fullstack Next.js 15 & AI Masterclass', category: 'workshop', sub: 'web_development', tags: ['web_development', 'react', 'nextjs'] },
    { title: 'BMSCE Autonomous Robotics Expo & Battle', category: 'hackathon', sub: 'robotics', tags: ['robotics', 'iot', 'hardware'] },
    { title: 'Figma to Code: Modern UI/UX Sprint', category: 'workshop', sub: 'design', tags: ['design', 'ui_ux', 'figma'] },
    { title: 'Whitefield Cloud Native Developers Meetup', category: 'tech_talk', sub: 'cloud', tags: ['cloud', 'docker', 'devops'] },
    { title: 'IIITB Foundation Models & RAG Architecture', category: 'tech_talk', sub: 'ai_ml', tags: ['ai_ml', 'rag', 'llm'] },
    { title: 'Bangalore Tech Career Fair & Intern Blitz', category: 'career_fair', sub: 'career', tags: ['web_development', 'ai_ml', 'cloud'] },
    { title: 'Inter-College Battle of the Bands', category: 'cultural', sub: 'music', tags: ['music', 'cultural'] },
    { title: 'Bangalore Collegiate Esports Championship', category: 'sports', sub: 'gaming', tags: ['gaming', 'esports'] },
    { title: 'DSA & System Design Interview Marathon', category: 'workshop', sub: 'career', tags: ['python', 'web_development'] },
    { title: 'Hands-on IoT with ESP32 & FreeRTOS', category: 'workshop', sub: 'iot', tags: ['iot', 'robotics', 'embedded'] }
  ];

  for (let i = 0; i < 250; i++) {
    const tmpl = titlesTemplates[i % titlesTemplates.length];
    const college = COLLEGES[i % COLLEGES.length];
    const area = BANGALORE_AREAS[i % BANGALORE_AREAS.length];
    const org = ORGANIZERS[i % ORGANIZERS.length];

    // Clustered dates around now (-20 days to +60 days)
    const dayOffset = -15 + Math.floor((i * 80) / 250);
    const start = new Date(now.getTime() + dayOffset * 86400000);
    // Push toward weekend if it's a hackathon
    if (tmpl.category === 'hackathon' && start.getDay() !== 6 && start.getDay() !== 0) {
      start.setDate(start.getDate() + (6 - start.getDay()));
    }
    start.setHours(9 + (i % 8), 0, 0, 0);

    const durationDays = tmpl.category === 'hackathon' ? (i % 2 === 0 ? 2 : 3) : 1;
    const end = new Date(start.getTime() + durationDays * 86400000);
    end.setHours(18, 0, 0, 0);

    const deadline = new Date(start.getTime() - 2 * 86400000);
    const isFree = i % 3 !== 0; // ~66% free
    const feeInr = isFree ? 0 : [199, 299, 499, 799][i % 4];
    const prizePool = tmpl.category === 'hackathon' ? [25000, 50000, 100000, 250000, 500000][i % 5] : 0;
    const capacity = [60, 100, 150, 250, 400][i % 5];
    const registeredCount = Math.floor(capacity * (0.3 + 0.6 * Math.random()));
    const mode = i % 5 === 0 ? 'online' : (i % 4 === 0 ? 'hybrid' : 'offline');

    const rulebookDocId = tmpl.category === 'hackathon' ? 'POL-OD-2025' : null;

    events.push({
      event_id: `EVT-${String(i + 1).padStart(4, '0')}`,
      title: `${tmpl.title} ${Math.floor(i / titlesTemplates.length) > 0 ? 'v' + (Math.floor(i / titlesTemplates.length) + 1) : ''}`.trim(),
      description: `Join us at ${college} in ${area} for ${tmpl.title}. Featuring keynote speakers, competitive tracks, hands-on mentorship, and networking opportunities.`,
      short_pitch: `Top ${tmpl.sub} event at ${college.split(' ')[0]}. ${isFree ? 'Free entry' : '₹' + feeInr + ' fee'}, ${prizePool > 0 ? '₹' + (prizePool/1000) + 'k in prizes' : 'certificates for all'}.`,
      category: tmpl.category as any,
      subcategory: tmpl.sub,
      mode: mode,
      venue: mode === 'online' ? 'Online (Zoom / Discord)' : `${college} Auditorium / Tech Park`,
      area: area,
      college: college,
      organizer: org.name,
      organizer_type: org.type as any,
      start_ts: start.toISOString(),
      end_ts: end.toISOString(),
      duration_days: durationDays,
      registration_deadline: deadline.toISOString(),
      is_free: isFree,
      fee_inr: feeInr,
      prize_pool_inr: prizePool,
      team_size_min: tmpl.category === 'hackathon' ? (i % 2 === 0 ? 1 : 2) : 1,
      team_size_max: tmpl.category === 'hackathon' ? 4 : 1,
      eligibility: i % 4 === 0 ? '2nd year+ engineering students' : 'Any enrolled undergraduate/postgraduate student',
      capacity: capacity,
      registered_count: registeredCount,
      difficulty: ['beginner', 'intermediate', 'advanced'][i % 3] as any,
      registration_url: `https://devfolio.co/events/evt-${String(i + 1).padStart(4, '0')}`,
      registration_type: 'external',
      organizer_owned: org.type === 'club',
      organizer_contact: `contact@${college.toLowerCase().replace(/[^a-z]/g, '').slice(0, 5)}events.edu`,
      banner_url: `https://images.unsplash.com/photo-${1515187029135 + (i % 20) * 1000}?w=800&auto=format&fit=crop&q=60`,
      rulebook_doc_id: rulebookDocId,
      status: deadline < now ? 'closed' : (registeredCount / capacity > 0.85 ? 'closing_soon' : 'open'),
      tags: tmpl.tags
    });
  }

  return events;
}

export function writeSeedFiles() {
  const dataDir = path.join(__dirname);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const events = generateSeedEvents();
  fs.writeFileSync(path.join(dataDir, 'seed_events.json'), JSON.stringify(events, null, 2));
  fs.writeFileSync(path.join(dataDir, 'seed_policies.json'), JSON.stringify(POLICIES, null, 2));
  console.log(`Generated ${events.length} seed events and ${POLICIES.length} policy documents.`);
}

if (require.main === module) {
  writeSeedFiles();
}
