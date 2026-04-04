# Live Validation Hygiene

Short procedure for interpreting localhost job runs correctly after code changes,
UCM config changes, prompt reseeds, and other live experiment steps.

Use this whenever a conclusion depends on results from `localhost:3000`,
`localhost:5000`, or any local worktree lane.

---

## Purpose

This procedure prevents false conclusions caused by mixing:
- code changes that were not actually live yet
- jobs that started before a config/prompt change took effect
- run variance that is mistakenly attributed to a mechanism that never fired

---

## 1. Classify the Change First

Before interpreting any live run, decide which category the change belongs to:

1. **Code change**
   - TypeScript / C# / runtime behavior changed on disk
2. **Prompt change**
   - prompt file reseeded or active prompt version switched in UCM
3. **UCM config change**
   - active pipeline/search/calculation config changed
4. **No system change**
   - pure repeat run for variance measurement

Do not treat these as equivalent. They have different restart and provenance needs.

---

## 2. Restart Rules

### Automated tests and builds

These run against code on disk and do **not** require an app restart:
- `npm test`
- `npm -w apps/web run build`
- `dotnet build`

### Prompt reseeds and UCM config activation

These normally do **not** require a restart for **new jobs**.

Reason:
- active config/prompt switches go through UCM activation
- activation invalidates the config-loader cache
- new analysis runs then load the new active config/prompt

Still required:
- only interpret jobs **created after** the activation/reseed
- do not use jobs already in progress as clean A/B evidence

### Web code changes

Most analysis behavior lives in `apps/web`.

After changing analysis code, restart the **web app** or otherwise confirm the new
code is definitely live before interpreting localhost job results.

Examples:
- `apps/web/src/lib/analyzer/*`
- `apps/web/src/lib/config-loader.ts`
- `apps/web/src/app/api/internal/run-job/route.ts`

### API code changes

After changing API behavior, restart the **API app** before interpreting new jobs.

Examples:
- job creation / job metadata
- admin endpoints
- job list/detail responses

Important:
- `GitCommitHash` on new jobs is now resolved when the job row is created
- this means fresh local commits can appear on newly created jobs without an API restart
- this does **not** mean API runtime code changes are live without restart; it only affects provenance stamping

---

## 3. What the Job Git Hash Proves

The job `gitCommitHash` is a strong provenance aid, but not a perfect one.

It **does** help with:
- identifying which committed repo version the API associated with the job
- filtering jobs by the same committed baseline
- avoiding confusion between old committed states and new committed states

It does **not** prove:
- that uncommitted local changes were absent
- that a web-only code change was definitely live if the web app was not restarted
- that a job which started before a config/prompt change used the new settings

Rule:
- use `gitCommitHash` as a **commit-level provenance check**
- use restart timing and job start time as the **runtime activation check**

---

## 4. Clean A/B Requirements

A live experiment is only a clean comparison if all of the following are true:

1. The compared jobs started **after** the relevant change was activated.
2. The relevant service was restarted when the change type required it.
3. The compared jobs can be tied to the intended committed baseline.
4. The mechanism being tested actually **fired** during the run.

If any of these are false, label the result as:
- exploratory
- confounded
- or run-variance only

Do not present it as hard evidence.

---

## 5. Mechanism-Firing Check

Before attributing a quality change to a new mechanism, confirm that the mechanism
actually ran.

Examples:
- a supplementary retrieval pass must have fired
- a direction repair must have fired if the claim is that direction repair helped
- a prompt retry path must have been taken if the claim is that the retry fixed the run

If the mechanism did **not** fire:
- any apparent improvement or degradation is **run variance**, not evidence of mechanism quality

This is mandatory for threshold-gated features.

---

## 6. Minimum Evidence to Record for Each Live Experiment

For each experiment batch, record at least:
- the exact change under test
- activation time or reseed time
- whether a web restart happened
- whether an API restart happened
- job IDs
- job creation times
- relevant UCM flag values
- the job `gitCommitHash` when available
- whether the tested mechanism fired

If config provenance UI/API is incomplete for a specific experiment, record the
activation timestamp manually in the handoff.

---

## 7. Practical Interpretation Rules

- Jobs already running during a prompt/config change are **not** valid post-change runs.
- Mid-run UI verdict/progress changes are not final evidence; use final job output only.
- If a feature is behind a flag, record both:
  - whether the flag was active
  - whether the feature actually triggered
- For code-change validation, a restart is safer than assuming hot reload.
- If there is any doubt, rerun a small control batch rather than over-interpreting one ambiguous job.

---

## 8. Recommended Default Workflow

For any non-trivial localhost quality experiment:

1. Apply the change.
2. Restart the relevant service(s) if the change touched runtime code.
3. Activate/reseed UCM or prompts if needed.
4. Start only fresh jobs after the change is definitely live.
5. Record job IDs, timestamps, flags, and commit hash.
6. Confirm the mechanism fired.
7. Only then interpret the quality outcome.

---

## 9. Current FactHarbor-Specific Notes

- Prompt/config activation is live because UCM activation invalidates loader cache.
- Analysis code changes still require normal runtime hygiene.
- `GitCommitHash` greatly improves provenance for committed states, but it is not a substitute for restart discipline in local development with uncommitted changes.
