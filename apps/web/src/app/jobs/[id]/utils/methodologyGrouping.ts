export type MethodologyGroup = {
  key: string;
  label: string;
  icon: string;
  evidenceItems: Array<{ id: string; evidenceScope?: any }>;
};

type MethodologyInfo = {
  label: string;
  icon: string;
};

const resolveMethodologyInfo = (evidenceItem: any): MethodologyInfo => {
  const scope = evidenceItem?.evidenceScope;
  const methodology =
    typeof scope?.methodology === "string" ? scope.methodology.trim() : "";
  const name = typeof scope?.name === "string" ? scope.name.trim() : "";

  if (methodology) {
    return { label: methodology, icon: "🧭" };
  }

  if (name) {
    return { label: name, icon: "📎" };
  }

  return { label: "General", icon: "📄" };
};

export function getMethodologyIcon(info: MethodologyInfo): string {
  return info.icon;
}

export function groupEvidenceByMethodology(
  evidenceItems: Array<{ id: string; evidenceScope?: any }>
): MethodologyGroup[] | null {
  if (!Array.isArray(evidenceItems) || evidenceItems.length === 0) return null;

  const groups = new Map<string, MethodologyGroup>();

  for (const evidenceItem of evidenceItems) {
    const info = resolveMethodologyInfo(evidenceItem);
    const key = info.label.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: info.label,
        icon: getMethodologyIcon(info),
        evidenceItems: [],
      });
    }
    groups.get(key)!.evidenceItems.push(evidenceItem);
  }

  if (groups.size < 3) return null;

  return Array.from(groups.values()).sort(
    (a, b) => b.evidenceItems.length - a.evidenceItems.length
  );
}
