import { readAllowedDocSection } from "../sources/docs.mjs";

export function getDocSection(_knowledgeContext, { file, section } = {}) {
  return readAllowedDocSection(file, section);
}
