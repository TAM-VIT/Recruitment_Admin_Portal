import { Stage } from "@prisma/client";
import type { Admin, DomainType } from "@prisma/client";
import { prisma } from "./prisma";

export class HttpError extends Error {
  status: number;
  code: string;
  constructor(status: number, message: string, code: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Stage moves an admin may make through PUT /applicants/:id/review. They cover every button on the
// admin site while keeping stages consistent with the student backend:
// - FORM_FILLING only moves on through the Round 1 decision + email dispatch (sendRound1Emails)
// - SLOT_CHOOSING -> INTERVIEW only happens when the student books a slot (student backend)
// - after the interview: Selected / Rejected / sent back to slot choosing, and Selected <-> Rejected
// - a rejection can be undone back to slot choosing if the candidate was never interviewed
// changeStage adds the "interviewed or not" conditions.
export const ALLOWED_STAGE_MOVES: Record<Stage, Stage[]> = {
  FORM_FILLING: [],
  SHORTLISTED: [Stage.SLOT_CHOOSING, Stage.REJECTED],
  SLOT_CHOOSING: [Stage.REJECTED],
  INTERVIEW: [Stage.SELECTED, Stage.REJECTED, Stage.SLOT_CHOOSING],
  SELECTED: [Stage.REJECTED],
  REJECTED: [Stage.SELECTED, Stage.SLOT_CHOOSING],
};

export const MAX_REVIEW2_MARKS = 10;

export const DIVISION_LABELS: Record<DomainType, string> = {
  TECHNICAL: "Tech",
  MANAGEMENT: "Management",
  DESIGN: "Design",
  MARKETING: "Marketing",
  R_AND_D: "Research & Development",
};

// Root admins can act on any domain; heads only on their own
export function assertDomainAccess(admin: Admin, domain: DomainType) {
  if (admin.role === "ROOT_ADMIN") return;
  if (admin.domain !== domain) {
    throw new HttpError(403, "You can only manage your own domain", "WRONG_DOMAIN");
  }
}

// Enforces domain access and the moves above. Frees the candidate's slot when they're sent back to
// slot choosing, or rejected before their interview time (so someone else can book it). A booking whose
// interview already happened is kept as the record.
export async function changeStage(applicationId: string, to: Stage, admin: Admin) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { booking: { include: { slot: true } } },
  });
  if (!app) throw new HttpError(404, "Application not found", "APPLICATION_NOT_FOUND");
  assertDomainAccess(admin, app.domain);

  if (app.stage === to) {
    return app;
  }

  if (!ALLOWED_STAGE_MOVES[app.stage].includes(to)) {
    throw new HttpError(409, `Can't move a candidate from ${app.stage} to ${to}`, "INVALID_STAGE_CHANGE");
  }

  const interviewDone = !!app.booking && app.booking.slot.startTime <= new Date();
  const interviewed = interviewDone || app.review2Marks !== null;
  if (app.stage === "REJECTED" && to === "SELECTED" && !interviewed) {
    throw new HttpError(409, "Only a candidate who was interviewed can be selected", "NOT_INTERVIEWED");
  }
  if (app.stage === "REJECTED" && to === "SLOT_CHOOSING" && interviewed) {
    throw new HttpError(409, "This candidate was already interviewed", "ALREADY_INTERVIEWED");
  }

  const freeSlot = app.booking && (to === "SLOT_CHOOSING" || (to === "REJECTED" && !interviewDone));

  return prisma.$transaction(async (tx) => {
    if (freeSlot && app.booking) {
      await tx.slotBooking.delete({ where: { id: app.booking.id } });
      await tx.slot.updateMany({
        where: { id: app.booking.slotId, bookedCount: { gt: 0 } },
        data: { bookedCount: { decrement: 1 } },
      });
    }
    return tx.application.update({ where: { id: app.id }, data: { stage: to } });
  });
}

// Call before deleting or editing a slot's time
export async function assertSlotHasNoBookings(slotId: string) {
  const count = await prisma.slotBooking.count({ where: { slotId } });
  if (count > 0) {
    throw new HttpError(
      409,
      "This slot has bookings. Move or cancel them first.",
      "SLOT_HAS_BOOKINGS"
    );
  }
}
