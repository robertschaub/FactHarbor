#!/usr/bin/env node
'use strict';

/*
 * invoke-codex.cjs — call the local Codex CLI headlessly under the maintainer's
 * ChatGPT subscription login, with a supplied review packet. Never uses OPENAI_API_KEY.
 *
 * Procedure: Docs/AGENTS/Policies/Tool_Strengths.md → "Calling Codex from Claude Code".
 * Siblings: invoke-claude.cjs (Claude subscription), invoke-gpt.cjs (paid OpenAI API).
 *
 * Usage:
 *   node scripts/agents/invoke-codex.cjs --model <slug> [--effort minimal|low|medium|high|xhigh]
 *        [--account <email>] [--packet <file>] [--evidence-dir <dir>] [--label <name>]
 *        [--repo] [--no-preamble] [--quiet]
 *
 *   --model is required: there is no default Codex model. The packet comes from --packet or stdin.
 *   Profile "packet" (default): fresh empty temporary working directory, user config ignored,
 *   shell, file, patch and image tools disabled by feature flags, read-only sandbox.
 *   --repo selects profile "repo-read-only": repository root as working directory, shell tool
 *   enabled for reading, read-only sandbox (its enforcement is not verified by this wrapper).
 *   --account stops the run unless the login's email matches (FH_CODEX_ACCOUNT sets the default).
 *   Every run creates a fresh directory under --evidence-dir (default <temp>/codex-reviews);
 *   a location inside a checkout must be gitignored.
 *
 * Environment:
 *   FH_CODEX_BIN=<path>         use exactly this executable; the run stops if it is unusable
 *   FH_CODEX_ACCOUNT=<email>    default for --account
 *   FH_INVOKE_CODEX_DRY_RUN=1   resolve the executable (runs `--version` and `exec --help` only),
 *                               print the plan as JSON and exit: no login check, no model request
 *
 * Exit codes: 0 ok · 1 usage/setup · 2 subscription or account check failed · 3 Codex failed or verification mismatch
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

const EXIT = { OK: 0, USAGE: 1, AUTH: 2, RUN: 3 };
const EFFORTS = ['minimal', 'low', 'medium', 'high', 'xhigh'];
const STRIPPED_ENV = /^(OPENAI_|CODEX_API_KEY$)/i;
const LOGIN_OK = /Logged in using ChatGPT/i;
const REQUIRED_EXEC_FLAGS = ['--sandbox', '--ephemeral', '--color', '--skip-git-repo-check', '--model', '--ignore-user-config', '--strict-config', '--disable', '--output-last-message'];
const DISABLED_FEATURES = {
  packet: ['memories', 'shell_tool', 'unified_exec', 'code_mode_host', 'skill_search', 'tool_suggest', 'apps', 'multi_agent'],
  'repo-read-only': ['memories', 'code_mode_host', 'skill_search', 'tool_suggest', 'apps', 'multi_agent'],
};
const BANNER_FIELDS = ['model', 'provider', 'approval', 'sandbox', 'reasoning effort', 'session id'];
const MAX_CAPTURE_BYTES = 64 * 1024 * 1024;
const FILE_MODE = 0o600;

const PACKET_PREAMBLE =
  'Review only the supplied packet below. You have no execution or spending authority: ' +
  'do not run commands, read files, or fetch anything. Distinguish inspected evidence from attributed claims.\n\n';
const REPO_PREAMBLE =
  'Read-only review of this working directory. Do not modify files, run builds or tests, or use the network. ' +
  'Distinguish inspected evidence from attributed claims.\n\n';

class UsageError extends Error {}
class AuthError extends Error {}
class RunError extends Error {}

// ---------------------------------------------------------------------------
// Arguments
// ---------------------------------------------------------------------------

const BOOLEAN_FLAGS = new Set(['--repo', '--no-preamble', '--quiet', '--help', '-h']);
const VALUE_FLAGS = {
  '--model': 'model', '-m': 'model', '--effort': 'effort', '--account': 'account',
  '--packet': 'packet', '--evidence-dir': 'evidenceDir', '--label': 'label',
};

function usage() {
  const header = fs.readFileSync(__filename, 'utf8').match(/\/\*\r?\n([\s\S]*?)\r?\n \*\//);
  return header ? header[1].split(/\r?\n/).map((line) => line.replace(/^ \* ?/, '')).join('\n') : 'See the file header for usage.';
}

function parseArgs(argv) {
  const args = {
    model: null, effort: null, account: process.env.FH_CODEX_ACCOUNT || null, packet: null,
    evidenceDir: null, label: 'review', repo: false, preamble: true, quiet: false, help: false,
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
    args[key] = value.trim();
  }
  if (args.help) return args;
  if (!args.model) throw new UsageError('--model is required. There is no default Codex model; use the model the user selected for this task.');
  if (args.effort && !EFFORTS.includes(args.effort)) throw new UsageError(`--effort must be one of ${EFFORTS.join(', ')}.`);
  args.label = args.label.replace(/[^A-Za-z0-9._-]+/g, '-').slice(0, 40) || 'review';
  return args;
}

// ---------------------------------------------------------------------------
// Locations, environment, executable
// ---------------------------------------------------------------------------

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md')) && fs.existsSync(path.join(current, '.claude', 'settings.json'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new UsageError('Could not locate a repository root (AGENTS.md + .claude/settings.json) above the current directory.');
    current = parent;
  }
}

function codexHome() {
  return process.env.CODEX_HOME ? path.resolve(process.env.CODEX_HOME) : path.join(os.homedir(), '.codex');
}

function childEnvironment(home) {
  const env = {};
  const stripped = [];
  for (const [key, value] of Object.entries(process.env)) {
    if (STRIPPED_ENV.test(key)) stripped.push(key);
    else env[key] = value;
  }
  env.CODEX_HOME = home;
  return { env, stripped };
}

function readCliPathFromConfig(home) {
  const configPath = path.join(home, 'config.toml');
  if (!fs.existsSync(configPath)) return null;
  const match = fs.readFileSync(configPath, 'utf8').match(/^[ \t]*CODEX_CLI_PATH[ \t]*=[ \t]*(?:'([^'\r\n]+)'|"((?:[^"\\\r\n]|\\.)+)")/m);
  if (!match) return null;
  return match[1] !== undefined ? match[1] : match[2].replace(/\\(.)/g, '$1');
}

function toCandidate(source, file) {
  // npm shims (codex, codex.cmd, codex.ps1) run the package entry with this Node instead of a shell.
  if (process.platform === 'win32' && !/\.exe$/i.test(file)) {
    const entry = path.join(path.dirname(file), 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
    if (fs.existsSync(entry)) return { source, file: process.execPath, prefixArgs: [entry], display: entry };
  }
  return { source, file, prefixArgs: [], display: file };
}

function pathHits() {
  const finder = process.platform === 'win32' ? ['where.exe', ['codex']] : ['which', ['-a', 'codex']];
  const result = spawnSync(finder[0], finder[1], { encoding: 'utf8', windowsHide: true });
  if (result.status !== 0 || !result.stdout) return [];
  return result.stdout.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function candidateExecutables(home) {
  const list = [];
  const cliPath = readCliPathFromConfig(home);
  if (cliPath) list.push(toCandidate('CODEX_CLI_PATH in config.toml (desktop app runtime)', cliPath));
  if (process.env.LOCALAPPDATA) {
    const bin = path.join(process.env.LOCALAPPDATA, 'OpenAI', 'Codex', 'bin');
    if (fs.existsSync(bin)) {
      fs.readdirSync(bin, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => path.join(bin, entry.name, 'codex.exe'))
        .filter((file) => fs.existsSync(file))
        .map((file) => ({ file, mtimeMs: fs.statSync(file).mtimeMs }))
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
        .forEach((runtime) => list.push(toCandidate('desktop app runtime directory (newest first)', runtime.file)));
    }
  }
  for (const hit of pathHits()) list.push(toCandidate('PATH', hit));
  return list;
}

function probeExecutable(candidate, env) {
  const version = spawnSync(candidate.file, [...candidate.prefixArgs, '--version'], { encoding: 'utf8', env, windowsHide: true });
  if (version.error || version.status !== 0 || !(version.stdout || '').trim()) {
    return { ok: false, reason: version.error ? version.error.message : '--version failed' };
  }
  const help = spawnSync(candidate.file, [...candidate.prefixArgs, 'exec', '--help'], { encoding: 'utf8', env, windowsHide: true });
  const text = `${help.stdout || ''}${help.stderr || ''}`;
  const missing = REQUIRED_EXEC_FLAGS.filter((flag) => !text.includes(flag));
  if (help.status !== 0 || missing.length) return { ok: false, reason: `exec --help lacks ${missing.join(', ') || 'output'}` };
  return { ok: true, version: version.stdout.trim() };
}

function resolveExecutable(home, env) {
  if (process.env.FH_CODEX_BIN) {
    const file = path.resolve(process.env.FH_CODEX_BIN);
    if (!fs.existsSync(file)) throw new UsageError(`FH_CODEX_BIN points to a missing file: ${file}`);
    const candidate = toCandidate('FH_CODEX_BIN', file);
    const probe = probeExecutable(candidate, env);
    if (!probe.ok) throw new UsageError(`FH_CODEX_BIN is not usable (${probe.reason}): ${candidate.display}`);
    return { ...candidate, version: probe.version, tried: [] };
  }
  const seen = new Set();
  const tried = [];
  for (const candidate of candidateExecutables(home)) {
    const key = candidate.display.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (!fs.existsSync(candidate.file)) { tried.push(`${candidate.source}: ${candidate.display} (missing)`); continue; }
    const probe = probeExecutable(candidate, env);
    if (!probe.ok) { tried.push(`${candidate.source}: ${candidate.display} (${probe.reason})`); continue; }
    return { ...candidate, version: probe.version, tried };
  }
  throw new UsageError(
    `No usable Codex executable found. Tried:\n  ${tried.join('\n  ') || '(none)'}\n` +
    'Set FH_CODEX_BIN to the desktop app runtime, e.g. %LOCALAPPDATA%\\OpenAI\\Codex\\bin\\<hash>\\codex.exe.',
  );
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

function decodeJwtPayload(token) {
  try {
    const part = token.split('.')[1];
    return JSON.parse(Buffer.from(part.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  } catch (_) {
    return null;
  }
}

function maskEmail(email) {
  if (!email || !email.includes('@')) return '(none)';
  return `${email[0]}***${email.slice(email.indexOf('@'))}`;
}

function checkAuth(exe, env, home, cwd, expectedAccount) {
  const status = spawnSync(exe.file, [...exe.prefixArgs, 'login', 'status'], { encoding: 'utf8', env, cwd, windowsHide: true });
  const text = `${status.stdout || ''}${status.stderr || ''}`.trim();
  const record = {
    codexHome: home, loginStatusExitCode: status.status, loginStatus: text, authMode: null,
    apiKeyStored: null, account: null, expectedAccount: expectedAccount || null, problems: [],
  };
  if (status.status !== 0 || !LOGIN_OK.test(text)) record.problems.push('login status is not a ChatGPT login');
  const authPath = path.join(home, 'auth.json');
  let auth = null;
  try {
    auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
  } catch (error) {
    record.problems.push(`cannot read ${authPath}: ${error.message}`);
  }
  if (auth) {
    record.authMode = auth.auth_mode || null;
    record.apiKeyStored = Boolean(auth.OPENAI_API_KEY);
    if (record.authMode && record.authMode !== 'chatgpt') record.problems.push(`auth_mode is ${record.authMode}, not chatgpt`);
    if (record.apiKeyStored) record.problems.push('an API key is stored in auth.json, so the subscription route cannot be guaranteed');
    const claims = auth.tokens && auth.tokens.id_token ? decodeJwtPayload(auth.tokens.id_token) : null;
    const oa = claims ? claims['https://api.openai.com/auth'] || {} : {};
    if (!claims || !claims.email) {
      record.problems.push('no identity claims in the auth.json token');
    } else {
      record.account = { email: claims.email, planType: oa.chatgpt_plan_type || null, subscriptionActiveUntil: oa.chatgpt_subscription_active_until || null };
      if (expectedAccount && claims.email.toLowerCase() !== expectedAccount.toLowerCase()) {
        record.problems.push(`logged-in account ${maskEmail(claims.email)} is not the expected ${maskEmail(expectedAccount)}`);
      }
    }
  }
  return { ok: record.problems.length === 0, record };
}

// ---------------------------------------------------------------------------
// Evidence
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

function readPacket(args) {
  if (args.packet) return fs.readFileSync(args.packet, 'utf8');
  if (process.stdin.isTTY) throw new UsageError('No --packet given and stdin is a TTY. Pipe the packet or pass --packet <file>.');
  return fs.readFileSync(0, 'utf8');
}

// ---------------------------------------------------------------------------
// Run, banner, verification
// ---------------------------------------------------------------------------

function buildCodexArgs(args, profile, workdir, lastMessagePath) {
  const list = ['exec', '--sandbox', 'read-only', '--ephemeral', '--color', 'never', '--skip-git-repo-check', '-C', workdir,
    '--model', args.model, '--ignore-user-config', '--strict-config'];
  for (const feature of DISABLED_FEATURES[profile]) list.push('--disable', feature);
  list.push('-c', 'web_search="disabled"');
  if (args.effort) list.push('-c', `model_reasoning_effort="${args.effort}"`);
  list.push('--output-last-message', lastMessagePath, '-');
  return list;
}

function runCodex(exe, codexArgs, packet, env, cwd, runDir) {
  return new Promise((resolve, reject) => {
    const streams = ['stdout', 'stderr'].map((name) => fs.createWriteStream(path.join(runDir, `${name}.txt`), { flags: 'wx', mode: FILE_MODE }));
    const captured = { stdout: [], stderr: [], bytes: 0, truncated: false };
    let settled = false;
    let streamError = null;
    const settle = (fn, value) => { if (!settled) { settled = true; fn(value); } };
    const child = spawn(exe.file, [...exe.prefixArgs, ...codexArgs], { cwd, env, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    const stop = () => { try { child.kill(); } catch (_) { /* already gone */ } };
    for (const stream of streams) stream.on('error', (error) => { streamError = streamError || error; stop(); });
    const capture = (name, index) => (chunk) => {
      if (captured.bytes + chunk.length <= MAX_CAPTURE_BYTES) { captured[name].push(chunk); captured.bytes += chunk.length; } else captured.truncated = true;
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
        else settle(resolve, { code, signal, stdout: Buffer.concat(captured.stdout).toString('utf8'), stderr: Buffer.concat(captured.stderr).toString('utf8'), truncated: captured.truncated });
      };
      for (const stream of streams) stream.end(done);
    });
    process.stderr.write(`invoke-codex: started pid ${child.pid}; progress in ${path.join(runDir, 'stderr.txt')}\n`);
    child.stdin.on('error', () => { /* EPIPE when Codex exits before reading the packet; the exit code reports it */ });
    child.stdin.end(packet);
  });
}

// The banner is the block Codex prints first on stderr, between the first two "--------" lines.
// Everything after it is the echoed packet and the response, which is not control evidence.
function parseBanner(stderr) {
  const lines = stderr.split(/\r?\n/);
  const result = { structureOk: false, codexVersion: null, fields: {} };
  const start = lines.findIndex((line) => /^OpenAI Codex v\S+$/.test(line));
  if (start === -1 || lines[start + 1] !== '--------') return result;
  const end = lines.indexOf('--------', start + 2);
  if (end === -1) return result;
  result.codexVersion = lines[start].replace(/^OpenAI Codex v/, '');
  for (const line of lines.slice(start + 2, end)) {
    const match = line.match(/^([a-z][a-z ]*?):[ \t]*(.*?)[ \t]*$/);
    if (match) result.fields[match[1]] = match[2];
  }
  result.structureOk = BANNER_FIELDS.every((field) => field in result.fields);
  return result;
}

function stripEchoes(stderr, echoes) {
  let text = stderr.replace(/\r\n/g, '\n');
  for (const echo of echoes) {
    const normalized = echo.replace(/\r\n/g, '\n').trim();
    if (normalized) text = text.split(normalized).join('');
  }
  return text;
}

function diagnostics(stderr, packet, lastMessage) {
  const text = stripEchoes(stderr, [packet, lastMessage]);
  const lines = text.split('\n');
  const tokens = [...text.matchAll(/^tokens used\n[ \t]*([\d.,]+)/gm)];
  return {
    tokensUsed: tokens.length ? tokens[tokens.length - 1][1] : null,
    requestErrorLines: lines.filter((line) => /^ERROR: /.test(line)).map((line) => line.slice(0, 300)),
    logErrorLines: lines.filter((line) => /^\d{4}-\d{2}-\d{2}T\S+ +ERROR /.test(line)).map((line) => line.slice(0, 300)),
  };
}

function verify(args, run, banner, lastMessage) {
  const fields = banner.fields;
  const checks = {
    exitCode: run.code === 0,
    outputCaptured: !run.truncated,
    bannerStructure: banner.structureOk,
    model: fields.model === args.model,
    provider: fields.provider === 'openai',
    approval: fields.approval === 'never',
    sandbox: fields.sandbox === 'read-only',
    effort: args.effort ? fields['reasoning effort'] === args.effort : 'not requested',
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
  if (args.help) { process.stdout.write(`${usage()}\n`); return EXIT.OK; }

  const dryRun = process.env.FH_INVOKE_CODEX_DRY_RUN === '1';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const home = codexHome();
  const { env, stripped } = childEnvironment(home);
  const exe = resolveExecutable(home, env);
  const profile = args.repo ? 'repo-read-only' : 'packet';
  const evidenceBase = path.resolve(args.evidenceDir || path.join(os.tmpdir(), 'codex-reviews'));
  const checkout = requireIgnoredIfInCheckout(evidenceBase);
  const workdir = args.repo ? findRepoRoot(process.cwd()) : '<fresh temporary directory>';
  const preamble = args.preamble ? (args.repo ? REPO_PREAMBLE : PACKET_PREAMBLE) : '';

  if (dryRun) {
    let packetSha256 = null;
    if (args.packet || !process.stdin.isTTY) packetSha256 = sha256(preamble + readPacket(args));
    process.stdout.write(`${JSON.stringify({
      executable: exe.display, executableSource: exe.source, codexVersion: exe.version, rejectedCandidates: exe.tried,
      probesRun: ['--version', 'exec --help'], profile, args: buildCodexArgs(args, profile, workdir, '<run directory>/last-message.md'),
      workdir, evidenceBase, evidenceCheckout: checkout, codexHome: home, strippedEnvKeys: stripped,
      expectedAccount: args.account ? maskEmail(args.account) : null, preambleApplied: Boolean(preamble), packetSha256,
      authCheck: 'skipped (dry run)', modelRequest: 'none (dry run)',
    }, null, 2)}\n`);
    return EXIT.OK;
  }

  const rawPacket = readPacket(args);
  if (!rawPacket.trim()) throw new UsageError('The packet is empty.');
  const packet = preamble + rawPacket;
  const runDir = createRunDirectory(evidenceBase, args.label, stamp);

  const auth = checkAuth(exe, env, home, runDir, args.account);
  writeEvidence(runDir, 'auth-check.json', `${JSON.stringify(auth.record, null, 2)}\n`);
  if (!auth.ok) {
    throw new AuthError(`subscription check failed: ${auth.record.problems.join('; ')}. Resolve the login; do not fall back to an API key. Details: ${path.join(runDir, 'auth-check.json')}`);
  }
  const account = auth.record.account;
  process.stderr.write(`invoke-codex: ${exe.version} at ${exe.display}; ChatGPT login, plan ${account.planType || 'unknown'}, account ${maskEmail(account.email)}; model ${args.model}, effort ${args.effort || 'client default'}, profile ${profile}\n`);

  const packetSha256 = sha256(packet);
  writeEvidence(runDir, 'packet.md', packet);
  writeEvidence(runDir, 'packet.sha256', `${packetSha256}  packet.md\n`);

  const lastMessagePath = path.join(runDir, 'last-message.md');
  const tempWorkdir = args.repo ? null : fs.mkdtempSync(path.join(os.tmpdir(), 'codex-packet-'));
  const cwd = tempWorkdir || workdir;
  const codexArgs = buildCodexArgs(args, profile, cwd, lastMessagePath);
  const startedAt = new Date();
  let run;
  try {
    writeEvidence(runDir, 'request.json', `${JSON.stringify({
      startedAt: startedAt.toISOString(), executable: exe.display, executableSource: exe.source, codexVersion: exe.version,
      profile, requested: { model: args.model, effort: args.effort, sandbox: 'read-only', account: account.email },
      args: codexArgs, workdir: cwd, codexHome: home, strippedEnvKeys: stripped, preambleApplied: Boolean(preamble), packetSha256,
    }, null, 2)}\n`);
    run = await runCodex(exe, codexArgs, packet, env, cwd, runDir);
  } finally {
    if (tempWorkdir) {
      try { fs.rmSync(tempWorkdir, { recursive: true, force: true }); } catch (error) { process.stderr.write(`invoke-codex: could not remove ${tempWorkdir}: ${error.message}\n`); }
    }
  }

  const finishedAt = new Date();
  const lastMessage = fs.existsSync(lastMessagePath) ? fs.readFileSync(lastMessagePath, 'utf8') : '';
  const banner = parseBanner(run.stderr);
  const diag = diagnostics(run.stderr, packet, lastMessage);
  const { checks, failed } = verify(args, run, banner, lastMessage);
  const result = {
    ok: failed.length === 0,
    startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), durationMs: finishedAt - startedAt,
    exitCode: run.code, signal: run.signal, profile,
    requested: { model: args.model, effort: args.effort, sandbox: 'read-only', account: maskEmail(account.email) },
    banner: { codexVersion: banner.codexVersion, ...banner.fields },
    tokensUsed: diag.tokensUsed, requestErrorLines: diag.requestErrorLines, logErrorLines: diag.logErrorLines,
    checks, failedChecks: failed,
    lastMessagePath, lastMessageBytes: Buffer.byteLength(lastMessage, 'utf8'), lastMessageSha256: lastMessage ? sha256(lastMessage) : null,
    packetSha256, runDir,
  };
  writeEvidence(runDir, 'result.json', `${JSON.stringify(result, null, 2)}\n`);

  if (!result.ok) {
    const firstError = diag.requestErrorLines[0] ? `; ${diag.requestErrorLines[0].slice(0, 200)}` : '';
    throw new RunError(`Codex run failed verification (${failed.join(', ')}); exit ${run.code}${firstError}. Requested model ${args.model}, banner model ${banner.fields.model || 'none'}. Evidence: ${runDir}`);
  }
  process.stderr.write(`invoke-codex: ok; session ${banner.fields['session id']}; tokens used ${diag.tokensUsed || 'n/a'}; ${result.durationMs} ms; evidence ${runDir}\n`);
  if (!args.quiet) process.stdout.write(lastMessage.endsWith('\n') ? lastMessage : `${lastMessage}\n`);
  return EXIT.OK;
}

main().then((code) => { process.exitCode = code; }).catch((error) => {
  process.stderr.write(`invoke-codex: ${error instanceof Error ? error.message : String(error)}\n`);
  if (error instanceof AuthError) process.exitCode = EXIT.AUTH;
  else if (error instanceof RunError) process.exitCode = EXIT.RUN;
  else process.exitCode = EXIT.USAGE;
});
