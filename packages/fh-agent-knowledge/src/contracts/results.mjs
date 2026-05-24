export function buildWarning(code, message) {
  return { code, message };
}

export function buildCommandResult(command, data = {}, warnings = []) {
  return {
    ok: true,
    command,
    warnings,
    ...data,
  };
}
