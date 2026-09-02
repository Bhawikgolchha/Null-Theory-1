import { Request, Response, NextFunction } from 'express';

export interface UserSession {
  user_id: string;
  name: string;
  email: string;
  college: string;
  department: string;
  year: number;
  role: 'student' | 'organizer' | 'judge' | 'admin';
}

// Pre-configured persona identities for easy switching during demo
export const DEMO_PERSONAS: Record<string, UserSession> = {
  'student-kg': {
    user_id: 'usr-kg-001',
    name: 'Karan Ganguly (KG)',
    email: 'karan.g@rvce.edu.in',
    college: 'RV College of Engineering (RVCE)',
    department: 'Computer Science & Engineering',
    year: 3,
    role: 'student'
  },
  'organizer-robotics': {
    user_id: 'usr-org-002',
    name: 'Pooja Iyer (Club Lead)',
    email: 'robotics.lead@pes.edu',
    college: 'PES University (RR Campus)',
    department: 'Robotics & Automation',
    year: 4,
    role: 'organizer'
  },
  'judge-databricks': {
    user_id: 'usr-jdg-003',
    name: 'Databricks Hackathon Judge',
    email: 'judge@databricks.com',
    college: 'Databricks Evaluation',
    department: 'Developer Relations',
    year: 0,
    role: 'judge'
  }
};

declare global {
  namespace Express {
    interface Request {
      user?: UserSession;
    }
  }
}

let activePersonaKey = 'student-kg';

export function setActivePersona(key: string) {
  if (DEMO_PERSONAS[key]) {
    activePersonaKey = key;
  }
}

export function getActivePersona(): UserSession {
  return DEMO_PERSONAS[activePersonaKey];
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Databricks Workspace OAuth forwarded headers
  const forwardedUser = req.headers['x-forwarded-user'] as string;
  const forwardedEmail = req.headers['x-forwarded-email'] as string;
  const personaHeader = req.headers['x-demo-persona'] as string;

  if (personaHeader && DEMO_PERSONAS[personaHeader]) {
    req.user = DEMO_PERSONAS[personaHeader];
    return next();
  }

  if (forwardedUser || forwardedEmail) {
    req.user = {
      user_id: forwardedUser || 'usr-workspace',
      name: forwardedEmail ? forwardedEmail.split('@')[0] : 'Workspace User',
      email: forwardedEmail || `${forwardedUser}@workspace.databricks.com`,
      college: 'RV College of Engineering (RVCE)',
      department: 'Engineering',
      year: 3,
      role: 'student'
    };
    return next();
  }

  // 2. Fallback to active demo persona
  req.user = getActivePersona();
  next();
}
