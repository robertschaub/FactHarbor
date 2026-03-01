/**
 * Invite Management Admin Page
 *
 * Allows administrators to list, create, and deactivate invite codes
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
  dailyLimit: number;
  usedJobs: number;
  isActive: boolean;
  createdUtc: string;
  expiresUtc: string | null;
};

export default function InviteManagementPage() {
  const { adminKey } = useAdminAuth();
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState({
    code: "",
    description: "",
    maxJobs: 10,
    dailyLimit: 2,
    expiresUtc: ""
  });

  useEffect(() => {
    if (adminKey) fetchInvites(adminKey);
  }, [adminKey]);

  const parseIntOrZero = (value: string): number => {
    const parsed = Number.parseInt(value, 10);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  const toUtcIsoOrNull = (value: string): string | null => {
    if (!value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
    } catch (err) {
      toast.error("Failed to load invites");
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = async (code: string) => {
    if (!adminKey) return;
    if (!confirm(`Are you sure you want to deactivate ${code}?`)) return;

    try {
      const res = await fetch(`/api/fh/admin/invites/${encodeURIComponent(code)}`, {
        method: "DELETE",
        headers: { "x-admin-key": adminKey ?? "" }
      });
      if (res.ok) {
        toast.success("Code deactivated");
        fetchInvites(adminKey ?? "");
      } else {
        toast.error("Failed to deactivate code");
      }
    } catch (err) {
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
          "x-admin-key": adminKey ?? ""
        },
        body: JSON.stringify({
          ...newCode,
          expiresUtc: toUtcIsoOrNull(newCode.expiresUtc)
        })
      });

      if (res.ok) {
        toast.success("Invite code created");
        setShowCreateForm(false);
        fetchInvites(adminKey ?? "");
        setNewCode({
          code: "",
          description: "",
          maxJobs: 10,
          dailyLimit: 2,
          expiresUtc: ""
        });
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to create code");
      }
    } catch (err) {
      toast.error("Network error");
    }
  };

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
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Code Name</label>
              <input 
                type="text" 
                value={newCode.code} 
                onChange={e => setNewCode({...newCode, code: e.target.value})}
                placeholder="ALPHA-2026-XYZ"
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                maxLength={64}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Description (Optional)</label>
              <input
                type="text"
                value={newCode.description}
                onChange={e => setNewCode({...newCode, description: e.target.value})}
                placeholder="For marketing partner X"
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                maxLength={256}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Lifetime Limit (Max Jobs)</label>
              <input 
                type="number" 
                value={newCode.maxJobs} 
                onChange={e => setNewCode({...newCode, maxJobs: Math.max(1, parseIntOrZero(e.target.value))})}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                min={1}
                step={1}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Daily Limit (24h Quota)</label>
              <input 
                type="number" 
                value={newCode.dailyLimit} 
                onChange={e => setNewCode({...newCode, dailyLimit: Math.max(0, parseIntOrZero(e.target.value))})}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
                min={0}
                step={1}
                required
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, marginBottom: 4 }}>Expiration (Optional)</label>
              <input
                type="datetime-local"
                value={newCode.expiresUtc}
                onChange={e => setNewCode({...newCode, expiresUtc: e.target.value})}
                style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc" }}
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
              <th style={{ padding: 12 }}>Daily</th>
              <th style={{ padding: 12 }}>Status</th>
              <th style={{ padding: 12 }}>Created</th>
              <th style={{ padding: 12 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invites.map(invite => (
              <tr key={invite.code} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 12 }}>
                  <code style={{ fontWeight: "bold" }}>{invite.code}</code>
                  {invite.description && <div style={{ fontSize: 11, color: "#666" }}>{invite.description}</div>}
                </td>
                <td style={{ padding: 12 }}>
                  <span style={{ color: invite.usedJobs >= invite.maxJobs ? "#dc3545" : "inherit" }}>
                    {invite.usedJobs} / {invite.maxJobs}
                  </span>
                </td>
                <td style={{ padding: 12 }}>{invite.dailyLimit} / day</td>
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
                  {invite.isActive && (
                    <button 
                      onClick={() => handleDeactivate(invite.code)}
                      style={{ padding: "4px 8px", background: "#fff", border: "1px solid #dc3545", color: "#dc3545", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
