import { buildCommandResult } from "../contracts/results.mjs";
import { parseCliArgs, parseOptionalInteger, requireOption } from "../utils/args.mjs";
import { executeKnowledgeOperation, getCliUsageLines } from "./operations.mjs";

function printResult(result) {
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

function buildHelpResult() {
  return buildCommandResult("help", {
    usage: getCliUsageLines(),
  });
}

function buildCliInput(command, options) {
  if (command === "bootstrap" || command === "health") {
    return {};
  }

  if (command === "refresh") {
    return { force: Boolean(options.force) };
  }

  if (command === "search-handoffs") {
    return {
      query: requireOption(options, "query"),
      role: options.role ? String(options.role) : undefined,
      after: options.after ? String(options.after) : undefined,
      limit: parseOptionalInteger(options.limit, 10),
    };
  }

  if (command === "lookup-stage") {
    return {
      name: requireOption(options, "name"),
      limit: parseOptionalInteger(options.limit, 5),
    };
  }

  if (command === "lookup-model-task") {
    return {
      task: requireOption(options, "task"),
      limit: parseOptionalInteger(options.limit, 5),
    };
  }

  if (command === "get-role-context") {
    return {
      role: requireOption(options, "role"),
    };
  }

  if (command === "get-doc-section") {
    return {
      file: requireOption(options, "file"),
      section: requireOption(options, "section"),
    };
  }

  if (command === "preflight-task") {
    return {
      task: requireOption(options, "task"),
      role: options.role ? String(options.role) : undefined,
      limit: parseOptionalInteger(options.limit, 5),
    };
  }

  throw new Error(`Unknown command: ${command}`);
}

export function runCli(argv = process.argv.slice(2)) {
  const { command, options } = parseCliArgs(argv);

  if (!command || command === "help" || command === "--help") {
    printResult(buildHelpResult());
    return 0;
  }

  try {
    printResult(executeKnowledgeOperation(command, buildCliInput(command, options)));
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}
