#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_MAX_TOKENS = 4096;
const API_URL = 'https://api.openai.com/v1/chat/completions';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findRepoRoot(startDir) {
  let current = path.resolve(startDir);
  while (true) {
    if (fs.existsSync(path.join(current, 'AGENTS.md'))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) throw new Error('Could not locate FactHarbor repo root (AGENTS.md not found).');
    current = parent;
  }
}

function parseArgs(argv) {
  const args = { prompt: null, system: null, model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--prompt':
        args.prompt = argv[++i];
        break;
      case '--system':
        args.system = argv[++i];
        break;
      case '--model':
        args.model = argv[++i];
        break;
      case '--max-tokens':
        args.maxTokens = parseInt(argv[++i], 10);
        if (Number.isNaN(args.maxTokens) || args.maxTokens <= 0) {
          throw new Error('--max-tokens must be a positive integer.');
        }
        break;
      default:
        throw new Error(`Unknown argument: ${argv[i]}`);
    }
  }
  return args;
}

function readStdin() {
  if (process.stdin.isTTY) {
    throw new Error('No --prompt provided and stdin is a TTY. Pipe input or use --prompt "...".');
  }
  return fs.readFileSync(0, 'utf8').trim();
}

function buildRequestBody(args) {
  const messages = [];
  if (args.system) {
    messages.push({ role: 'system', content: args.system });
  }
  messages.push({ role: 'user', content: args.prompt });
  return {
    model: args.model,
    messages,
    max_completion_tokens: args.maxTokens,
  };
}

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers,
    };
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve({ status: res.statusCode, body: raw });
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  findRepoRoot(process.cwd()); // validate we are inside the repo

  const args = parseArgs(process.argv.slice(2));

  // Resolve prompt: --prompt flag takes precedence, then stdin
  if (!args.prompt) {
    args.prompt = readStdin();
  }
  if (!args.prompt) {
    throw new Error('No prompt provided. Use --prompt "..." or pipe via stdin.');
  }

  const requestBody = buildRequestBody(args);

  // --- Dry-run mode ---
  if (process.env.FH_INVOKE_GPT_DRY_RUN === '1') {
    const dryRunOutput = {
      url: API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer [REDACTED]',
      },
      body: requestBody,
    };
    process.stdout.write(`${JSON.stringify(dryRunOutput, null, 2)}\n`);
    return;
  }

  // --- Live call ---
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set.');
  }

  const bodyJson = JSON.stringify(requestBody);
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
    'Content-Length': Buffer.byteLength(bodyJson),
  };

  const response = await httpsPost(API_URL, headers, bodyJson);

  if (response.status !== 200) {
    let detail = response.body;
    try {
      const errObj = JSON.parse(response.body);
      detail = errObj.error?.message || response.body;
    } catch (_) { /* use raw body */ }
    throw new Error(`OpenAI API error (HTTP ${response.status}): ${detail}`);
  }

  const data = JSON.parse(response.body);
  const text = data.choices?.[0]?.message?.content;
  if (text == null) {
    throw new Error(`Unexpected API response shape: no choices[0].message.content.\n${response.body}`);
  }
  process.stdout.write(text);
}

main().catch((err) => {
  process.stderr.write(`invoke-gpt: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
