"use client";

import React, { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useToast } from "@/components/TickerToast";
import { DOMAIN_LABELS, DomainEnum, Round2Candidate, Round2Group, Round2Summary } from "@/lib/types";

// Round 2 (after the interview) result emails for one division: the Selected list and the Not selected
// list, each with its own send button. Each button only emails candidates who haven't had that email
// yet, so pressing it again is safe and retries any that failed.
export function Round2ResultsPanel({ domain }: { domain: string }) {
  const { showToast } = useToast();
  const [summary, setSummary] = useState<Round2Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<Round2Group | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await api.getRound2Summary(domain));
    } catch (err: any) {
      showToast(err?.message || "Couldn't load the Round 2 results.", "error");
    } finally {
      setLoading(false);
    }
  }, [domain, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (group: Round2Group, pending: number) => {
    if (domain === "ALL") return;
    const what = group === "SELECTED" ? "selection (congratulations)" : "not selected";
    const division = DOMAIN_LABELS[domain as DomainEnum] || domain;
    if (!window.confirm(`Send the ${what} email to ${pending} candidate(s) in ${division}?\n\nAnyone who already received it is skipped.`)) {
      return;
    }
    setSending(group);
    try {
      const result = await api.sendRound2Emails(domain, group);
      showToast(result.message, result.failed.length ? "error" : "success");
    } catch (err: any) {
      showToast(err?.message || "Sending failed.", "error");
    } finally {
      setSending(null);
      load();
    }
  };

  const lists: { group: Round2Group; title: string; hint: string; rows: Round2Candidate[] }[] = [
    {
      group: "SELECTED",
      title: "Selected",
      hint: "Marked Selected after the interview. Email: congratulations and next steps.",
      rows: summary?.selected ?? [],
    },
    {
      group: "NOT_SELECTED",
      title: "Not selected",
      hint: "Interviewed but not selected. Email: thank you for interviewing.",
      rows: summary?.notSelected ?? [],
    },
  ];

  return (
    <section style={{ border: "2px solid var(--ink)", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <span className="kicker">✦ ROUND 2 RESULTS ✦</span>
          <h2 className="headline" style={{ fontSize: "1.5rem", margin: "0.2rem 0 0.3rem 0" }}>
            Final Results &amp; Emails
          </h2>
          <p className="deck" style={{ margin: 0, maxWidth: "640px", fontSize: "0.9rem" }}>
            Send each candidate their final result once their Review 2 decision is saved.
            {domain === "ALL" && " Choose a division above to send emails."}
          </p>
        </div>
        <button type="button" className="ink-btn-secondary" onClick={load} disabled={loading} style={{ fontSize: "0.75rem", padding: "0.3rem 0.7rem" }}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
        {lists.map(({ group, title, hint, rows }) => {
          const pending = rows.filter((r) => r.emailStatus !== "SENT").length;
          return (
            <div key={group} style={{ border: "1px solid var(--ink)", padding: "0.8rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <div>
                <h3 className="headline" style={{ fontSize: "1.15rem", margin: 0 }}>
                  {title} ({rows.length})
                </h3>
                <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>{hint}</p>
              </div>

              <button
                type="button"
                className="stamp-btn"
                disabled={domain === "ALL" || pending === 0 || sending !== null}
                onClick={() => send(group, pending)}
                style={{ fontSize: "0.78rem" }}
              >
                {sending === group ? "Sending…" : pending === 0 ? "All emailed" : `Send ${title.toLowerCase()} emails (${pending})`}
              </button>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", maxHeight: "260px", overflowY: "auto" }}>
                {rows.length === 0 ? (
                  <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", margin: 0 }}>No candidates in this list yet.</p>
                ) : (
                  rows.map((r) => (
                    <div
                      key={r.applicationId}
                      style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", borderTop: "1px dashed var(--ink-soft)", paddingTop: "0.35rem", fontSize: "0.82rem" }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <strong>{r.name}</strong>
                        <div style={{ color: "var(--ink-soft)", wordBreak: "break-all" }}>
                          {r.regNumber} · {DOMAIN_LABELS[r.domain] || r.domain}
                        </div>
                        {r.emailStatus === "FAILED" && r.emailError && (
                          <div style={{ color: "var(--stamp)", fontSize: "0.75rem" }}>{r.emailError}</div>
                        )}
                      </div>
                      <span
                        style={{
                          flexShrink: 0,
                          fontFamily: "var(--font-label)",
                          fontSize: "0.68rem",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: r.emailStatus === "SENT" ? "var(--ink)" : "var(--stamp)",
                        }}
                      >
                        {r.emailStatus === "SENT" ? "Emailed" : r.emailStatus === "FAILED" ? "Failed" : "Not emailed"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
