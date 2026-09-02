/**
 * CampusGenie Institutional Policy Corpus & Citations Database
 * Covers all university regulations, OD leave, IP ownership, code of conduct,
 * travel reimbursements, permission letters, and competition eligibility.
 */

export interface PolicyClause {
  clause_number: string;
  heading: string;
  text: string;
}

export interface PolicyDocument {
  doc_id: string;
  title: string;
  category: 'attendance_leave' | 'intellectual_property' | 'ethics' | 'finance' | 'permissions' | 'eligibility';
  college: string;
  effective_date: string;
  volume_path: string;
  clauses: PolicyClause[];
}

export interface PolicyCitation {
  doc_title: string;
  clause: string;
  snippet: string;
  document?: string;
  title?: string;
  text?: string;
  url?: string;
}

export const INSTITUTIONAL_POLICIES: PolicyDocument[] = [
  {
    doc_id: 'POL-OD-2025',
    title: 'Bangalore Technical Universities General Regulations on On-Duty (OD) Leave',
    category: 'attendance_leave',
    college: 'All Affiliated Engineering Colleges & Autonomous Technical Institutes',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-OD-2025.pdf',
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
      },
      {
        clause_number: 'Clause 4.4',
        heading: 'Semester Cumulative Cap',
        text: 'The cumulative On-Duty leave granted to any student across all extracurricular technical, sports, and cultural events shall not exceed six (6) total working days per academic semester without special sanction from the Dean of Academic Affairs.'
      },
      {
        clause_number: 'Clause 4.5',
        heading: 'Examination Period Exclusion',
        text: 'On-Duty leave shall not be granted for dates coinciding with internal continuous assessment tests (CIE), laboratory examinations, or semester-end examinations (SEE).'
      }
    ]
  },
  {
    doc_id: 'POL-IP-2025',
    title: 'Campus Intellectual Property & Hackathon Project Ownership Code',
    category: 'intellectual_property',
    college: 'Institutional Research & Innovation Council (IRIC)',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-IP-2025.pdf',
    clauses: [
      {
        clause_number: 'Clause 8.1',
        heading: 'Student Ownership of Hackathon Creations',
        text: 'All source code, software prototypes, designs, algorithms, and intellectual property conceived and created solely by students during hackathons, workshops, or extracurricular innovation challenges belong 100% to the student team members.'
      },
      {
        clause_number: 'Clause 8.2',
        heading: 'Sponsor and Organizer License Restrictions',
        text: 'Event sponsors and host colleges may retain non-exclusive rights to showcase, demonstrate, and archive project submissions for evaluation and promotional purposes, but acquire no equity, proprietary license, or patent rights without explicit written student consent.'
      },
      {
        clause_number: 'Clause 8.3',
        heading: 'Open Source and Foundation Model Attribution',
        text: 'Student projects utilizing third-party open-source libraries or hosted foundation model APIs (e.g. Databricks DBRX, OpenAI, Anthropic, HuggingFace) must maintain proper licensing attribution and declare dependencies in the project repository.'
      }
    ]
  },
  {
    doc_id: 'POL-CODE-2025',
    title: 'Inter-Collegiate Hackathon Code of Conduct & Academic Integrity Code',
    category: 'ethics',
    college: 'Consortium of Bangalore Engineering Institutes',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-CODE-2025.pdf',
    clauses: [
      {
        clause_number: 'Clause 2.1',
        heading: 'Pre-existing Work Disclosure',
        text: 'All projects submitted for judging must be developed during the designated hackathon hack period. Third-party open-source libraries and public foundation models (e.g., HuggingFace, Databricks DBRX, OpenAI APIs) are permitted provided they are disclosed in the project readme.'
      },
      {
        clause_number: 'Clause 2.2',
        heading: 'Academic Integrity & Plagiarism Prohibition',
        text: 'Submitting unoriginal code, pre-built proprietary software without disclosure, or misrepresenting another party\'s work as original student creation constitutes an ethics violation resulting in immediate disqualification and academic reporting.'
      },
      {
        clause_number: 'Clause 2.3',
        heading: 'Inclusive & Harassment-Free Environment',
        text: 'All participants, mentors, judges, and organizers are entitled to a safe, respectful, and harassment-free environment regardless of gender, sexual orientation, disability, physical appearance, race, or religion.'
      }
    ]
  },
  {
    doc_id: 'POL-REIMB-2025',
    title: 'Student Travel Grant & Competitive Representation Reimbursement Policy',
    category: 'finance',
    college: 'Student Welfare & Development Directorate',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-REIMB-2025.pdf',
    clauses: [
      {
        clause_number: 'Clause 5.1',
        heading: 'Travel and Registration Grants',
        text: 'Teams selected for finals of national-level hackathons with prize pools exceeding INR 1,00,000 are eligible for up to 100% travel reimbursement (second sleeper train/bus fare) and entry fee waiver subject to Dean approval.'
      },
      {
        clause_number: 'Clause 5.2',
        heading: 'Reimbursement Claim Procedure & Timelines',
        text: 'Students must submit official expense receipts, boarding passes, registration invoices, and the event participation certificate to the Finance Office within fourteen (14) calendar days of event conclusion.'
      },
      {
        clause_number: 'Clause 5.3',
        heading: 'Prize Money and Grant Deductions',
        text: 'Institutional travel grants are non-taxable student welfare allowances and are not deducted from any prize money won by the student team at the competition.'
      }
    ]
  },
  {
    doc_id: 'POL-PERM-2025',
    title: 'Institutional Off-Campus Event Permission & Attendance Waiver Protocol',
    category: 'permissions',
    college: 'Office of the Dean (Student Affairs)',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-PERM-2025.pdf',
    clauses: [
      {
        clause_number: 'Clause 3.1',
        heading: 'Off-Campus Event Permission Form Requirement',
        text: 'All students attending external hackathons, bootcamps, tech talks, or conferences outside their home campus must obtain signed permission from their Faculty Mentor and Department Chairperson prior to departure.'
      },
      {
        clause_number: 'Clause 3.2',
        heading: 'Parental Consent for Overnight and Multi-Day Off-Campus Events',
        text: 'For multi-day hackathons requiring overnight stay at outside venues, students residing in university hostels or under 21 years of age must submit written parental / guardian consent to the Chief Warden / Department Office.'
      },
      {
        clause_number: 'Clause 3.3',
        heading: 'Safety and Emergency Contact Declaration',
        text: 'Participating teams must provide emergency contact information and the official organizer contact details to the college security office prior to departure.'
      }
    ]
  },
  {
    doc_id: 'POL-ELIG-2025',
    title: 'Consortium Regulations on Student Competition Eligibility & Academic Standing',
    category: 'eligibility',
    college: 'Academic Council & Board of Studies',
    effective_date: '2025-01-01',
    volume_path: '/Volumes/campusgenie/docs/policies/POL-ELIG-2025.pdf',
    clauses: [
      {
        clause_number: 'Clause 1.1',
        heading: 'Undergraduate Class Standing & Semester Requirements',
        text: 'First-year through final-year BTech/BE students in good academic standing are eligible for open collegiate events. Events categorized as "2nd year+ engineering students" require completion of at least two (2) academic semesters of foundational coursework.'
      },
      {
        clause_number: 'Clause 1.2',
        heading: 'Inter-Disciplinary and Cross-Department Team Formation',
        text: 'Students are actively encouraged to form inter-disciplinary teams comprising members across Computer Science, Electronics, Mechanical, Biotechnology, and Design departments without departmental restriction.'
      },
      {
        clause_number: 'Clause 1.3',
        heading: 'Academic Standing and Active Backlogs',
        text: 'Students with active disciplinary warnings or having more than three (3) active course backlogs may participate in weekend events but cannot receive official college sponsorship or travel reimbursement.'
      }
    ]
  }
];

export function getPolicyCorpus(): PolicyDocument[] {
  return INSTITUTIONAL_POLICIES;
}

export function findPolicyByDocId(docId: string): PolicyDocument | undefined {
  return INSTITUTIONAL_POLICIES.find(p => p.doc_id.toLowerCase() === docId.toLowerCase());
}

export function findClause(docId: string, clauseNumber: string): PolicyClause | undefined {
  const policy = findPolicyByDocId(docId);
  if (!policy) return undefined;
  return policy.clauses.find(c => c.clause_number.toLowerCase() === clauseNumber.toLowerCase());
}

export function searchPolicyCorpus(keyword: string): PolicyCitation[] {
  const q = keyword.toLowerCase();
  const citations: PolicyCitation[] = [];

  for (const pol of INSTITUTIONAL_POLICIES) {
    for (const clause of pol.clauses) {
      if (
        pol.title.toLowerCase().includes(q) ||
        clause.heading.toLowerCase().includes(q) ||
        clause.text.toLowerCase().includes(q) ||
        clause.clause_number.toLowerCase().includes(q)
      ) {
        citations.push({
          doc_title: pol.title,
          clause: clause.clause_number,
          snippet: clause.text,
          document: pol.doc_id,
          title: pol.title,
          text: clause.text,
          url: pol.volume_path
        });
      }
    }
  }

  return citations;
}
