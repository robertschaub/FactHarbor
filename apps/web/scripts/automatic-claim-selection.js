const TERMINAL_DRAFT_STATUSES = new Set(["FAILED", "CANCELLED", "EXPIRED"]);

function buildAuthHeaders({ adminKey, draftAccessToken } = {}) {
  const headers = {};
  if (adminKey) {
    headers["x-admin-key"] = adminKey;
  }
  if (draftAccessToken) {
    headers["x-draft-token"] = draftAccessToken;
  }
  return headers;
}

async function submitAutomaticDraftAndWaitForJob({
  apiUrl,
  inputType,
  inputValue,
  inviteCode = process.env.FH_INVITE_CODE,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
}) {
  const response = await fetch(`${apiUrl}/api/fh/claim-selection-drafts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...buildAuthHeaders({ adminKey }),
    },
    body: JSON.stringify({
      inputType,
      inputValue,
      selectionMode: "automatic",
      inviteCode: inviteCode || undefined,
    }),
  });

  if (!response.ok) {
    throw new Error(`Draft creation failed: HTTP ${response.status}: ${response.statusText}`);
  }

  const payload = await response.json();
  const draftId = payload?.draftId;
  const draftAccessToken = payload?.draftAccessToken;
  if (typeof draftId !== "string" || draftId.length === 0) {
    throw new Error("Draft creation response did not include draftId");
  }

  const finalJobId = await waitForAutomaticDraftJob({
    apiUrl,
    draftId,
    draftAccessToken: typeof draftAccessToken === "string" ? draftAccessToken : undefined,
    adminKey,
    timeoutMs,
    pollIntervalMs,
  });

  return { draftId, jobId: finalJobId };
}

async function waitForAutomaticDraftJob({
  apiUrl,
  draftId,
  draftAccessToken,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
}) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const response = await fetch(`${apiUrl}/api/fh/claim-selection-drafts/${draftId}`, {
      headers: buildAuthHeaders({ adminKey, draftAccessToken }),
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch draft ${draftId}: HTTP ${response.status}: ${response.statusText}`);
    }

    const draft = await response.json();
    if (typeof draft?.finalJobId === "string" && draft.finalJobId.length > 0) {
      return draft.finalJobId;
    }

    const status = String(draft?.status || "").toUpperCase();
    if (TERMINAL_DRAFT_STATUSES.has(status)) {
      throw new Error(`Automatic draft ${draftId} ended in ${status}`);
    }
    if (status === "AWAITING_CLAIM_SELECTION") {
      throw new Error(`Automatic draft ${draftId} is awaiting manual selection`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Automatic draft ${draftId} timed out`);
}

module.exports = {
  submitAutomaticDraftAndWaitForJob,
  waitForAutomaticDraftJob,
};
