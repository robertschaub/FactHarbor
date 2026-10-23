#!/usr/bin/env node
'use strict';

/*
 * invoke-gemini.cjs — call the local Antigravity CLI (agy) headlessly under the
 * maintainer's Google AI Pro subscription login, with a supplied review packet.
 * Never uses GEMINI_API_KEY, GOOGLE_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY.
 *
 * Procedure: Docs/AGENTS/Policies/Tool_Strengths.md — "Calling Gemini from Claude Code or Codex".
 *
 * Usage:
 *   node scripts/agents/invoke-gemini.cjs --model <slug> [--effort low|medium|high|xhigh|max]
 *        [--packet <file> | --prompt <text>] [--system <text>]
 *        [--evidence-dir <dir>] [--label <name>] [--timeout <duration>]
 *        [--repo] [--add-dir <dir>] [--no-preamble] [--quiet]
 *
 *   --model is required (e.g. gemini-4-argon-high or gemini-4-argon-low):
 *   honor the user's choice or select a suitable model under the agent rules.
 *   The packet comes from --packet, --prompt, or stdin.
 *   Profile "packet" (default): fresh empty temporary working directory outside any checkout,
 *   plan mode, review-only preamble, and post-run verification that zero tool steps occurred.
 *   --repo selects profile "repo-read-only": repository root as working directory, plan mode,
 *   optional --add-dir <dir> for authorized peer roots, and verification of no mutating steps.
 *   Every run creates a fresh directory under --evidence-dir (default <temp>/gemini-reviews);
 *   a location inside a checkout must be gitignored.
 *
 * Environment:
 *   FH_AGY_BIN=<path>            use exactly this executable (alias: FH_GEMINI_BIN); stops if unusable
 *   FH_INVOKE_GEMINI_DRY_RUN=1   resolve the executable (runs `--version` and `--help` only),
 *                                print the plan as JSON and exit: no model request
 *
 * Exit codes: 0 ok · 1 usage/setup · 2 subscription/auth or quota failure · 3 Gemini failed or verification mismatch
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const EXIT = { OK: 0, USAGE: 1, AUTH: 2, RUN: 3 };
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
const STRIPPED_ENV = /^(GEMINI_API_KEY|GOOGLE_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY|GOOGLE_APPLICATION_CREDENTIALS|GOOGLE_GENAI_USE_VERTEXAI|GOOGLE_GENAI_USE_GCA|CLOUD_ML_REGION|GOOGLE_CLOUD_PROJECT)$/i;
const REQUIRED_HELP_FLAGS = ['--input-format', '--output-format', '--mode', '--model', '--effort', '--print-timeout'];
const MUTATING_STEP_TYPES = /^(write|edit|replace|multi_replace|sed|delete|run_command|notebook_edit| notebook_execution|invoke_subagent|define_subagent)/i;
const AUTH_OR_QUOTA_ERROR = /not signed in|authentication required|authentication consent could not be obtained|oauth.*fail|login required|unauthenticated|quota exceeded|usage limit|rate[ -]?limit|resource_exhausted/i;
const MAX_CAPTURE_BYTES = 64 * 1024 * 1024;
const FILE_MODE = 0o600;

const PACKET_PREAMBLE =
  'Review only the supplied packet below. You have no execution or spending authority: ' +
  'do not run commands, read files, browse, invoke subagents, or fetch anything. ' +
  'Distinguish inspected evidence from attributed claims.\n\n';
const REPO_PREAMBLE =
  'Read-only review of this working directory. Do not modify files, run builds or tests, invoke subagents, or use the network. ' +
  'Distinguish inspected evidence from attributed claims.\n\n';

class UsageError extends Error {}
class AuthError extends Error {}
class RunError extends Error {}

// Optional deterministic redaction helper when present alongside this script (our-ai-charter, Grove).
let redact = (text) => text;
const redactPath = path.join(__dirname, 'redact.cjs');
if (fs.existsSync(redactPath)) {
  try {
    const loaded = require(redactPath);
    if (typeof loaded.redact === 'function') redact = loaded.redact;
  } catch (_) {
    // Keep identity fallback if optional redactor cannot load.
  }
}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const BOOLEAN_FLAGS = new Set(['--repo', '--no-preamble', '--quiet', '--help', '-h']);
const VALUE_FLAGS = {
  '--model': 'model',
  '-m': 'model',
  '--effort': 'effort',
  '--packet': 'packet',
  '--prompt': 'prompt',
  '--system': 'system',
  '--evidence-dir': 'evidenceDir',
  '--label': 'label',
  '--timeout': 'timeout',
  '--add-dir': 'addDir',
};

function usage() {
  const header = fs.readFileSync(__filename, 'utf8').match(/\/\*\r?\n([\s\S]*?)\r?\n \*\//);
  return header ? header[1].split(/\r?\n/).map((line) => line.replace(/^ \* ?/, '')).join('\n') : 'See the file header for usage.';
}

function parseArgs(argv) {
  const args = {
    model: null,
    effort: null,
    packet: null,
    prompt: null,
    system: null,
    evidenceDir: null,
    label: 'review',
    timeout: '15m',
    repo: false,
    addDirs: [],
    preamble: true,
    quiet: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const raw = argv[i];
    const eq = raw.startsWith('--') ? raw.indexOf('=') : -1;
    const flag = eq > 0 ? raw.slice(0, eq) : raw;
    const inline = eq > 0 ? raw.slice(eq + 1) : null;
    if (BOOLEAN_FLAGS.has(flag)) {
      if (inline !== null) throw new UsageError(`${flag} takes no value.`);
      if (flag === '--repo') args.repo = true;
      else if (flag === '--no-preamble') args.preamble = false;
      else if (flag === '--quiet') args.quiet = true;
      else args.help = true;
      continue;
    }
    const key = VALUE_FLAGS[flag];
    if (!key) throw new UsageError(`Unknown argument: ${raw}`);
    let value = inline;
    if (value === null) {
      if (i + 1 >= argv.length) throw new UsageError(`${flag} needs a value.`);
      i += 1;
      value = argv[i];
    }
    if (!value.trim()) throw new UsageError(`${flag} needs a non-empty value.`);
    if (key === 'addDir') args.addDirs.push(path.resolve(value.trim()));
    else args[key] = value.trim();
  }
  if (args.help) return args;
  if (!args.model) {
    throw new UsageError(
      '--model is required (e.g. gemini-4-argon-high or gemini-4-argon-low). ' +
      'Honor the user\'s choice or select a suitable model under the agent rules.',
    );
  }
  if (args.effort && !EFFORTS.includes(args.effort)) {
    throw new UsageError(`--effort must be one of ${EFFORTS.join(', ')}.`);
  }
  if (args.packet && args.prompt) {
    throw new UsageError('Pass either --packet <file> or --prompt <text>, not both.');
  }
  if (args.addDirs.length > 0 && !args.repo) {
    throw new UsageError('--add-dir requires --repo (packet profile runs in an isolated empty directory).');
  }
  args.label = args.label.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 40) || 'review';
  return args;
}

// ---------------------------------------------------------------------------
// Locations, environment, executable
// ---------------------------------------------------------------------------

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (
      fs.existsSync(path.join(current, 'AGENTS.md')) &&
      (fs.existsSync(path.join(current, '.git')) || fs.existsSync(path.join(current, 'CLAUDE.md')))
    ) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new UsageError('Could not locate a repository root (AGENTS.md) above the current directory.');
    current = parent;
  }
}

function isGroveRepo(repoRoot) {
  return path.basename(repoRoot).toLowerCase() === 'grove' || fs.existsSync(path.join(repoRoot, 'COMPASS.md'));
}

function childEnvironment() {
  const env = {};
  const stripped = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (STRIPPED_ENV.test(key)) stripped.push(key);
    else env[key] = value;
  }
  return { env, stripped };
}

function pathHits() {
  const finder = process.platform === 'win32' ? ['where.exe', ['agy']] : ['which', ['-a', 'agy']];
  const result = spawnSync(finder[0], finder[1], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function candidateExecutables() {
  const exeName = process.platform === 'win32' ? 'agy.exe' : 'agy';
  const list = [];
  const geminiBin = path.join(os.homedir(), '.gemini', 'bin', exeName);
  list.push({ source: '~/.gemini/bin', file: geminiBin, prefixArgs: [], display: geminiBin });
  if (process.env.LOCALAPPDATA) {
    const localAgy = path.join(process.env.LOCALAPPDATA, 'agy', 'bin', exeName);
    list.push({ source: 'LOCALAPPDATA agy bin', file: localAgy, prefixArgs: [], display: localAgy });
  }
  const homeBin = path.join(os.homedir(), '.local', 'bin', exeName);
  list.push({ source: '~/.local/bin', file: homeBin, prefixArgs: [], display: homeBin });
  for (const hit of pathHits()) {
    list.push({ source: 'PATH', file: hit, prefixArgs: [], display: hit });
  }
  return list;
}

function probeExecutable(candidate, env) {
  const version = spawnSync(candidate.file, [...candidate.prefixArgs, '--version'], { encoding: 'utf8', env, windowsHide: true });
  if (version.error || version.status !== 0 || !(version.stdout || '').trim()) {
    return { ok: false, reason: version.error ? version.error.message : '--version failed' };
  }
  const help = spawnSync(candidate.file, [...candidate.prefixArgs, '--help'], { encoding: 'utf8', env, windowsHide: true });
  const text = `${help.stdout || ''}${help.stderr || ''}`;
  const missing = REQUIRED_HELP_FLAGS.filter((flag) => !text.includes(flag));
  if (help.status !== 0 || missing.length) {
    return { ok: false, reason: `--help lacks ${missing.join(', ') || 'output'}` };
  }
  return { ok: true, version: version.stdout.trim() };
}

function resolveExecutable(env) {
  const envBin = process.env.FH_AGY_BIN || process.env.FH_GEMINI_BIN;
  if (envBin) {
    const file = path.resolve(envBin);
    if (!fs.existsSync(file)) throw new UsageError(`FH_AGY_BIN points to a missing file: ${file}`);
    const candidate = { source: 'FH_AGY_BIN', file, prefixArgs: [], display: file };
    const probe = probeExecutable(candidate, env);
    if (!probe.ok) throw new UsageError(`FH_AGY_BIN is not usable (${probe.reason}): ${candidate.display}`);
    return { ...candidate, version: probe.version, tried: [] };
  }
  const seen = new Set();
  const tried = [];
  for (const candidate of candidateExecutables()) {
    const key = candidate.display.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!fs.existsSync(candidate.file)) {
      tried.push(`${candidate.source}: ${candidate.display} (missing)`);
      continue;
    }
    const probe = probeExecutable(candidate, env);
    if (!probe.ok) {
      tried.push(`${candidate.source}: ${candidate.display} (${probe.reason})`);
      continue;
    }
    return { ...candidate, version: probe.version, tried };
  }
  throw new UsageError(
    `No usable Antigravity CLI (agy) executable found. Tried:\n  ${tried.join('\n  ') || '(none)'}\n` +
    'Ensure Antigravity CLI is installed at %LOCALAPPDATA%\\agy\\bin\\agy.exe or set FH_AGY_BIN.',
  );
}

// ---------------------------------------------------------------------------
// Evidence & Packet
// ---------------------------------------------------------------------------

function existingAncestor(target) {
  let current = path.resolve(target);
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return current;
}

function requireIgnoredIfInCheckout(dirPath) {
  const top = spawnSync('git', ['-C', existingAncestor(dirPath), 'rev-parse', '--show-toplevel'], { encoding: 'utf8', windowsHide: true });
  if (top.error || top.status !== 0) return { insideCheckout: false };
  const toplevel = top.stdout.trim();
  const ignored = spawnSync('git', ['-C', toplevel, 'check-ignore', '-q', dirPath], { encoding: 'utf8', windowsHide: true });
  if (ignored.status !== 0) {
    throw new UsageError(`Evidence directory ${dirPath} lies inside the checkout ${toplevel} but is not gitignored; use an ignored location such as test-output/.`);
  }
  return { insideCheckout: true, toplevel };
}

function createRunDirectory(base, label, stamp) {
  fs.mkdirSync(base, { recursive: true });
  const runDir = path.join(base, `${stamp}-${label}-${crypto.randomBytes(3).toString('hex')}`);
  fs.mkdirSync(runDir, { recursive: false, mode: 0o700 });
  return runDir;
}

function writeEvidence(runDir, name, content) {
  fs.writeFileSync(path.join(runDir, name), content, { mode: FILE_MODE, flag: 'wx' });
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function readRawInput(args) {
  let body;
  if (args.packet) {
    body = fs.readFileSync(args.packet, 'utf8');
  } else if (args.prompt) {
    body = args.prompt;
  } else {
    if (process.stdin.isTTY) {
      throw new UsageError('No --packet or --prompt given and stdin is a TTY. Pipe the packet or pass --packet <file>.');
    }
    body = fs.readFileSync(0, 'utf8');
  }
  if (args.system) {
    body = `${args.system.trim()}\n\n${body}`;
  }
  return redact(body);
}

// ---------------------------------------------------------------------------
// Run, NDJSON stream parsing, verification
// ---------------------------------------------------------------------------

function buildAgyArgs(args) {
  // Note: do not pass --disable-slash-commands alongside --mode plan, because
  // agy 1.4.6 warns that --mode plan has no effect while slash command expansion is disabled.
  const list = [
    '--input-format', 'stream-json',
    '--output-format', 'stream-json',
    '--mode', 'plan',
    '--model', args.model,
  ];
  if (args.effort) list.push('--effort', args.effort);
  list.push('--print-timeout', args.timeout);
  for (const dir of args.addDirs) {
    list.push('--add-dir', dir);
  }
  return list;
}

function runAgy(exe, agyArgs, packet, env, cwd, runDir) {
  return new Promise((resolve, reject) => {
    const streams = [
      fs.createWriteStream(path.join(runDir, 'stdout.ndjson'), { flags: 'wx', mode: FILE_MODE }),
      fs.createWriteStream(path.join(runDir, 'stderr.txt'), { flags: 'wx', mode: FILE_MODE }),
    ];
    const captured = { stdout: [], stderr: [], bytes: 0, truncated: false };
    let settled = false;
    let streamError = null;
    const settle = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const child = spawn(exe.file, [...exe.prefixArgs, ...agyArgs], { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stop = () => { try { child.kill(); } catch (_) { /* already gone */ } };
    for (const stream of streams) stream.on('error', (error) => { streamError = streamError || error; stop(); });
    const capture = (name, index) => (chunk) => {
      if (captured.bytes + chunk.length <= MAX_CAPTURE_BYTES) {
        captured[name].push(chunk);
        captured.bytes += chunk.length;
      } else {
        captured.truncated = true;
      }
      streams[index].write(chunk);
    };
    child.on('error', (error) => settle(reject, error));
    child.stdout.on('data', capture('stdout', 0));
    child.stderr.on('data', capture('stderr', 1));
    process.once('SIGINT', stop);
    process.once('SIGTERM', stop);
    child.on('close', (code, signal) => {
      process.removeListener('SIGINT', stop);
      process.removeListener('SIGTERM', stop);
      let pending = streams.length;
      const done = () => {
        if (--pending > 0) return;
        if (streamError) settle(reject, new RunError(`evidence stream failed: ${streamError.message}`));
        else {
          settle(resolve, {
            code,
            signal,
            stdout: Buffer.concat(captured.stdout).toString('utf8'),
            stderr: Buffer.concat(captured.stderr).toString('utf8'),
            truncated: captured.truncated,
          });
        }
      };
      for (const stream of streams) stream.end(done);
    });
    process.stderr.write(`invoke-gemini: started pid ${child.pid}; progress in ${path.join(runDir, 'stdout.ndjson')}\n`);
    child.stdin.on('error', () => { /* EPIPE if process exits early; exit code reports it */ });
    const payload = `${JSON.stringify({ event: 'user', message: { content: packet } })}\n`;
    child.stdin.end(payload);
  });
}

function parseNdjson(stdout) {
  const parsed = {
    conversationId: null,
    initModel: null,
    permissionMode: null,
    initCwd: null,
    resultStatus: null,
    resultResponse: null,
    streamedText: '',
    durationSeconds: null,
    numTurns: null,
    usage: null,
    deniedActions: [],
    toolSteps: [],
    mutatingToolSteps: [],
    parseErrors: 0,
  };
  const lines = stdout.split(/\r?\n/).filter((line) => line.trim().length > 0);
  for (const line of lines) {
    let eventObj;
    try {
      eventObj = JSON.parse(line);
    } catch (_) {
      parsed.parseErrors += 1;
      continue;
    }
    if (eventObj.event === 'init') {
      parsed.conversationId = eventObj.conversation_id || parsed.conversationId;
      if (eventObj.init) {
        parsed.initModel = eventObj.init.model || null;
        parsed.permissionMode = eventObj.init.permission_mode || null;
        parsed.initCwd = eventObj.init.cwd || null;
      }
    } else if (eventObj.event === 'step_update' && eventObj.step_update) {
      const step = eventObj.step_update;
      parsed.conversationId = step.conversation_id || parsed.conversationId;
      if (step.step_type === 'agent_response' && typeof step.text_delta === 'string') {
        parsed.streamedText += step.text_delta;
      }
      if (step.usage) parsed.usage = step.usage;
      if (step.step_type && !['user_input', 'agent_response', 'thinking'].includes(step.step_type)) {
        const entry = { index: step.step_index, type: step.step_type, state: step.state };
        parsed.toolSteps.push(entry);
        if (MUTATING_STEP_TYPES.test(step.step_type)) {
          parsed.mutatingToolSteps.push(entry);
        }
      }
    } else if (eventObj.event === 'result' && eventObj.result) {
      const res = eventObj.result;
      parsed.conversationId = res.conversation_id || parsed.conversationId;
      parsed.resultStatus = res.status || null;
      if (typeof res.response === 'string') parsed.resultResponse = res.response;
      if (res.duration_seconds !== undefined) parsed.durationSeconds = res.duration_seconds;
      if (res.num_turns !== undefined) parsed.numTurns = res.num_turns;
      if (res.usage) parsed.usage = res.usage;
      if (Array.isArray(res.denied_actions)) parsed.deniedActions = res.denied_actions;
    }
  }
  return parsed;
}

function verify(args, profile, run, parsed, lastMessage) {
  const checks = {
    exitCode: run.code === 0,
    outputCaptured: !run.truncated,
    initReceived: Boolean(parsed.initModel),
    model: parsed.initModel === args.model,
    resultStatus: parsed.resultStatus === 'SUCCESS',
    toolBoundary: profile === 'packet' ? parsed.toolSteps.length === 0 : parsed.mutatingToolSteps.length === 0,
    deniedActionsEmpty: parsed.deniedActions.length === 0,
    lastMessage: lastMessage.trim().length > 0,
  };
  const failed = Object.entries(checks).filter(([, value]) => value === false).map(([name]) => name);
  return { checks, failed };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return EXIT.OK;
  }

  const repoRoot = findRepoRoot(process.cwd());
  if (args.repo && isGroveRepo(repoRoot)) {
    throw new UsageError('Grove requires packet-only isolation outside the repository (--repo is not permitted here).');
  }

  const dryRun = process.env.FH_INVOKE_GEMINI_DRY_RUN === '1';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { env, stripped } = childEnvironment();
  const exe = resolveExecutable(env);
  const profile = args.repo ? 'repo-read-only' : 'packet';
  const evidenceBase = path.resolve(args.evidenceDir || path.join(os.tmpdir(), 'gemini-reviews'));
  const checkout = requireIgnoredIfInCheckout(evidenceBase);
  const workdir = args.repo ? repoRoot : '<fresh temporary directory>';
  const preamble = args.preamble ? (args.repo ? REPO_PREAMBLE : PACKET_PREAMBLE) : '';

  if (dryRun) {
    let packetSha256 = null;
    if (args.packet || args.prompt || !process.stdin.isTTY) {
      packetSha256 = sha256(preamble + readRawInput(args));
    }
    process.stdout.write(`${JSON.stringify({
      executable: exe.display,
      executableSource: exe.source,
      agyVersion: exe.version,
      rejectedCandidates: exe.tried,
      probesRun: ['--version', '--help'],
      profile,
      args: buildAgyArgs(args),
      workdir,
      evidenceBase,
      evidenceCheckout: checkout,
      strippedEnvKeys: stripped,
      preambleApplied: Boolean(preamble),
      packetSha256,
      authRoute: 'google-oauth-subscription (Antigravity CLI)',
      modelRequest: 'none (dry run)',
    }, null, 2)}\n`);
    return EXIT.OK;
  }

  const rawInput = readRawInput(args);
  if (!rawInput.trim()) throw new UsageError('The packet/prompt is empty.');
  const packet = preamble + rawInput;
  const runDir = createRunDirectory(evidenceBase, args.label, stamp);

  const packetSha256 = sha256(packet);
  writeEvidence(runDir, 'packet.md', packet);
  writeEvidence(runDir, 'packet.sha256', `${packetSha256}  packet.md\n`);

  const lastMessagePath = path.join(runDir, 'last-message.md');
  const tempWorkdir = args.repo ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'gemini-packet-'));
  const cwd = tempWorkdir || workdir;
  const agyArgs = buildAgyArgs(args);
  const startedAt = new Date();
  let run;
  try {
    writeEvidence(runDir, 'request.json', `${JSON.stringify({
      startedAt: startedAt.toISOString(),
      executable: exe.display,
      executableSource: exe.source,
      agyVersion: exe.version,
      profile,
      requested: {
        model: args.model,
        effort: args.effort,
        mode: 'plan',
        authRoute: 'google-oauth-subscription',
      },
      args: agyArgs,
      workdir: cwd,
      strippedEnvKeys: stripped,
      preambleApplied: Boolean(preamble),
      packetSha256,
    }, null, 2)}\n`);
    process.stderr.write(
      `invoke-gemini: agy ${exe.version} at ${exe.display}; Google subscription OAuth; ` +
      `model ${args.model}, effort ${args.effort || 'client default'}, profile ${profile}\n`,
    );
    run = await runAgy(exe, agyArgs, packet, env, cwd, runDir);
  } finally {
    if (tempWorkdir) {
      try {
        fs.rmSync(tempWorkdir, { recursive: true, force: true });
      } catch (error) {
        process.stderr.write(`invoke-gemini: could not remove ${tempWorkdir}: ${error.message}\n`);
      }
    }
  }

  const finishedAt = new Date();
  const parsed = parseNdjson(run.stdout);
  const lastMessage = (parsed.resultResponse != null ? parsed.resultResponse : parsed.streamedText) || '';
  if (lastMessage) {
    writeEvidence(runDir, 'last-message.md', lastMessage.endsWith('\n') ? lastMessage : `${lastMessage}\n`);
  }

  const combinedDiag = `${run.stderr || ''}\n${parsed.resultStatus || ''}`;
  if (run.code !== 0 && AUTH_OR_QUOTA_ERROR.test(combinedDiag)) {
    const authFailure = {
      ok: false,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      exitCode: run.code,
      stderr: (run.stderr || '').slice(-2000),
      runDir,
    };
    writeEvidence(runDir, 'result.json', `${JSON.stringify(authFailure, null, 2)}\n`);
    throw new AuthError(
      `Google subscription authentication or quota check failed (exit ${run.code}). ` +
      `Complete Google sign-in in Antigravity CLI (agy) or wait for quota reset; do not fall back to an API key. Evidence: ${runDir}`,
    );
  }

  const { checks, failed } = verify(args, profile, run, parsed, lastMessage);
  const result = {
    ok: failed.length === 0,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt - startedAt,
    exitCode: run.code,
    signal: run.signal,
    profile,
    requested: {
      model: args.model,
      effort: args.effort,
      mode: 'plan',
      authRoute: 'google-oauth-subscription',
    },
    observed: {
      agyVersion: exe.version,
      conversationId: parsed.conversationId,
      initModel: parsed.initModel,
      permissionMode: parsed.permissionMode,
      resultStatus: parsed.resultStatus,
      durationSeconds: parsed.durationSeconds,
      numTurns: parsed.numTurns,
      usage: parsed.usage,
      toolStepsCount: parsed.toolSteps.length,
      mutatingToolStepsCount: parsed.mutatingToolSteps.length,
      deniedActions: parsed.deniedActions,
    },
    checks,
    failedChecks: failed,
    lastMessagePath: lastMessage ? lastMessagePath : null,
    lastMessageBytes: Buffer.byteLength(lastMessage, 'utf8'),
    lastMessageSha256: lastMessage ? sha256(lastMessage) : null,
    packetSha256,
    runDir,
  };
  writeEvidence(runDir, 'result.json', `${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    const stderrTail = (run.stderr || '').trim().split(/\r?\n/).slice(-3).join(' | ');
    throw new RunError(
      `Gemini run failed verification (${failed.join(', ')}); exit ${run.code}` +
      `${stderrTail ? `; stderr: ${stderrTail.slice(0, 240)}` : ''}. ` +
      `Requested model ${args.model}, init model ${parsed.initModel || 'none'}. Evidence: ${runDir}`,
    );
  }

  const totalTokens = parsed.usage && parsed.usage.total_tokens !== undefined ? parsed.usage.total_tokens : 'n/a';
  process.stderr.write(
    `invoke-gemini: ok; conversation ${parsed.conversationId || 'n/a'}; ` +
    `tokens used ${totalTokens}; ${result.durationMs} ms; evidence ${runDir}\n`,
  );
  if (!args.quiet) {
    process.stdout.write(lastMessage.endsWith('\n') ? lastMessage : `${lastMessage}\n`);
  }
  return EXIT.OK;
}

main().then((code) => {
  process.exitCode = code;
}).catch((error) => {
  process.stderr.write(`invoke-gemini: ${error instanceof Error ? error.message : String(error)}\n`);
  if (error instanceof AuthError) process.exitCode = EXIT.AUTH;
  else if (error instanceof RunError) process.exitCode = EXIT.RUN;
  else process.exitCode = EXIT.USAGE;
});
