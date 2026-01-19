export type MethodologyGroup = {
  key: string;
  label: string;
  icon: string;
  facts: Array<{ id: string; evidenceScope?: any }>;
};

type MethodologyInfo = {
  label: string;
  icon: string;
};

const resolveMethodologyInfo = (fact: any): MethodologyInfo => {
  const scope = fact?.evidenceScope;
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

export function groupFactsByMethodology(
  facts: Array<{ id: string; evidenceScope?: any }>
): MethodologyGroup[] | null {
  if (!Array.isArray(facts) || facts.length === 0) return null;

  const groups = new Map<string, MethodologyGroup>();

  for (const fact of facts) {
    const info = resolveMethodologyInfo(fact);
    const key = info.label.toLowerCase();
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: info.label,
        icon: getMethodologyIcon(info),
        facts: [],
      });
    }
    groups.get(key)!.facts.push(fact);
  }

  if (groups.size < 3) return null;

  return Array.from(groups.values()).sort(
    (a, b) => b.facts.length - a.facts.length
  );
}
