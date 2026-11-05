import {
  AdminUser,
  AuthResponse,
  Application,
  ApplicantUser,
  Slot,
  FormQuestionsResponse,
  ReviewPayload,
  CreateSlotPayload,
  DomainEnum,
  Subsection,
  Question,
  TeamMember,
  Round2Group,
  Round2Summary,
  Round2SendResult,
  RecruitmentSettings,
} from "./types";

const getAuthHeaders = (): HeadersInit => {
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok || data.success === false) {
    if (res.status === 401 || res.status === 403) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("admin_token");
        localStorage.removeItem("admin_user");
        window.location.href = "/login?msg=session_expired";
      }
    }
    throw new Error(data.message || "An error occurred");
  }
  return data.data !== undefined ? data.data : data;
}

export const adminApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse<AuthResponse>(res);
  },

  async setup(email: string, password: string, name?: string, setupCode?: string): Promise<AuthResponse> {
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, setupCode }),
    });
    return handleResponse<AuthResponse>(res);
  },

  async getApplicants(domain: string = "ALL"): Promise<Application[]> {
    const res = await fetch(`/api/admin/applicants?domain=${encodeURIComponent(domain)}`, {
      headers: getAuthHeaders(),
    });
    const apps = await handleResponse<Application[]>(res);
    return apps.map((app: any) => {
      let round1Decision: "SHORTLIST" | "REJECT" | null = app.round1Decision || null;
      if (!round1Decision) {
        if (app.stage === "SHORTLISTED" || app.stage === "SLOT_CHOOSING" || app.review1Passed === true) {
          round1Decision = "SHORTLIST";
        } else if (app.stage === "REJECTED" || (app.review1Passed === false && app.review1Marks !== null && app.review1Marks !== undefined)) {
          round1Decision = "REJECT";
        }
      }

      let round1EmailSentAt = app.round1EmailSentAt || null;
      if (!round1EmailSentAt && Array.isArray(app.emails)) {
        const sentEmail = app.emails.find((e: any) => (e.type === "SHORTLISTED" || e.type === "REJECTED") && e.status === "SENT");
        if (sentEmail) {
          round1EmailSentAt = sentEmail.sentAt;
        }
      }

      return {
        ...app,
        round1Decision,
        round1EmailSentAt,
      };
    });
  },

  async getApplication(applicationId: string): Promise<Application> {
    // Queries applicants dataset for application record by identifier
    const all = await this.getApplicants("ALL");
    const found = all.find((a) => a.id === applicationId);
    if (!found) {
      const err: any = new Error("Application not found");
      err.status = 404;
      throw err;
    }
    return found;
  },

  async getApplicantById(userId: string): Promise<ApplicantUser> {
    const res = await fetch(`/api/admin/applicants/${encodeURIComponent(userId)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<ApplicantUser>(res);
  },

  async updateReview(applicationId: string, payload: ReviewPayload): Promise<Application> {
    const bodyPayload: any = { ...payload };
    if (payload.round1Decision !== undefined) {
      if (payload.round1Decision === "SHORTLIST") {
        bodyPayload.review1Passed = true;
      } else if (payload.round1Decision === "REJECT") {
        bodyPayload.review1Passed = false;
      } else {
        bodyPayload.review1Passed = null;
      }
    }

    const res = await fetch(`/api/admin/applicants/${encodeURIComponent(applicationId)}/review`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(bodyPayload),
    });
    const updated = await handleResponse<Application>(res);
    let round1Decision: "SHORTLIST" | "REJECT" | null = (updated as any).round1Decision || null;
    if (!round1Decision) {
      if (updated.stage === "SHORTLISTED" || updated.stage === "SLOT_CHOOSING" || updated.review1Passed === true) {
        round1Decision = "SHORTLIST";
      } else if (updated.stage === "REJECTED" || (updated.review1Passed === false && updated.review1Marks !== null && updated.review1Marks !== undefined)) {
        round1Decision = "REJECT";
      }
    }
    return {
      ...updated,
      round1Decision,
    };
  },

  async createSlots(payload: CreateSlotPayload): Promise<{ success: boolean; message: string }> {
    const res = await fetch("/api/admin/slots", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async getSchedule(adminId: string = "ALL", all: boolean = true, domain?: string): Promise<Slot[]> {
    let url = `/api/admin/schedule/${encodeURIComponent(adminId)}?all=${all}`;
    if (domain) {
      url += `&domain=${encodeURIComponent(domain)}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Slot[]>(res);
  },

  async getForm(domain?: string): Promise<FormQuestionsResponse> {
    let url = "/api/admin/form";
    if (domain) {
      url += `?domain=${encodeURIComponent(domain)}`;
    }
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse<FormQuestionsResponse>(res);
  },

  async createSubsection(name: string, domain?: DomainEnum, order: number = 0): Promise<Subsection> {
    const res = await fetch("/api/admin/form/subsection", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, domain, order }),
    });
    return handleResponse<Subsection>(res);
  },

  async createQuestion(payload: Partial<Question>): Promise<Question> {
    const res = await fetch("/api/admin/form/question", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<Question>(res);
  },

  async deleteSlot(slotId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/admin/slots/${encodeURIComponent(slotId)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  },

  async updateSlot(slotId: string, payload: { meetingLink?: string }): Promise<Slot> {
    const res = await fetch(`/api/admin/slots/${encodeURIComponent(slotId)}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<Slot>(res);
  },

  async updateQuestion(id: string, payload: Partial<Question>): Promise<Question> {
    const res = await fetch(`/api/admin/form/question/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<Question>(res);
  },

  async deleteQuestion(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/form/question/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async updateSubsection(id: string, name: string, order?: number): Promise<Subsection> {
    const res = await fetch(`/api/admin/form/subsection/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ name, order }),
    });
    return handleResponse<Subsection>(res);
  },

  async deleteSubsection(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`/api/admin/form/subsection/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });
    return handleResponse<{ success: boolean }>(res);
  },

  async getDomainHeads(): Promise<TeamMember[]> {
    const res = await fetch("/api/admin/domain-heads", {
      headers: getAuthHeaders(),
    });
    const admins = await handleResponse<any[]>(res);
    // the backend reports hasPassword; "claimed" means they've set their password
    return admins.map((a) => ({
      ...a,
      name: a.name || "",
      claimed: Boolean(a.hasPassword),
      setupCode: a.setupCode ?? null,
    }));
  },

  async addDomainHeads(
    emails: string[] | string,
    domain: DomainEnum
  ): Promise<{ message: string; assignedEmails: string[]; alreadyExisting?: string[] }> {
    const res = await fetch("/api/admin/domain-heads", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ emails, domain }),
    });
    return handleResponse<{ message: string; assignedEmails: string[]; alreadyExisting?: string[] }>(res);
  },

  async getRound1Summary(domain?: string): Promise<{
    undecided: number;
    pendingShortlist: number;
    pendingReject: number;
    sentShortlist: number;
    sentReject: number;
  }> {
    const query = domain && domain !== "ALL" ? `?domain=${encodeURIComponent(domain)}` : "";
    const res = await fetch(`/api/admin/round1/summary${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getRound1Templates(decision?: string): Promise<any> {
    const query = decision ? `?decision=${encodeURIComponent(decision)}` : "";
    const res = await fetch(`/api/admin/round1/templates${query}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async sendRound1Emails(payload: {
    domain: string;
    decision: "SHORTLIST" | "REJECT";
    subject: string;
    body: string;
    limit?: number;
  }): Promise<{ processed: number; sent: number; failed: any[]; remaining: number }> {
    const res = await fetch(`/api/admin/round1/send`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  // Round 2 (after the interview): Selected / Not selected lists with each candidate's email status
  async getRound2Summary(domain: string = "ALL"): Promise<Round2Summary> {
    const res = await fetch(`/api/admin/round2/summary?domain=${encodeURIComponent(domain)}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse<Round2Summary>(res);
  },

  // Emails everyone in that list who hasn't had it yet; pressing again retries failures
  async sendRound2Emails(domain: string, group: Round2Group): Promise<Round2SendResult> {
    const res = await fetch("/api/admin/round2/send", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ domain, group }),
    });
    return handleResponse<Round2SendResult>(res);
  },
  // Recruitment settings: whether applications are open and the form deadline
  async getRecruitmentSettings(): Promise<RecruitmentSettings> {
    const res = await fetch("/api/admin/settings", { headers: getAuthHeaders() });
    return handleResponse<RecruitmentSettings>(res);
  },

  async updateRecruitmentSettings(payload: { isOpen?: boolean; formDeadline?: string }): Promise<RecruitmentSettings> {
    const res = await fetch("/api/admin/settings", {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse<RecruitmentSettings>(res);
  },
};
