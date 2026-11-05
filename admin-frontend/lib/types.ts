export type AdminRole = "ROOT_ADMIN" | "DOMAIN_HEAD";

export type DomainEnum =
  | "DESIGN"
  | "MARKETING"
  | "R_AND_D"
  | "MANAGEMENT"
  | "TECHNICAL";

export type ApplicationStage =
  | "FORM_FILLING"
  | "SHORTLISTED"
  | "SLOT_CHOOSING"
  | "INTERVIEW"
  | "SELECTED"
  | "REJECTED";

export const DOMAIN_LABELS: Record<DomainEnum, string> = {
  DESIGN: "Design",
  MARKETING: "Marketing",
  R_AND_D: "Research & Development",
  MANAGEMENT: "Management",
  TECHNICAL: "Tech",
};

export const DOMAIN_SHORT_LABELS: Record<DomainEnum, string> = {
  DESIGN: "Design",
  MARKETING: "Marketing",
  R_AND_D: "R&D",
  MANAGEMENT: "Management",
  TECHNICAL: "Tech",
};

export const DOMAINS: DomainEnum[] = [
  "DESIGN",
  "MARKETING",
  "R_AND_D",
  "MANAGEMENT",
  "TECHNICAL",
];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  FORM_FILLING: "Under Review",
  SHORTLISTED: "Shortlisted",
  SLOT_CHOOSING: "Slot Choosing",
  INTERVIEW: "Interview",
  SELECTED: "Selected",
  REJECTED: "Rejected",
};

// Same as the backend's ALLOWED_STAGE_MOVES (src/utils/adminRules.ts). FORM_FILLING moves on only
// through the Round 1 decision + email dispatch, and SLOT_CHOOSING -> INTERVIEW only when the student
// books a slot. Leaving SELECTED/REJECTED has extra conditions the backend checks (interviewed or not).
export const ALLOWED_STAGE_MOVES: Record<ApplicationStage, ApplicationStage[]> = {
  FORM_FILLING: [],
  SHORTLISTED: ["SLOT_CHOOSING", "REJECTED"],
  SLOT_CHOOSING: ["REJECTED"],
  INTERVIEW: ["SELECTED", "REJECTED", "SLOT_CHOOSING"],
  SELECTED: ["REJECTED"],
  REJECTED: ["SELECTED", "SLOT_CHOOSING"],
};

export function getDisplayStage(app?: {
  stage: ApplicationStage;
  round1Decision?: "SHORTLIST" | "REJECT" | null;
} | null): ApplicationStage {
  if (!app) return "FORM_FILLING";
  if (app.stage === "FORM_FILLING") {
    if (app.round1Decision === "SHORTLIST") return "SHORTLISTED";
    if (app.round1Decision === "REJECT") return "REJECTED";
  }
  return app.stage;
}

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  domain?: DomainEnum | null;
  name?: string;
}

export interface TeamMember {
  id: string;
  email: string;
  role: AdminRole;
  domain?: DomainEnum | null;
  name: string;
  claimed: boolean;
  // one-time code for "Create First-Time Password"; only present until they set a password
  setupCode?: string | null;
}

// Round 2 (after the interview) result emails
export type Round2Group = "SELECTED" | "NOT_SELECTED";

export interface Round2Candidate {
  applicationId: string;
  domain: DomainEnum;
  name: string;
  email: string;
  regNumber: string;
  review2Marks: number | null;
  emailStatus: "SENT" | "FAILED" | "NOT_SENT";
  emailSentAt: string | null;
  emailError: string | null;
}

export interface Round2Summary {
  domain: DomainEnum | "ALL";
  selected: Round2Candidate[];
  notSelected: Round2Candidate[];
}

export interface Round2SendResult {
  sent: number;
  failed: Array<{ applicationId: string; reason: string }>;
  alreadySent: number;
  message: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  id: string;
  email: string;
  role: AdminRole;
  domain?: DomainEnum | null;
  name?: string;
  message?: string;
}

export interface Question {
  id: string;
  domain: DomainEnum;
  text: string;
  maxMarks: number;
  subsectionId?: string | null;
  order: number;
  required?: boolean;
  maxLength?: number;
}

export interface Subsection {
  id: string;
  name: string;
  domain: DomainEnum;
  order: number;
}

export interface Answer {
  id: string;
  text: string;
  marks?: number | null;
  questionId: string;
  question: Question;
}

export interface ApplicantUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  regNumber: string;
  answers: Answer[];
}

export interface Slot {
  id: string;
  interviewerId: string;
  domain?: DomainEnum;
  meetingLink?: string;
  startTime: string; // ISO
  endTime: string;   // ISO
  capacity?: number;
  bookedCount?: number;
  bookings?: Booking[];
}

export interface Booking {
  id: string;
  slotId: string;
  slot?: {
    startTime: string;
    endTime: string;
    meetingLink?: string;
  };
  applicationId: string;
  application?: {
    id: string;
    domain: DomainEnum;
    userId: string;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string;
      regNumber: string;
    };
    review2Marks?: number | null;
    review2Comments?: string | null;
  };
}

export interface Application {
  id: string;
  domain: DomainEnum;
  stage: ApplicationStage;
  submittedAt: string | null;
  review1Marks?: number | null;
  review1Comments?: string | null;
  review1Passed?: boolean | null;
  review2Marks?: number | null;
  review2Comments?: string | null;
  review2Passed?: boolean | null;
  round1Decision?: "SHORTLIST" | "REJECT" | null;
  round1DecisionAt?: string | null;
  round1EmailSentAt?: string | null;
  userId: string;
  user: ApplicantUser;
  booking?: Booking | null;
}

export interface ReviewPayload {
  stage?: ApplicationStage;
  round1Decision?: "SHORTLIST" | "REJECT" | null;
  review1Marks?: number;
  review1Comments?: string;
  review1Passed?: boolean;
  review2Marks?: number;
  review2Comments?: string;
  review2Passed?: boolean;
  answerScores?: { answerId: string; marks: number }[];
}

export interface CreateSlotPayload {
  interviewerId?: string;
  domain?: DomainEnum;
  meetingLink?: string;
  startTime: string;
  endTime: string;
  durationMinutes?: number;
  capacity?: number;
}

export interface FormQuestionsResponse {
  subsections: Subsection[];
  questions: Question[];
}
