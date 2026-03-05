/**
 * Invite Management Admin Page
 *
 * Allows administrators to list, create, edit, deactivate, and delete invite codes.
 * Supports per-code usage detail (daily breakdown).
 */

"use client";

import { useEffect, useState } from "react";
import styles from "../../../styles/common.module.css";
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

const inputStyle = { width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" } as const;
const labelStyle = { display: "block", fontSize: 13, marginBottom: 4 } as const;
const actionBtnBase = { padding: "4px 8px", background: "#fff", borderRadius: 4, cursor: "pointer", fontSize: 12 } as const;

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
          <div style={{ background: "#fff8e1", padding: 16, borderTop: "2px solid #ffc107" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <strong>Editing: {invite.code}</strong>
              <button onClick={() => { setEditingCode(null); setEditForm(null); }} style={{ ...actionBtnBase, border: "1px solid #999", color: "#666" }}>Cancel</button>
            </div>
            <form onSubmit={handleUpdate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={labelStyle}>Description</label>
                <input
                  type="text"
                  value={editForm.description}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Description"
                  style={inputStyle}
                  maxLength={256}
                />
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select
                  value={editForm.isActive ? "active" : "inactive"}
                  onChange={e => setEditForm({ ...editForm, isActive: e.target.value === "active" })}
                  style={inputStyle}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Lifetime Limit (Max Jobs)</label>
                <input
                  type="number"
                  value={editForm.maxJobs}
                  onChange={e => setEditForm({ ...editForm, maxJobs: e.target.value })}
                  style={inputStyle}
                  min={1}
                  step={1}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Hourly Limit</label>
                <input
                  type="number"
                  value={editForm.hourlyLimit}
                  onChange={e => setEditForm({ ...editForm, hourlyLimit: e.target.value })}
                  style={inputStyle}
                  min={0}
                  step={1}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Daily Limit</label>
                <input
                  type="number"
                  value={editForm.dailyLimit}
                  onChange={e => setEditForm({ ...editForm, dailyLimit: e.target.value })}
                  style={inputStyle}
                  min={0}
                  step={1}
                  required
                />
              </div>
              <div>
                <label style={labelStyle}>Expiration</label>
                <input
                  type="datetime-local"
                  value={editForm.expiresUtc}
                  onChange={e => setEditForm({ ...editForm, expiresUtc: e.target.value })}
                  style={inputStyle}
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
        <div style={{ background: "#f0f4ff", padding: 16, borderTop: "2px solid #2196f3" }}>
          {usageLoading ? (
            <span style={{ color: "#666" }}>Loading usage data...</span>
          ) : usageData ? (
            <>
              <div style={{ display: "flex", gap: 24, marginBottom: 12, fontSize: 13 }}>
                <span><strong>Lifetime:</strong> {usageData.lifetime.used} / {usageData.lifetime.limit} ({usageData.lifetime.remaining} remaining)</span>
                <span><strong>Today:</strong> {usageData.daily.used}{usageData.daily.limit > 0 ? ` / ${usageData.daily.limit}` : ""}</span>
                <span><strong>This hour:</strong> {usageData.hourly.used}{usageData.hourly.limit > 0 ? ` / ${usageData.hourly.limit}` : ""}</span>
              </div>
              {usageData.history.length > 0 ? (
                <table style={{ width: "auto", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #ccc" }}>
                      <th style={{ padding: "4px 16px 4px 0", textAlign: "left" }}>Date</th>
                      <th style={{ padding: "4px 0", textAlign: "right" }}>Jobs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData.history.map(h => (
                      <tr key={h.date} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: "3px 16px 3px 0", color: "#555" }}>{new Date(h.date).toLocaleDateString()}</td>
                        <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 500 }}>{h.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <span style={{ color: "#999", fontSize: 12 }}>No usage history recorded yet.</span>
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
        <div style={{ background: "#f8f9fa", padding: 20, borderRadius: 8, border: "1px solid #ddd", marginBottom: 24 }}>
          <h3>Create New Invite Code</h3>
          <form onSubmit={handleCreate} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <label style={labelStyle}>Code Name</label>
              <input
                type="text"
                value={newCode.code}
                onChange={e => setNewCode({...newCode, code: e.target.value})}
                placeholder="ALPHA-2026-XYZ"
                style={inputStyle}
                maxLength={64}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Description (Optional)</label>
              <input
                type="text"
                value={newCode.description}
                onChange={e => setNewCode({...newCode, description: e.target.value})}
                placeholder="For marketing partner X"
                style={inputStyle}
                maxLength={256}
              />
            </div>
            <div>
              <label style={labelStyle}>Lifetime Limit (Max Jobs)</label>
              <input
                type="number"
                value={newCode.maxJobs}
                onChange={e => setNewCode({...newCode, maxJobs: e.target.value})}
                style={inputStyle}
                min={1}
                step={1}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Hourly Limit (per 60 min)</label>
              <input
                type="number"
                value={newCode.hourlyLimit}
                onChange={e => setNewCode({...newCode, hourlyLimit: e.target.value})}
                style={inputStyle}
                min={0}
                step={1}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Daily Limit (24h Quota)</label>
              <input
                type="number"
                value={newCode.dailyLimit}
                onChange={e => setNewCode({...newCode, dailyLimit: e.target.value})}
                style={inputStyle}
                min={0}
                step={1}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Expiration (Optional)</label>
              <input
                type="datetime-local"
                value={newCode.expiresUtc}
                onChange={e => setNewCode({...newCode, expiresUtc: e.target.value})}
                style={inputStyle}
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
        <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
          <thead style={{ background: "#f1f5f9", textAlign: "left" }}>
            <tr>
              <th style={{ padding: 12 }}>Code</th>
              <th style={{ padding: 12 }}>Usage</th>
              <th style={{ padding: 12 }}>Hourly</th>
              <th style={{ padding: 12 }}>Daily</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Created</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map(invite => {
              const isEditing = editingCode === invite.code;
              const isUsageOpen = usageCode === invite.code;
              return [
                <tr key={invite.code} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 12 }}>
                    <code style={{ fontWeight: "bold" }}>{invite.code}</code>
                    {invite.description && <div style={{ fontSize: 11, color: "#666" }}>{invite.description}</div>}
                  </td>
                  <td style={{ padding: 12 }}>
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
                  <td style={{ padding: 12 }}>{invite.hourlyLimit > 0 ? `${invite.hourlyLimit} / hr` : "unlimited"}</td>
                  <td style={{ padding: 12 }}>{invite.dailyLimit > 0 ? `${invite.dailyLimit} / day` : "unlimited"}</td>
                  <td style={{ padding: 12 }}>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      background: invite.isActive ? "#d4edda" : "#f8d7da",
                      color: invite.isActive ? "#28a745" : "#dc3545"
                    }}>
                      {invite.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td style={{ padding: 12, fontSize: 12, color: "#666" }}>
                    {new Date(invite.createdUtc).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 12 }}>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button
                        onClick={() => isEditing ? (setEditingCode(null), setEditForm(null)) : startEdit(invite)}
                        style={{ ...actionBtnBase, border: "1px solid #1565c0", color: "#1565c0" }}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                      {invite.isActive && (
                        <button
                          onClick={() => handleDeactivate(invite.code)}
                          style={{ ...actionBtnBase, border: "1px solid #f57c00", color: "#f57c00" }}
                        >
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleHardDelete(invite.code)}
                        style={{ ...actionBtnBase, border: "1px solid #dc3545", color: "#dc3545" }}
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
