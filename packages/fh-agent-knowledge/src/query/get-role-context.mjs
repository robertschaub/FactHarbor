import { resolveRoleEntry } from "../sources/roles.mjs";

export function getRoleContext(knowledgeContext, { role } = {}) {
  const roleEntries = knowledgeContext.data?.roles?.entries ?? [];
  return resolveRoleEntry(roleEntries, role);
}
