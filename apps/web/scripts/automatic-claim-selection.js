const TERMINAL_DRAFT_STATUSES = new Set(["FAILED", "CANCELLED", "EXPIRED"]);
const TERMINAL_JOB_STATUSES = new Set(["SUCCEEDED", "FAILED", "CANCELLED", "INTERRUPTED"]);
const SUBMISSION_PATH_ACS_AUTOMATIC_DRAFT = "acs-automatic-draft";

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

function trimTrailingSlash(value) {
  return String(value || "").replace(/\/+$/, "");
}

function normalizeStatus(value) {
  return String(value || "").toUpperCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const detail = payload?.error || payload?.message || text || response.statusText;
    throw new Error(`Request failed: HTTP ${response.status}: ${detail}`);
  }

  return payload;
}

function hasAdminSelectionMetadata(job) {
  return (
    typeof job?.preparedStage1Json === "string" &&
    job.preparedStage1Json.length > 0 &&
    typeof job?.claimSelectionJson === "string" &&
    job.claimSelectionJson.length > 0
  );
}

function parseJsonValue(value, fieldName, metadataIssues) {
  if (value == null || value === "") {
    metadataIssues.push(`${fieldName} missing`);
    return null;
  }
  if (typeof value === "object") {
    return value;
  }
  if (typeof value !== "string") {
    metadataIssues.push(`${fieldName} is not JSON text`);
    return null;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    metadataIssues.push(`${fieldName} parse failed: ${error.message}`);
    return null;
  }
}

function parseResultJson(value) {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function getResultJsonIssue(value) {
  if (value == null || value === "") return "resultJson missing";
  if (typeof value === "object") return null;
  if (typeof value !== "string") return "resultJson is not JSON text";
  try {
    JSON.parse(value);
    return null;
  } catch (error) {
    return `resultJson parse failed: ${error.message}`;
  }
}

function getStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string" && item.length > 0);
}

function summarizeBudgetTreatments(assessments) {
  const counts = {};
  const byClaimId = {};

  if (!Array.isArray(assessments)) {
    return { counts, byClaimId };
  }

  for (const assessment of assessments) {
    const claimId = typeof assessment?.claimId === "string" ? assessment.claimId : null;
    const treatment =
      typeof assessment?.budgetTreatment === "string" ? assessment.budgetTreatment : null;
    if (!claimId || !treatment) continue;

    counts[treatment] = (counts[treatment] || 0) + 1;
    byClaimId[claimId] = {
      budgetTreatment: treatment,
      budgetTreatmentRationale:
        typeof assessment?.budgetTreatmentRationale === "string"
          ? assessment.budgetTreatmentRationale
          : null,
    };
  }

  return { counts, byClaimId };
}

function getSelectedClaimResearchCoverage(acsResearchWaste) {
  return Array.isArray(acsResearchWaste?.selectedClaimResearchCoverage)
    ? acsResearchWaste.selectedClaimResearchCoverage
    : null;
}

function getZeroTargetedSelectedClaimIds(acsResearchWaste) {
  const coverage = getSelectedClaimResearchCoverage(acsResearchWaste);
  if (coverage) {
    return coverage
      .filter((entry) =>
        entry?.zeroTargetedMainResearch === true ||
        entry?.targetedMainIterations === 0
      )
      .map((entry) => entry?.claimId)
      .filter((claimId) => typeof claimId === "string" && claimId.length > 0);
  }

  if (!Array.isArray(acsResearchWaste?.selectedClaimResearch)) {
    return [];
  }

  return acsResearchWaste.selectedClaimResearch
    .filter((entry) => entry?.iterations === 0)
    .map((entry) => entry?.claimId)
    .filter((claimId) => typeof claimId === "string" && claimId.length > 0);
}

function stableDifference(left, right) {
  const rightSet = new Set(right);
  return left.filter((item) => !rightSet.has(item));
}

function getPreparedClaims(preparedStage1) {
  const claims = preparedStage1?.preparedUnderstanding?.atomicClaims;
  return Array.isArray(claims) ? claims : [];
}

function getPreparedClaimIds(preparedStage1) {
  return getPreparedClaims(preparedStage1)
    .map((claim) => claim?.id)
    .filter((id) => typeof id === "string" && id.length > 0);
}

function summarizeWarnings(warnings) {
  const items = Array.isArray(warnings) ? warnings : [];
  const byType = {};
  const bySeverity = {};

  for (const warning of items) {
    const type = typeof warning?.type === "string" ? warning.type : "unknown";
    const severity = typeof warning?.severity === "string" ? warning.severity : "unknown";
    byType[type] = (byType[type] || 0) + 1;
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
  }

  return {
    total: items.length,
    byType,
    bySeverity,
    items,
  };
}

function buildClaimSummaries(result, preparedStage1) {
  const preparedById = new Map(
    getPreparedClaims(preparedStage1)
      .filter((claim) => typeof claim?.id === "string" && claim.id.length > 0)
      .map((claim) => [claim.id, claim]),
  );
  const claimVerdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];

  return claimVerdicts.map((claimVerdict) => {
    const preparedClaim = preparedById.get(claimVerdict?.claimId);
    return {
      claimId: claimVerdict?.claimId,
      statement:
        preparedClaim?.claim ||
        preparedClaim?.text ||
        preparedClaim?.statement ||
        claimVerdict?.claimId ||
        null,
      truthPercentage: claimVerdict?.truthPercentage ?? null,
      verdict: claimVerdict?.verdict ?? null,
      confidence: claimVerdict?.confidence ?? null,
      confidenceTier: claimVerdict?.confidenceTier ?? null,
    };
  });
}

function normalizeHistoricalDirectReference(reference) {
  if (!reference || typeof reference !== "object") return null;

  const jobId = typeof reference.jobId === "string" && reference.jobId.length > 0
    ? reference.jobId
    : null;
  if (!jobId) return null;

  return {
    jobId,
    submissionPath:
      typeof reference.submissionPath === "string" && reference.submissionPath.length > 0
        ? reference.submissionPath
        : "direct-api-historical",
    referenceQuality:
      typeof reference.referenceQuality === "string" && reference.referenceQuality.length > 0
        ? reference.referenceQuality
        : "unknown",
    status: typeof reference.status === "string" ? reference.status : null,
    verdict: typeof reference.verdict === "string" ? reference.verdict : null,
    truthPercentage:
      typeof reference.truthPercentage === "number" ? reference.truthPercentage : null,
    confidence: typeof reference.confidence === "number" ? reference.confidence : null,
    createdUtc: typeof reference.createdUtc === "string" ? reference.createdUtc : null,
    gitCommitHash: typeof reference.gitCommitHash === "string" ? reference.gitCommitHash : null,
    executedWebGitCommitHash:
      typeof reference.executedWebGitCommitHash === "string"
        ? reference.executedWebGitCommitHash
        : null,
    promptContentHash:
      typeof reference.promptContentHash === "string" ? reference.promptContentHash : null,
    notes: typeof reference.notes === "string" ? reference.notes : null,
  };
}

function extractValidationSummary({
  family,
  job,
  draftId,
  draftStatus,
  jobStatus,
  submissionPath = SUBMISSION_PATH_ACS_AUTOMATIC_DRAFT,
  metadataUnavailable = false,
  metadataUnavailableReason = null,
} = {}) {
  const metadataIssues = [];
  const preparedStage1 = parseJsonValue(job?.preparedStage1Json, "PreparedStage1Json", metadataIssues);
  const claimSelection = parseJsonValue(job?.claimSelectionJson, "ClaimSelectionJson", metadataIssues);
  const result = parseResultJson(job?.resultJson);

  const effectiveSubmissionPath =
    typeof job?.submissionPath === "string" && job.submissionPath.length > 0
      ? job.submissionPath
      : submissionPath;
  const preparedClaimIds = getPreparedClaimIds(preparedStage1);
  const rankedClaimIds = getStringArray(claimSelection?.rankedClaimIds);
  const recommendedClaimIds = getStringArray(claimSelection?.recommendedClaimIds);
  const selectedClaimIds = getStringArray(claimSelection?.selectedClaimIds);
  const deferredClaimIds = getStringArray(claimSelection?.deferredClaimIds);
  const notRecommendedClaimIds = stableDifference(rankedClaimIds, recommendedClaimIds);
  const notSelectedClaimIds = stableDifference(preparedClaimIds, selectedClaimIds);
  const claimVerdicts = Array.isArray(result?.claimVerdicts) ? result.claimVerdicts : [];
  const claimBoundaries = Array.isArray(result?.claimBoundaries) ? result.claimBoundaries : [];
  const evidenceItems = Array.isArray(result?.evidenceItems) ? result.evidenceItems : [];
  const sources = Array.isArray(result?.sources) ? result.sources : [];
  const acsResearchWaste = result?.analysisObservability?.acsResearchWaste;
  const budgetTreatmentSummary = summarizeBudgetTreatments(claimSelection?.assessments);
  const selectedClaimResearchCoverage = getSelectedClaimResearchCoverage(acsResearchWaste);
  const zeroTargetedSelectedClaimIds = getZeroTargetedSelectedClaimIds(acsResearchWaste);
  const preparedProvenance = preparedStage1?.preparationProvenance || null;
  const createdGitCommitHash =
    job?.createdGitCommitHash ||
    job?.gitCommitHash ||
    result?.meta?.gitCommitHash ||
    null;
  const executedWebGitCommitHash =
    job?.executedWebGitCommitHash ||
    result?.meta?.executedWebGitCommitHash ||
    preparedProvenance?.executedWebGitCommitHash ||
    null;
  const promptContentHash =
    job?.promptContentHash ||
    result?.meta?.promptContentHash ||
    preparedProvenance?.promptContentHash ||
    null;
  const historicalDirectReference = normalizeHistoricalDirectReference(
    family?.historicalDirectReference,
  );
  const computedMetadataUnavailable = metadataUnavailable || metadataIssues.length > 0;
  const computedMetadataUnavailableReason = [
    metadataUnavailableReason,
    ...metadataIssues,
  ]
    .filter(Boolean)
    .join("; ") || null;

  return {
    schemaVersion: "2.0.0",
    submissionPath: effectiveSubmissionPath,
    draftId: draftId || job?.claimSelectionDraftId || null,
    jobId: job?.jobId || job?.id || null,
    claimSelectionDraftId: job?.claimSelectionDraftId || draftId || null,
    draftStatus: draftStatus || null,
    jobStatus: jobStatus || normalizeStatus(job?.status) || null,
    gitCommitHash:
      executedWebGitCommitHash ||
      createdGitCommitHash ||
      null,
    createdGitCommitHash,
    executedWebGitCommitHash,
    promptContentHash,
    analysisRunProvenance: {
      version: 1,
      submissionPath: effectiveSubmissionPath,
      draftId: draftId || job?.claimSelectionDraftId || null,
      jobId: job?.jobId || job?.id || null,
      claimSelectionDraftId: job?.claimSelectionDraftId || draftId || null,
      createdGitCommitHash,
      executedWebGitCommitHash,
      promptContentHash,
      preparedStage1: preparedProvenance
        ? {
            pipelineVariant: preparedProvenance.pipelineVariant || null,
            sourceInputType: preparedProvenance.sourceInputType || null,
            resolvedInputSha256: preparedProvenance.resolvedInputSha256 || null,
            promptContentHash: preparedProvenance.promptContentHash || null,
            pipelineConfigHash: preparedProvenance.pipelineConfigHash || null,
            searchConfigHash: preparedProvenance.searchConfigHash || null,
            calcConfigHash: preparedProvenance.calcConfigHash || null,
            selectionCap:
              typeof preparedProvenance.selectionCap === "number"
                ? preparedProvenance.selectionCap
                : null,
            executedWebGitCommitHash:
              preparedProvenance.executedWebGitCommitHash || null,
          }
        : null,
    },
    metadataUnavailable: computedMetadataUnavailable,
    metadataUnavailableReason: computedMetadataUnavailableReason,
    preparedClaimCount: preparedClaimIds.length,
    preparedClaimIds,
    rankedClaimCount: rankedClaimIds.length,
    rankedClaimIds,
    recommendedClaimCount: recommendedClaimIds.length,
    recommendedClaimIds,
    selectedClaimCount: selectedClaimIds.length,
    selectedClaimIds,
    notRecommendedClaimCount: notRecommendedClaimIds.length,
    notRecommendedClaimIds,
    notSelectedClaimCount: notSelectedClaimIds.length,
    notSelectedClaimIds,
    deferredClaimCount: deferredClaimIds.length,
    deferredClaimIds,
    budgetFitRationale:
      typeof claimSelection?.budgetFitRationale === "string"
        ? claimSelection.budgetFitRationale
        : null,
    budgetTreatmentCounts: budgetTreatmentSummary.counts,
    budgetTreatmentByClaimId: budgetTreatmentSummary.byClaimId,
    claimSelectionCap:
      typeof claimSelection?.selectionCap === "number" ? claimSelection.selectionCap : null,
    claimSelectionAdmissionCap:
      typeof claimSelection?.selectionAdmissionCap === "number"
        ? claimSelection.selectionAdmissionCap
        : null,
    truthPercentage: typeof result?.truthPercentage === "number" ? result.truthPercentage : null,
    verdict: result?.verdict || null,
    confidence: typeof result?.confidence === "number" ? result.confidence : null,
    claimVerdictCount: claimVerdicts.length,
    claimBoundaryCount: claimBoundaries.length,
    evidenceCount: evidenceItems.length,
    sourceCount: sources.length,
    warnings: summarizeWarnings(result?.analysisWarnings),
    selectedClaimResearchCoverage,
    selectedClaimResearch: acsResearchWaste?.selectedClaimResearch || null,
    zeroTargetedSelectedClaimCount: zeroTargetedSelectedClaimIds.length,
    zeroTargetedSelectedClaimIds,
    contradictionReachability: acsResearchWaste?.contradictionReachability || null,
    historicalDirectReference,
    historicalDirectReferenceJobId: historicalDirectReference?.jobId || null,
    historicalDirectReferenceQuality: historicalDirectReference
      ? historicalDirectReference.referenceQuality
      : "missing",
    historicalDirectReferenceJobStatus: historicalDirectReference?.status || "missing",
    claimSummaries: buildClaimSummaries(result, preparedStage1),
    family: family
      ? {
          familyName: family.familyName || family.id || null,
          inputType: family.inputType || null,
          inputValue: family.inputValue || family.text || null,
        }
      : null,
  };
}

async function createAutomaticClaimSelectionDraft({
  apiUrl,
  inputType,
  inputValue,
  inviteCode = process.env.FH_INVITE_CODE,
  adminKey = process.env.FH_ADMIN_KEY,
}) {
  const normalizedApiUrl = trimTrailingSlash(apiUrl);
  const payload = await fetchJson(`${normalizedApiUrl}/api/fh/claim-selection-drafts`, {
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

  const draftId = payload?.draftId;
  if (typeof draftId !== "string" || draftId.length === 0) {
    throw new Error("Draft creation response did not include draftId");
  }

  return {
    ...payload,
    draftId,
    draftAccessToken:
      typeof payload?.draftAccessToken === "string" ? payload.draftAccessToken : undefined,
  };
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
  const draft = await createAutomaticClaimSelectionDraft({
    apiUrl,
    inputType,
    inputValue,
    inviteCode,
    adminKey,
  });

  const finalJobId = await waitForAutomaticDraftJob({
    apiUrl,
    draftId: draft.draftId,
    draftAccessToken: draft.draftAccessToken,
    adminKey,
    timeoutMs,
    pollIntervalMs,
  });

  return { draftId: draft.draftId, jobId: finalJobId };
}

async function submitAutomaticValidationJob({
  apiUrl,
  inputType,
  inputValue,
  inviteCode = process.env.FH_INVITE_CODE,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
  waitForFinalJob = true,
  fetchFinalJob = true,
  family,
}) {
  const draft = await createAutomaticClaimSelectionDraft({
    apiUrl,
    inputType,
    inputValue,
    inviteCode,
    adminKey,
  });

  const draftOutcome = await waitForAutomaticDraftOutcome({
    apiUrl,
    draftId: draft.draftId,
    draftAccessToken: draft.draftAccessToken,
    adminKey,
    timeoutMs,
    pollIntervalMs,
  });

  if (!draftOutcome.ok) {
    return {
      submissionPath: SUBMISSION_PATH_ACS_AUTOMATIC_DRAFT,
      draftId: draft.draftId,
      draftStatus: draftOutcome.draftStatus,
      status: draftOutcome.status,
      ok: false,
      terminal: draftOutcome.terminal,
      message: draftOutcome.message,
      metadataUnavailable: true,
      metadataUnavailableReason: "final job was not created",
      draft: draftOutcome.draft,
    };
  }

  let jobOutcome = null;
  let job = null;
  let metadataUnavailable = false;
  let metadataUnavailableReason = null;
  let resultUnavailableReason = null;

  if (waitForFinalJob) {
    jobOutcome = await waitForJobOutcome({
      apiUrl,
      jobId: draftOutcome.jobId,
      adminKey,
      timeoutMs,
      pollIntervalMs,
    });
    job = jobOutcome.job;
  } else if (fetchFinalJob) {
    try {
      job = await fetchJobDetail({ apiUrl, jobId: draftOutcome.jobId, adminKey });
    } catch (error) {
      metadataUnavailable = true;
      metadataUnavailableReason = `job detail fetch failed: ${error.message}`;
    }
  } else {
    metadataUnavailable = true;
    metadataUnavailableReason = "final job detail fetch disabled";
  }

  if (job && !hasAdminSelectionMetadata(job)) {
    metadataUnavailable = true;
    metadataUnavailableReason = "admin selection metadata missing from final job detail";
  }
  const resolvedJobStatus = jobOutcome?.jobStatus || normalizeStatus(job?.status);
  let status = jobOutcome?.status || resolvedJobStatus || draftOutcome.status;
  let ok = false;

  if (!job) {
    status = status || "JOB_DETAIL_UNAVAILABLE";
  } else if (resolvedJobStatus !== "SUCCEEDED") {
    status = resolvedJobStatus || status || "JOB_NOT_TERMINAL";
  } else {
    resultUnavailableReason = getResultJsonIssue(job.resultJson);
    if (resultUnavailableReason) {
      status = "RESULT_UNAVAILABLE";
    } else {
      ok = true;
    }
  }

  const summary = job
    && ok
    ? extractValidationSummary({
        job,
        draftId: draft.draftId,
        draftStatus: draftOutcome.draftStatus,
        jobStatus: resolvedJobStatus,
        metadataUnavailable,
        metadataUnavailableReason,
        family,
      })
    : null;

  return {
    submissionPath: SUBMISSION_PATH_ACS_AUTOMATIC_DRAFT,
    draftId: draft.draftId,
    jobId: draftOutcome.jobId,
    draftStatus: draftOutcome.draftStatus,
    jobStatus: resolvedJobStatus,
    status,
    ok,
    terminal: jobOutcome?.terminal || draftOutcome.terminal,
    metadataUnavailable,
    metadataUnavailableReason,
    resultUnavailable: Boolean(resultUnavailableReason),
    resultUnavailableReason,
    draft: draftOutcome.draft,
    job,
    summary,
  };
}

async function waitForAutomaticDraftOutcome({
  apiUrl,
  draftId,
  draftAccessToken,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
}) {
  const normalizedApiUrl = trimTrailingSlash(apiUrl);
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const draft = await fetchJson(`${normalizedApiUrl}/api/fh/claim-selection-drafts/${draftId}`, {
      headers: buildAuthHeaders({ adminKey, draftAccessToken }),
    });

    const draftStatus = normalizeStatus(draft?.status);
    if (typeof draft?.finalJobId === "string" && draft.finalJobId.length > 0) {
      return {
        ok: true,
        terminal: true,
        status: "FINAL_JOB_CREATED",
        draftStatus,
        draftId,
        jobId: draft.finalJobId,
        draft,
      };
    }

    if (TERMINAL_DRAFT_STATUSES.has(draftStatus)) {
      return {
        ok: false,
        terminal: true,
        status: draftStatus,
        draftStatus,
        draftId,
        message: `Automatic draft ${draftId} ended in ${draftStatus}`,
        draft,
      };
    }
    if (draftStatus === "AWAITING_CLAIM_SELECTION") {
      return {
        ok: false,
        terminal: true,
        status: "AWAITING_CLAIM_SELECTION",
        draftStatus,
        draftId,
        message: `Automatic draft ${draftId} is awaiting manual selection`,
        draft,
      };
    }

    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    terminal: true,
    status: "TIMED_OUT",
    draftStatus: "TIMED_OUT",
    draftId,
    message: `Automatic draft ${draftId} timed out`,
  };
}

async function waitForAutomaticDraftJob({
  apiUrl,
  draftId,
  draftAccessToken,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
}) {
  const outcome = await waitForAutomaticDraftOutcome({
    apiUrl,
    draftId,
    draftAccessToken,
    adminKey,
    timeoutMs,
    pollIntervalMs,
  });

  if (outcome.ok && outcome.jobId) {
    return outcome.jobId;
  }

  throw new Error(outcome.message || `Automatic draft ${draftId} failed with ${outcome.status}`);
}

async function fetchJobDetail({ apiUrl, jobId, adminKey = process.env.FH_ADMIN_KEY }) {
  const normalizedApiUrl = trimTrailingSlash(apiUrl);
  return fetchJson(`${normalizedApiUrl}/api/fh/jobs/${jobId}`, {
    headers: buildAuthHeaders({ adminKey }),
  });
}

async function waitForJobOutcome({
  apiUrl,
  jobId,
  adminKey = process.env.FH_ADMIN_KEY,
  timeoutMs = 900000,
  pollIntervalMs = 2000,
}) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const job = await fetchJobDetail({ apiUrl, jobId, adminKey });
    const jobStatus = normalizeStatus(job?.status);

    if (TERMINAL_JOB_STATUSES.has(jobStatus)) {
      return {
        ok: jobStatus === "SUCCEEDED",
        terminal: true,
        status: jobStatus,
        jobStatus,
        jobId,
        job,
      };
    }

    await sleep(pollIntervalMs);
  }

  return {
    ok: false,
    terminal: true,
    status: "TIMED_OUT",
    jobStatus: "TIMED_OUT",
    jobId,
    message: `Job ${jobId} timed out`,
  };
}

module.exports = {
  SUBMISSION_PATH_ACS_AUTOMATIC_DRAFT,
  buildAuthHeaders,
  createAutomaticClaimSelectionDraft,
  extractValidationSummary,
  fetchJobDetail,
  hasAdminSelectionMetadata,
  normalizeHistoricalDirectReference,
  submitAutomaticDraftAndWaitForJob,
  submitAutomaticValidationJob,
  waitForAutomaticDraftJob,
  waitForAutomaticDraftOutcome,
  waitForJobOutcome,
};
