export function parseCliArgs(argv) {
  const [command, ...tail] = argv;
  const options = {};

  for (let index = 0; index < tail.length; index += 1) {
    const token = tail[index];
    if (!token.startsWith("--")) {
      continue;
    }

    if (token.includes("=")) {
      const [key, value] = token.slice(2).split(/=(.*)/s, 2);
      options[key] = value === "" ? true : value;
      continue;
    }

    const nextToken = tail[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      options[token.slice(2)] = true;
      continue;
    }

    options[token.slice(2)] = nextToken;
    index += 1;
  }

  return { command, options };
}

export function requireOption(options, key) {
  const value = options[key];
  if (value === undefined || value === true || value === "") {
    throw new Error(`Missing required option --${key}`);
  }

  return String(value);
}

export function parseOptionalInteger(value, fallbackValue) {
  if (value === undefined || value === true || value === "") {
    return fallbackValue;
  }

  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  return parsed;
}
