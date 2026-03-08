/**
 * Invite Management Admin Page
 *
 * Allows administrators to list, create, edit, deactivate, and delete invite codes.
 * Supports per-code usage detail (daily breakdown).
 */

"use client";

import { useEffect, useState } from "react";
import styles from "../../../styles/common.module.css";
import pageStyles from "./invites.module.css";
import toast from "react-hot-toast";
import { useAdminAuth } from "../admin-auth-context";

type InviteCode = {
  code: string;
  description: string | null;
  maxJobs: number;
  hourlyLimit: number;
  dailyLimit: number;
  usedJobs: number;
  isActive: boolean;
  createdUtc: string;
  expiresUtc: string | null;
};

type UsageData = {
  code: string;
  lifetime: { used: number; limit: number; remaining: number };
  hourly: { used: number; limit: number; remaining: number };
  daily: { used: number; limit: number; remaining: number };
  history: { date: string; count: number }[];
};

type EditForm = {
  description: string;
  maxJobs: string;
  hourlyLimit: string;
  dailyLimit: string;
  expiresUtc: string;
  isActive: boolean;
};


export default function InviteManagementPage() {
  const { adminKey } = useAdminAuth();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [usageCode, setUsageCode] = useState<string | null>(null);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    description: "",
    maxJobs: "25",
    hourlyLimit: "3",
    dailyLimit: "6",
    expiresUtc: ""
  });

  useEffect(() => {
    if (adminKey) fetchInvites(adminKey);
  }, [adminKey]);

  /** Parse string to int with a floor minimum, used only at submit time. */
  const parseIntClamped = (value: string, min: number, fallback: number): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : Math.max(min, parsed);
  };

  const toUtcIsoOrNull = (value: string): string | null => {
    if (!value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  };

  const toLocalDatetimeValue = (utcString: string | null): string => {
    if (!utcString) return "";
    const d = new Date(utcString);
    if (Number.isNaN(d.getTime())) return "";
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const fetchInvites = async (key: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/fh/admin/invites", {
        headers: { "x-admin-key": key }
      });
      if (res.ok) {
        setInvites(await res.json());
      } else if (res.status === 401) {
        toast.error("Unauthorized. Please check your Admin Key on the Admin dashboard.");
      }
    } catch {
      toast.error("Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (code: string) => {
    if (!adminKey) return;
    if (!confirm(`Are you sure you want to deactivate "${code}"?`)) return;

    try {
      const res = await fetch(`/api/fh/admin/invites/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey }
      });
      if (res.ok) {
        toast.success("Code deactivated");
        fetchInvites(adminKey);
      } else {
        toast.error("Failed to deactivate code");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleHardDelete = async (code: string) => {
    if (!adminKey) return;
    if (!confirm(`Permanently delete "${code}"? This removes the code and all its usage history. This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/fh/admin/invites/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey, "x-hard-delete": "true" }
      });
      if (res.ok) {
        toast.success("Code permanently deleted");
        setUsageCode(null);
        setUsageData(null);
        setEditingCode(null);
        fetchInvites(adminKey);
      } else {
        toast.error("Failed to delete code");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey) return;
    try {
      const res = await fetch("/api/fh/admin/invites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        },
        body: JSON.stringify({
          code: newCode.code,
          description: newCode.description,
          maxJobs: parseIntClamped(newCode.maxJobs, 1, 25),
          hourlyLimit: parseIntClamped(newCode.hourlyLimit, 0, 3),
          dailyLimit: parseIntClamped(newCode.dailyLimit, 0, 6),
          expiresUtc: toUtcIsoOrNull(newCode.expiresUtc)
        })
      });

      if (res.ok) {
        toast.success("Invite code created");
        setShowCreateForm(false);
        fetchInvites(adminKey);
        setNewCode({
          code: "",
          description: "",
          maxJobs: "25",
          hourlyLimit: "3",
          dailyLimit: "6",
          expiresUtc: ""
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create code");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const startEdit = (invite: InviteCode) => {
    setEditingCode(invite.code);
    setEditForm({
      description: invite.description ?? "",
      maxJobs: String(invite.maxJobs),
      hourlyLimit: String(invite.hourlyLimit),
      dailyLimit: String(invite.dailyLimit),
      expiresUtc: toLocalDatetimeValue(invite.expiresUtc),
      isActive: invite.isActive,
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminKey || !editingCode || !editForm) return;

    const expiresUtcValue = toUtcIsoOrNull(editForm.expiresUtc);
    const original = invites.find(i => i.code === editingCode);
    const hadExpiration = !!original?.expiresUtc;

    try {
      const res = await fetch(`/api/fh/admin/invites/${encodeURIComponent(editingCode)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey
        },
        body: JSON.stringify({
          description: editForm.description,
          maxJobs: parseIntClamped(editForm.maxJobs, 1, 25),
          hourlyLimit: parseIntClamped(editForm.hourlyLimit, 0, 3),
          dailyLimit: parseIntClamped(editForm.dailyLimit, 0, 6),
          expiresUtc: expiresUtcValue,
          isActive: editForm.isActive,
          clearExpiration: hadExpiration && !expiresUtcValue,
        })
      });

      if (res.ok) {
        toast.success("Invite code updated");
        setEditingCode(null);
        setEditForm(null);
        fetchInvites(adminKey);
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update code");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const toggleUsage = async (code: string) => {
    if (usageCode === code) {
      setUsageCode(null);
      setUsageData(null);
      return;
    }
    if (!adminKey) return;
    setUsageCode(code);
    setUsageLoading(true);
    setUsageData(null);
    try {
      const res = await fetch(`/api/fh/admin/invites/${encodeURIComponent(code)}/usage`, {
        headers: { "x-admin-key": adminKey }
      });
      if (res.ok) {
        setUsageData(await res.json());
      } else {
        toast.error("Failed to load usage data");
        setUsageCode(null);
      }
    } catch {
      toast.error("Network error");
      setUsageCode(null);
    } finally {
      setUsageLoading(false);
    }
  };

  const renderEditRow = (invite: InviteCode) => {
    if (!editForm) return null;
    return (
      <tr key={`edit-${invite.code}`}>
        <td colSpan={7} style={{ padding: 0 }}>
          <div className={pageStyles.editRow}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>Editing: {invite.code}</strong>
              <button onClick={() => { setEditingCode(null); setEditForm(null); }} className={`${pageStyles.actionBtn} ${pageStyles.actionBtnCancel}`}>Cancel</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label className={pageStyles.label}>Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description"
                  className={pageStyles.input}
                  maxLength={256}
                />
              </div>
              <div>
                <label className={pageStyles.label}>Status</label>
                <select
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
                  className={pageStyles.input}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className={pageStyles.label}>Lifetime Limit (Max Jobs)</label>
                <input
                  type="number"
                  value={editForm.maxJobs}
                  onChange={e => setEditForm({ ...editForm, maxJobs: e.target.value })}
                  className={pageStyles.input}
                  min={1}
                  step={1}
                  required
                />
              </div>
              <div>
                <label className={pageStyles.label}>Hourly Limit</label>
                <input
                  type="number"
                  value={editForm.hourlyLimit}
                  onChange={e => setEditForm({ ...editForm, hourlyLimit: e.target.value })}
                  className={pageStyles.input}
                  min={0}
                  step={1}
                  required
                />
              </div>
              <div>
                <label className={pageStyles.label}>Daily Limit</label>
                <input
                  type="number"
                  value={editForm.dailyLimit}
                  onChange={e => setEditForm({ ...editForm, dailyLimit: e.target.value })}
                  className={pageStyles.input}
                  min={0}
                  step={1}
                  required
                />
              </div>
              <div>
                <label className={pageStyles.label}>Expiration</label>
                <input
                  type="datetime-local"
                  value={editForm.expiresUtc}
                  onChange={e => setEditForm({ ...editForm, expiresUtc: e.target.value })}
                  className={pageStyles.input}
                />
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className={styles.btnPrimary} style={{ width: "100%" }}>Save Changes</button>
              </div>
            </form>
          </div>
        </td>
      </tr>
    );
  };

  const renderUsageRow = (code: string) => (
    <tr key={`usage-${code}`}>
      <td colSpan={7} style={{ padding: 0 }}>
        <div className={pageStyles.usageRow}>
          {usageLoading ? (
            <span className={pageStyles.usageText}>Loading usage data...</span>
          ) : usageData ? (
            <>
              <div style={{ display: "flex", gap: 24, marginBottom: 12, fontSize: 13 }}>
                <span><strong>Lifetime:</strong> {usageData.lifetime.used} / {usageData.lifetime.limit} ({usageData.lifetime.remaining} remaining)</span>
                <span><strong>Today:</strong> {usageData.daily.used}{usageData.daily.limit > 0 ? ` / ${usageData.daily.limit}` : ""}</span>
                <span><strong>This hour:</strong> {usageData.hourly.used}{usageData.hourly.limit > 0 ? ` / ${usageData.hourly.limit}` : ""}</span>
              </div>
              {usageData.history.length > 0 ? (
                <table className={pageStyles.usageTable}>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.history.map(h => (
                      <tr key={h.date}>
                        <td>{new Date(h.date).toLocaleDateString()}</td>
                        <td>{h.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span className={pageStyles.usageText} style={{ fontSize: 12 }}>No usage history recorded yet.</span>
              )}
            </>
          ) : null}
        </div>
      </td>
    </tr>
  );

  return (
    <div className={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className={styles.title} style={{ margin: 0 }}>Invite Management</h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className={styles.btnPrimary}
          style={{ background: "#28a745" }}
        >
          {showCreateForm ? "Cancel" : "+ Create New Code"}
        </button>
      </div>

      {showCreateForm && (
        <div className={pageStyles.createForm}>
          <h3>Create New Invite Code</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label className={pageStyles.label}>Code Name</label>
              <input
                type="text"
                value={newCode.code}
                onChange={e => setNewCode({...newCode, code: e.target.value})}
                placeholder="ALPHA-2026-XYZ"
                className={pageStyles.input}
                maxLength={64}
                required
              />
            </div>
            <div>
              <label className={pageStyles.label}>Description (Optional)</label>
              <input
                type="text"
                value={newCode.description}
                onChange={e => setNewCode({...newCode, description: e.target.value})}
                placeholder="For marketing partner X"
                className={pageStyles.input}
                maxLength={256}
              />
            </div>
            <div>
              <label className={pageStyles.label}>Lifetime Limit (Max Jobs)</label>
              <input
                type="number"
                value={newCode.maxJobs}
                onChange={e => setNewCode({...newCode, maxJobs: e.target.value})}
                className={pageStyles.input}
                min={1}
                step={1}
                required
              />
            </div>
            <div>
              <label className={pageStyles.label}>Hourly Limit (per 60 min)</label>
              <input
                type="number"
                value={newCode.hourlyLimit}
                onChange={e => setNewCode({...newCode, hourlyLimit: e.target.value})}
                className={pageStyles.input}
                min={0}
                step={1}
                required
              />
            </div>
            <div>
              <label className={pageStyles.label}>Daily Limit (24h Quota)</label>
              <input
                type="number"
                value={newCode.dailyLimit}
                onChange={e => setNewCode({...newCode, dailyLimit: e.target.value})}
                className={pageStyles.input}
                min={0}
                step={1}
                required
              />
            </div>
            <div>
              <label className={pageStyles.label}>Expiration (Optional)</label>
              <input
                type="datetime-local"
                value={newCode.expiresUtc}
                onChange={e => setNewCode({...newCode, expiresUtc: e.target.value})}
                className={pageStyles.input}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <button type="submit" className={styles.btnPrimary} style={{ width: "100%" }}>Create Code</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p>Loading invite codes...</p>
      ) : (
        <table className={pageStyles.table}>
          <thead>
            <tr>
              <th>Code</th>
              <th>Usage</th>
              <th>Hourly</th>
              <th>Daily</th>
              <th>Status</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map(invite => {
              const isEditing = editingCode === invite.code;
              const isUsageOpen = usageCode === invite.code;
              return [
                <tr key={invite.code}>
                  <td>
                    <code style={{ fontWeight: "bold" }}>{invite.code}</code>
                    {invite.description && <div className={pageStyles.descriptionText}>{invite.description}</div>}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleUsage(invite.code)}
                      style={{
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        color: invite.usedJobs >= invite.maxJobs ? "#dc3545" : "#1565c0",
                        textDecoration: "underline dotted", fontSize: "inherit", fontFamily: "inherit",
                      }}
                      title="Click to view usage details"
                    >
                      {invite.usedJobs} / {invite.maxJobs}
                    </button>
                  </td>
                  <td>{invite.hourlyLimit > 0 ? `${invite.hourlyLimit} / hr` : "unlimited"}</td>
                  <td>{invite.dailyLimit > 0 ? `${invite.dailyLimit} / day` : "unlimited"}</td>
                  <td>
                    <span className={invite.isActive ? pageStyles.badgeActive : pageStyles.badgeInactive}>
                      {invite.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td className={pageStyles.dateText}>
                    {new Date(invite.createdUtc).toLocaleDateString()}
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => isEditing ? (setEditingCode(null), setEditForm(null)) : startEdit(invite)}
                        className={`${pageStyles.actionBtn} ${pageStyles.actionBtnEdit}`}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      {invite.isActive && (
                        <button
                          onClick={() => handleDeactivate(invite.code)}
                          className={`${pageStyles.actionBtn} ${pageStyles.actionBtnDeactivate}`}
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleHardDelete(invite.code)}
                        className={`${pageStyles.actionBtn} ${pageStyles.actionBtnDelete}`}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>,
                isEditing && renderEditRow(invite),
                isUsageOpen && renderUsageRow(invite.code),
              ];
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
