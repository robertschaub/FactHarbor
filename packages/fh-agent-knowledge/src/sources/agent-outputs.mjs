import { PATHS } from "../utils/paths.mjs";
import { readTextFile } from "../utils/fs.mjs";

function parseAgentOutputBlock(block) {
  const lines = block
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 3 || !lines[0].startsWith("### ")) {
    return null;
  }

  const header = lines[0].slice(4);
  const [date = "", role = "", agent = "", remainder = ""] = header.split("|").map((part) => part.trim());
  const [title = remainder, metadata = ""] = remainder.split("—").map((part) => part.trim());
  const summaryLine = lines.find((line) => line.startsWith("**For next agent:**"));
  const linkLine = lines.find((line) => line.startsWith("→ "));

  return {
    date,
    role,
    agent,
    title: title.trim(),
    metadata,
    summary: summaryLine ? summaryLine.replace("**For next agent:**", "").trim() : "",
    link: linkLine ? linkLine.slice(2).trim() : "",
  };
}

export function loadRecentAgentOutputs() {
  const text = readTextFile(PATHS.agentOutputs);
  const blocks = text
    .split(/\r?\n---\r?\n/)
    .map((block) => block.trim())
    .filter((block) => block.startsWith("### "));

  return blocks
    .map(parseAgentOutputBlock)
    .filter(Boolean);
}
