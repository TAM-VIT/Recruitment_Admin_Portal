"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { AdminShell } from "@/components/AdminShell";
import { useToast } from "@/components/TickerToast";
import { api } from "@/lib/client";
import { RecruitmentSettings } from "@/lib/types";

// The deadline is typed and shown in India time (IST, UTC+05:30) whatever the admin's computer is set to.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// ISO instant -> "YYYY-MM-DDTHH:MM" in IST, for the datetime-local input
function toIstInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() + IST_OFFSET_MS);
  return d.toISOString().slice(0, 16);
}

// "YYYY-MM-DDTHH:MM" typed as IST -> ISO instant
function fromIstInput(value: string): string {
  return new Date(`${value}:00+05:30`).toISOString();
}

function formatIst(iso: string | null): string {
  if (!iso) return "Not set";
  return (
    new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " IST"
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard requireRoot={true}>
      <AdminShell>
        <SettingsForm />
      </AdminShell>
    </AuthGuard>
  );
}

function SettingsForm() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<RecruitmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [deadline, setDeadline] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.getRecruitmentSettings();
      setSettings(s);
      setIsOpen(s.isOpen ?? true);
      setDeadline(toIstInput(s.formDeadline));
    } catch (err: any) {
      showToast(err?.message || "Couldn't load the settings.", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const notSetUp = settings !== null && settings.formDeadline === null;
  const deadlinePassed = settings?.formDeadline ? new Date(settings.formDeadline).getTime() < Date.now() : false;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadline) {
      showToast("Choose a form deadline.", "error");
      return;
    }
    setSaving(true);
    try {
      const s = await api.updateRecruitmentSettings({ isOpen, formDeadline: fromIstInput(deadline) });
      setSettings(s);
      setIsOpen(s.isOpen ?? true);
      setDeadline(toIstInput(s.formDeadline));
      showToast("Recruitment settings saved.", "success");
    } catch (err: any) {
      showToast(err?.message || "Couldn't save the settings.", "error");
    } finally {
      setSaving(false);
    }
  };

  let status = "Open";
  if (notSetUp) status = "Not set up";
  else if (settings?.isOpen === false) status = "Closed";
  else if (deadlinePassed) status = "Deadline passed";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "720px" }}>
      <div>
        <span className="kicker">✦ THE PRINTING PRESS ✦</span>
        <h1 className="headline" style={{ fontSize: "2.2rem", margin: "0.3rem 0" }}>
          Recruitment Settings
        </h1>
        <p className="deck" style={{ margin: 0 }}>
          Students can sign up, fill in and submit their forms only while recruitment is open and before the deadline.
        </p>
      </div>

      <hr className="rule-double" />

      <section style={{ border: "2px solid var(--ink)", padding: "1rem 1.25rem" }}>
        <span className="kicker">CURRENT STATUS</span>
        {loading ? (
          <p style={{ margin: "0.4rem 0 0 0" }}>Loading…</p>
        ) : (
          <>
            <h2 className="headline" style={{ fontSize: "1.6rem", margin: "0.2rem 0", color: status === "Open" ? "var(--ink)" : "var(--stamp)" }}>
              {status}
            </h2>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>Form deadline: {formatIst(settings?.formDeadline ?? null)}</p>
            {notSetUp && (
              <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.85rem", color: "var(--stamp)" }}>
                Recruitment isn&apos;t set up yet, so students can&apos;t sign up. Set a deadline below to start.
              </p>
            )}
          </>
        )}
      </section>

      <form onSubmit={save} style={{ border: "1px solid var(--ink)", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "0.6rem", fontFamily: "var(--font-label)", fontSize: "0.9rem" }}>
          <input type="checkbox" checked={isOpen} onChange={(e) => setIsOpen(e.target.checked)} disabled={loading || saving} />
          Recruitment is open
        </label>
        <p style={{ margin: "-0.6rem 0 0 1.6rem", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
          Untick to close applications right away, whatever the deadline.
        </p>

        <label style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontFamily: "var(--font-label)", fontSize: "0.9rem" }}>
          Form deadline (IST)
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={loading || saving}
            required
            style={{ padding: "0.45rem", border: "1px solid var(--ink)", background: "transparent", color: "var(--ink)", maxWidth: "280px" }}
          />
        </label>

        <div>
          <button type="submit" className="stamp-btn" disabled={loading || saving}>
            {saving ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
