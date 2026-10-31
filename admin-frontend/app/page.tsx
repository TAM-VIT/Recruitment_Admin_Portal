"use client";

import React, { useState, useEffect } from "react";

const RAW_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  "http://localhost:5000";

const API_BASE = RAW_BASE.replace(/\/+$/, "").endsWith("/api/admin")
  ? RAW_BASE.replace(/\/+$/, "")
  : `${RAW_BASE.replace(/\/+$/, "")}/api/admin`;

const DOMAINS = [
  "TECHNICAL",
  "MANAGEMENT",
  "DESIGN",
  "MARKETING",
  "R_AND_D",
  "EDITORIAL",
];

const ADMIN_ALLOWED_STAGES = [
  "SHORTLISTED",
  "SLOT_CHOOSING",
  "SELECTED",
  "REJECTED",
];

export default function AdminPortal() {
  const [token, setToken] = useState<string | null>(null);
  const [adminUser, setAdminUser] = useState<{
    id: string;
    email: string;
    role: string;
    domain?: string;
  } | null>(null);

  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<
    "candidates" | "questions" | "slots" | "root"
  >("candidates");

  // 1. Candidates & Review State
  const [filterDomain, setFilterDomain] = useState<string>("TECHNICAL");
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [questionScores, setQuestionScores] = useState<Record<string, number>>(
    {}
  );
  const [reviewComments, setReviewComments] = useState("");
  const [stageDecision, setStageDecision] = useState<string>("SHORTLISTED");

  // 2. Form Questions & Subsections State
  const [questionDomain, setQuestionDomain] = useState<string>("TECHNICAL");
  const [subsectionsList, setSubsectionsList] = useState<any[]>([]);
  const [questionsList, setQuestionsList] = useState<any[]>([]);
  const [newSubsectionName, setNewSubsectionName] = useState("");
  const [selectedSubsectionId, setSelectedSubsectionId] = useState<string>("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionMarks, setNewQuestionMarks] = useState<number>(10);
  const [newQuestionOrder, setNewQuestionOrder] = useState<number>(1);

  // 3. Calendly-Style Interview Slots State
  const [slotDomain, setSlotDomain] = useState<string>("TECHNICAL");
  const [slotDate, setSlotDate] = useState<string>("");
  const [slotStartTime, setSlotStartTime] = useState<string>("10:00");
  const [slotEndTime, setSlotEndTime] = useState<string>("11:00");
  const [slotDuration, setSlotDuration] = useState<number>(20);
  const [slotMeetingLink, setSlotMeetingLink] = useState<string>("");
  const [slotsList, setSlotsList] = useState<any[]>([]);

  // 4. Root Admin Whitelist State
  const [assignDomain, setAssignDomain] = useState<string>("TECHNICAL");
  const [assignEmails, setAssignEmails] = useState<string>("");

  const notify = (type: "success" | "error", text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 6000);
  };

  const parseJwt = (tk: string) => {
    try {
      return JSON.parse(atob(tk.split(".")[1]));
    } catch {
      return {};
    }
  };

  // Restore token & session from localStorage on load
  useEffect(() => {
    const savedToken = localStorage.getItem("admin_token");
    if (savedToken) {
      const decoded = parseJwt(savedToken);
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("admin_token");
      } else {
        setToken(savedToken);
        const userObj = {
          id: decoded.id,
          email: decoded.email,
          role: decoded.role,
          domain: decoded.domain,
        };
        setAdminUser(userObj);
        if (userObj.domain) {
          setFilterDomain(userObj.domain);
          setQuestionDomain(userObj.domain);
          setSlotDomain(userObj.domain);
        }
      }
    }
  }, []);

  // Auth Handler (/login and /setup)
  const handleAuth = async (endpoint: "/login" | "/setup") => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: authEmail.trim().toLowerCase(),
          password: authPassword,
          ...(endpoint === "/setup" && authName ? { name: authName.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Authentication failed");

      const decoded = parseJwt(data.token);
      const userObj = {
        id: data.id || data.admin?.id || decoded.id,
        email: data.email || data.admin?.email || decoded.email || authEmail,
        role: data.role || data.admin?.role || decoded.role,
        domain: data.domain || data.admin?.domain || decoded.domain,
      };

      setToken(data.token);
      localStorage.setItem("admin_token", data.token);
      setAdminUser(userObj);

      const defaultDom = userObj.domain || "TECHNICAL";
      setFilterDomain(defaultDom);
      setQuestionDomain(defaultDom);
      setSlotDomain(defaultDom);

      notify(
        "success",
        endpoint === "/setup"
          ? "Password created & logged in successfully!"
          : `Logged in as ${userObj.email}`
      );
    } catch (err: any) {
      notify("error", err.message || "Authentication failed");
    }
  };

  // 1. Fetch Submitted Candidates
  const fetchCandidates = async (dom = filterDomain) => {
    if (!token) return;
    try {
      const query = dom && dom !== "ALL" ? `?domain=${dom}` : "";
      const res = await fetch(`${API_BASE}/applicants${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch applicants");

      const rawList = json.data || json.applicants || [];
      const submittedOnly = rawList.filter((app: any) => Boolean(app.submittedAt));
      setCandidates(submittedOnly);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleSelectCandidate = async (app: any) => {
    setSelectedApp(app);
    setReviewComments(app.review1Comments || "");
    setStageDecision(
      ADMIN_ALLOWED_STAGES.includes(app.stage) ? app.stage : "SHORTLISTED"
    );

    let answersList = app.user?.answers || [];

    if (answersList.length === 0 && app.userId && token) {
      try {
        const res = await fetch(`${API_BASE}/applicants/${app.userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (res.ok && json.data?.answers) {
          answersList = json.data.answers;
          setSelectedApp({
            ...app,
            user: { ...app.user, answers: answersList },
          });
        }
      } catch {
        // Ignore fallback error
      }
    }

    const scores: Record<string, number> = {};
    answersList
      .filter(
        (ans: any) => !ans.question?.domain || ans.question.domain === app.domain
      )
      .forEach((ans: any) => {
        scores[ans.id] = ans.marks ?? 0;
      });
    setQuestionScores(scores);
  };

  const totalCalculatedMarks = Object.values(questionScores).reduce(
    (sum, val) => sum + (Number(val) || 0),
    0
  );

  const handleSaveEvaluation = async () => {
    if (!selectedApp || !token) return;
    try {
      const answerScores = Object.entries(questionScores).map(
        ([answerId, marks]) => ({
          answerId,
          marks: Number(marks) || 0,
        })
      );

      const res = await fetch(
        `${API_BASE}/applicants/${selectedApp.id}/review`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            stage: stageDecision,
            review1Marks: totalCalculatedMarks,
            review1Comments: reviewComments,
            review1Passed:
              stageDecision === "SHORTLISTED" || stageDecision === "SELECTED",
            answerScores,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to save evaluation");

      notify("success", "Question marks & stage decision saved!");
      fetchCandidates(filterDomain);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  // 2. Fetch Form Questions & Subsections
  const fetchFormQuestions = async (dom = questionDomain) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/form?domain=${dom}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch questions");

      setSubsectionsList(json.data?.subsections || []);
      setQuestionsList(json.data?.questions || []);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateSubsection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newSubsectionName.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/form/subsection`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newSubsectionName.trim(),
          domain: questionDomain,
          order: subsectionsList.length + 1,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create subsection");

      setNewSubsectionName("");
      notify("success", "Form subsection created!");
      fetchFormQuestions(questionDomain);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newQuestionText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/form/question`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: newQuestionText.trim(),
          domain: questionDomain,
          subsectionId: selectedSubsectionId || null,
          maxMarks: Number(newQuestionMarks) || 10,
          order: Number(newQuestionOrder) || questionsList.length + 1,
          required: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create question");

      setNewQuestionText("");
      setNewQuestionOrder((prev) => prev + 1);
      notify("success", "Question & marks added to domain form!");
      fetchFormQuestions(questionDomain);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  // 3. Fetch Slots
  const fetchSlots = async (dom = slotDomain) => {
    if (!token || !adminUser?.id) return;
    try {
      const targetAdminId =
        adminUser.role === "ROOT_ADMIN" ? "ALL" : adminUser.id;
      const res = await fetch(
        `${API_BASE}/schedule/${targetAdminId}?all=true&domain=${dom}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to fetch slots");
      setSlotsList(json.data || []);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  const handleCreateSlots = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !slotDate || !slotStartTime || !slotEndTime) {
      notify("error", "Please select a calendar date, start time, and end time.");
      return;
    }

    const startISO = new Date(`${slotDate}T${slotStartTime}:00`).toISOString();
    const endISO = new Date(`${slotDate}T${slotEndTime}:00`).toISOString();

    if (new Date(endISO) <= new Date(startISO)) {
      notify("error", "End time must be after start time.");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/slots`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interviewerId: adminUser?.id,
          domain: slotDomain,
          startTime: startISO,
          endTime: endISO,
          durationMinutes: Number(slotDuration) || 20,
          meetingLink: slotMeetingLink.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to create slots");

      notify("success", json.message || "Interview slots created!");
      fetchSlots(slotDomain);
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  // 4. Root Admin Whitelist
  const handleAssignDomainHeads = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !assignEmails.trim()) return;

    const emailArray = assignEmails
      .split(",")
      .map((em) => em.trim().toLowerCase())
      .filter(Boolean);

    try {
      const res = await fetch(`${API_BASE}/domain-heads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          domain: assignDomain,
          emails: emailArray,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to assign domain heads");

      setAssignEmails("");
      notify("success", json.message || "Domain head(s) whitelisted!");
    } catch (err: any) {
      notify("error", err.message);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCandidates(filterDomain);
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Recruitment Admin & Evaluation Portal
            </h1>
            <p className="text-xs text-slate-500">
              Domain Form Builder • Per-Question Candidate Grading • Calendly-Style Slot Scheduler
            </p>
          </div>
          {adminUser && (
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-200">
                {adminUser.email} ({adminUser.role}
                {adminUser.domain ? ` - ${adminUser.domain}` : ""})
              </span>
              <button
                onClick={() => {
                  localStorage.removeItem("admin_token");
                  setToken(null);
                  setAdminUser(null);
                  setSelectedApp(null);
                }}
                className="text-xs text-red-600 hover:underline font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Status Alert */}
        {statusMsg && (
          <div
            className={`p-4 rounded-xl text-sm font-medium border ${
              statusMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {/* Login / First-Time Setup Screen */}
        {!token ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-2xl">
            <h2 className="text-base font-bold mb-1">
              Admin & Domain Head Authentication
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              If your email was whitelisted by the Root Admin, enter your email and a new password and click{" "}
              <strong>Create First-Time Password</strong>.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                type="email"
                placeholder="Admin Email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Your Name (for first-time setup)"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleAuth("/login")}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                Login
              </button>
              <button
                onClick={() => handleAuth("/setup")}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold px-5 py-2 rounded-lg"
              >
                Create First-Time Password (/setup)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
              <button
                onClick={() => {
                  setActiveTab("candidates");
                  fetchCandidates(filterDomain);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === "candidates"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                1. Candidate Review & Grading ({candidates.length})
              </button>

              <button
                onClick={() => {
                  setActiveTab("questions");
                  fetchFormQuestions(questionDomain);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === "questions"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                2. Form Questions & Marks
              </button>

              <button
                onClick={() => {
                  setActiveTab("slots");
                  fetchSlots(slotDomain);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                  activeTab === "slots"
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 border border-slate-200"
                }`}
              >
                3. Interview Slots (Calendly Style)
              </button>

              {adminUser?.role === "ROOT_ADMIN" && (
                <button
                  onClick={() => setActiveTab("root")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                    activeTab === "root"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-indigo-700 border border-indigo-200"
                  }`}
                >
                  4. Whitelist Domain Heads
                </button>
              )}
            </div>

            {/* TAB 1: CANDIDATE REVIEW */}
            {activeTab === "candidates" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="font-bold text-base">
                      Submitted Applications
                    </h2>
                    <button
                      onClick={() => fetchCandidates(filterDomain)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                    >
                      Refresh
                    </button>
                  </div>

                  {adminUser?.role === "ROOT_ADMIN" && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">Domain:</span>
                      <select
                        value={filterDomain}
                        onChange={(e) => {
                          setFilterDomain(e.target.value);
                          fetchCandidates(e.target.value);
                        }}
                        className="border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      >
                        <option value="ALL">ALL DOMAINS</option>
                        {DOMAINS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-2 max-h-[550px] overflow-y-auto">
                    {candidates.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        No submitted applications found for this domain yet.
                      </p>
                    ) : (
                      candidates.map((app) => (
                        <div
                          key={app.id}
                          onClick={() => handleSelectCandidate(app)}
                          className={`p-3.5 rounded-lg border cursor-pointer transition ${
                            selectedApp?.id === app.id
                              ? "border-blue-600 bg-blue-50/40"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-semibold text-sm">
                                {app.user?.name || "Candidate"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {app.user?.regNumber} • {app.user?.email}
                              </p>
                            </div>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {app.stage}
                            </span>
                          </div>
                          <div className="mt-2 flex justify-between items-center text-xs text-slate-500">
                            <span>Domain: {app.domain}</span>
                            {app.review1Marks !== null &&
                              app.review1Marks !== undefined && (
                                <span className="font-semibold text-emerald-700">
                                  Marks: {app.review1Marks}
                                </span>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="font-bold text-base border-b border-slate-200 pb-3 mb-4">
                    Candidate Form Evaluation
                  </h2>

                  {!selectedApp ? (
                    <p className="text-xs text-slate-500 py-12 text-center">
                      Select a candidate on the left to grade their responses question-by-question.
                    </p>
                  ) : (
                    <div className="space-y-5">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-slate-400 block">Candidate Name</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.user?.name}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Registration Number</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.user?.regNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Phone</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.user?.phone || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Domain</span>
                          <span className="font-semibold text-indigo-700">
                            {selectedApp.domain}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Current Stage</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.stage}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block">Submitted On</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.submittedAt
                              ? new Date(selectedApp.submittedAt).toLocaleDateString()
                              : "Submitted"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-bold text-slate-800">
                            Individual Question Responses & Marks
                          </h3>
                          <span className="text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-1 rounded-lg border border-emerald-200">
                            Total Score: {totalCalculatedMarks} Marks
                          </span>
                        </div>

                        {(selectedApp.user?.answers || []).filter(
                          (ans: any) =>
                            !ans.question?.domain ||
                            ans.question.domain === selectedApp.domain
                        ).length === 0 ? (
                          <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg">
                            No answers submitted for this domain yet.
                          </p>
                        ) : (
                          (selectedApp.user?.answers || [])
                            .filter(
                              (ans: any) =>
                                !ans.question?.domain ||
                                ans.question.domain === selectedApp.domain
                            )
                            .map((ans: any, idx: number) => {
                              const maxM = ans.question?.maxMarks || 10;
                              return (
                                <div
                                  key={ans.id || idx}
                                  className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60 space-y-2"
                                >
                                  <div className="flex justify-between items-start gap-4">
                                    <p className="text-xs font-semibold text-slate-800">
                                      Q{idx + 1}. {ans.question?.text || "Question"}
                                    </p>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <label className="text-[11px] text-slate-500">
                                        Marks:
                                      </label>
                                      <input
                                        type="number"
                                        min={0}
                                        max={maxM}
                                        value={questionScores[ans.id] ?? 0}
                                        onChange={(e) =>
                                          setQuestionScores({
                                            ...questionScores,
                                            [ans.id]: Number(e.target.value),
                                          })
                                        }
                                        className="w-16 border border-slate-300 rounded px-2 py-1 text-xs font-semibold text-center bg-white"
                                      />
                                      <span className="text-xs text-slate-500">
                                        / {maxM}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 whitespace-pre-wrap">
                                    {ans.text}
                                  </p>
                                </div>
                              );
                            })
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Stage Decision
                          </label>
                          <select
                            value={stageDecision}
                            onChange={(e) => setStageDecision(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
                          >
                            {ADMIN_ALLOWED_STAGES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-slate-400 mt-1">
                            Candidates automatically move to INTERVIEW when they book a slot.
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Reviewer Comments
                          </label>
                          <textarea
                            rows={2}
                            value={reviewComments}
                            onChange={(e) => setReviewComments(e.target.value)}
                            placeholder="Overall evaluation feedback..."
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSaveEvaluation}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded-lg"
                      >
                        Save Question Marks & Update Stage
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: DOMAIN FORM QUESTIONS & MARKS BUILDER */}
            {activeTab === "questions" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-base mb-1">
                      Add Form Question & Assign Marks
                    </h2>
                    <p className="text-xs text-slate-500 mb-4">
                      Each Domain Head can add questions and set maximum marks for their domain's candidate form.
                    </p>

                    <form onSubmit={handleCreateQuestion} className="space-y-4">
                      {adminUser?.role === "ROOT_ADMIN" && (
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Domain
                          </label>
                          <select
                            value={questionDomain}
                            onChange={(e) => {
                              setQuestionDomain(e.target.value);
                              fetchFormQuestions(e.target.value);
                            }}
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                          >
                            {DOMAINS.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {subsectionsList.length > 0 && (
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Subsection (Optional)
                          </label>
                          <select
                            value={selectedSubsectionId}
                            onChange={(e) =>
                              setSelectedSubsectionId(e.target.value)
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                          >
                            <option value="">General (No Subsection)</option>
                            {subsectionsList.map((sub: any) => (
                              <option key={sub.id} value={sub.id}>
                                {sub.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Question Prompt
                        </label>
                        <textarea
                          rows={3}
                          required
                          placeholder="Enter the question candidates will answer..."
                          value={newQuestionText}
                          onChange={(e) => setNewQuestionText(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Marks for Question
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={newQuestionMarks}
                            onChange={(e) =>
                              setNewQuestionMarks(Number(e.target.value))
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">
                            Question Order
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={newQuestionOrder}
                            onChange={(e) =>
                              setNewQuestionOrder(Number(e.target.value))
                            }
                            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 rounded-lg"
                      >
                        Add Question to {questionDomain}
                      </button>
                    </form>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-sm mb-2">
                      Create Form Subsection (Optional)
                    </h3>
                    <form
                      onSubmit={handleCreateSubsection}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        placeholder="e.g., Web Dev / AI-ML / Core"
                        value={newSubsectionName}
                        onChange={(e) => setNewSubsectionName(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                      <button
                        type="submit"
                        className="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-lg"
                      >
                        Add
                      </button>
                    </form>
                  </div>
                </div>

                <div className="lg:col-span-7 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-base">
                      {questionDomain} Form Questions ({questionsList.length})
                    </h2>
                    <button
                      onClick={() => fetchFormQuestions(questionDomain)}
                      className="text-xs text-indigo-600 font-semibold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {questionsList.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        No questions created for {questionDomain} yet.
                      </p>
                    ) : (
                      questionsList.map((q: any, idx: number) => (
                        <div
                          key={q.id || idx}
                          className="p-3.5 rounded-lg border border-slate-200 flex justify-between items-start gap-4"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-indigo-600">
                                Q{q.order || idx + 1}
                              </span>
                              {q.subsection?.name && (
                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                  {q.subsection.name}
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-medium text-slate-800 mt-1">
                              {q.text}
                            </p>
                          </div>
                          <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-2.5 py-1 rounded">
                            {q.maxMarks ?? 10} Marks
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CALENDLY-STYLE INTERVIEW SLOTS */}
            {activeTab === "slots" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <h2 className="font-bold text-base mb-1">
                    Create Interview Availability (Calendly Style)
                  </h2>
                  <p className="text-xs text-slate-500 mb-4">
                    Pick a date on the calendar, choose your start and end time window, and set how many minutes each interview slot should last.
                  </p>
                  <form onSubmit={handleCreateSlots} className="space-y-4">
                    {adminUser?.role === "ROOT_ADMIN" && (
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          Domain
                        </label>
                        <select
                          value={slotDomain}
                          onChange={(e) => {
                            setSlotDomain(e.target.value);
                            fetchSlots(e.target.value);
                          }}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                        >
                          {DOMAINS.map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        1. Choose Calendar Date
                      </label>
                      <input
                        type="date"
                        required
                        value={slotDate}
                        onChange={(e) => setSlotDate(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          2. From Time
                        </label>
                        <input
                          type="time"
                          required
                          value={slotStartTime}
                          onChange={(e) => setSlotStartTime(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          3. To Time
                        </label>
                        <input
                          type="time"
                          required
                          value={slotEndTime}
                          onChange={(e) => setSlotEndTime(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        4. Duration Per Interview (Minutes)
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={240}
                        required
                        value={slotDuration}
                        onChange={(e) =>
                          setSlotDuration(Number(e.target.value))
                        }
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold mb-1">
                        5. Meeting Link (Sent when candidate books slot)
                      </label>
                      <input
                        type="url"
                        required
                        placeholder="https://meet.google.com/..."
                        value={slotMeetingLink}
                        onChange={(e) => setSlotMeetingLink(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-lg"
                    >
                      Generate Interview Slots
                    </button>
                  </form>
                </div>

                <div className="lg:col-span-7 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="font-bold text-base">
                      Created Slots & Bookings ({slotsList.length})
                    </h2>
                    <button
                      onClick={() => fetchSlots(slotDomain)}
                      className="text-xs text-emerald-700 font-semibold hover:underline"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[550px] overflow-y-auto">
                    {slotsList.length === 0 ? (
                      <p className="text-xs text-slate-500 py-8 text-center">
                        No slots created yet. Use the form on the left to add availability.
                      </p>
                    ) : (
                      slotsList.map((s: any) => (
                        <div
                          key={s.id}
                          className="p-3.5 rounded-lg border border-slate-200 flex justify-between items-center gap-4"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              {new Date(s.startTime).toLocaleDateString()} •{" "}
                              {new Date(s.startTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              –{" "}
                              {new Date(s.endTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {s.meetingLink && (
                              <a
                                href={s.meetingLink}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-blue-600 hover:underline block"
                              >
                                {s.meetingLink}
                              </a>
                            )}
                            {s.bookings?.length > 0 && (
                              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                                Booked by:{" "}
                                {s.bookings
                                  .map(
                                    (b: any) =>
                                      b.application?.user?.name ||
                                      b.application?.user?.email
                                  )
                                  .join(", ")}
                              </p>
                            )}
                          </div>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 text-slate-700 shrink-0">
                            Booked: {s.bookedCount} / {s.capacity}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ROOT ADMIN WHITELIST */}
            {activeTab === "root" && adminUser?.role === "ROOT_ADMIN" && (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 max-w-xl">
                <h2 className="font-bold text-base mb-1">
                  Assign & Whitelist Domain Heads
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  Enter one or more comma-separated emails. Once added, those Domain Heads can click "Create First-Time Password" on the login screen.
                </p>
                <form onSubmit={handleAssignDomainHeads} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Select Domain
                    </label>
                    <select
                      value={assignDomain}
                      onChange={(e) => setAssignDomain(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    >
                      {DOMAINS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1">
                      Domain Head Email(s)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="head1@gmail.com, head2@gmail.com"
                      value={assignEmails}
                      onChange={(e) => setAssignEmails(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg"
                  >
                    Grant Domain Head Access
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}