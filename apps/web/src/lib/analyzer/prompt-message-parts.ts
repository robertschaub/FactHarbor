import type { RenderedPromptSection } from "./prompt-loader";

export interface PromptMessageParts {
  systemContent: string;
  userContent: string;
  separated: boolean;
}

export function splitRenderedPromptAtHeader(
  rendered: RenderedPromptSection,
  header: string,
): PromptMessageParts {
  const inlineHeader = `${header}\n`;
  const bodyHeader = `\n${header}\n`;
  const headerIndex = rendered.content.startsWith(inlineHeader)
    ? 0
    : rendered.content.indexOf(bodyHeader);
  const splitIndex = headerIndex === 0
    ? 0
    : headerIndex >= 0
      ? headerIndex + 1
      : -1;

  if (splitIndex < 0) {
    return {
      systemContent: rendered.content,
      userContent: "",
      separated: false,
    };
  }

  const systemContent = rendered.content.slice(0, splitIndex).trimEnd();
  const userContent = rendered.content.slice(splitIndex).trimStart();

  if (!systemContent || !userContent) {
    return {
      systemContent: rendered.content,
      userContent: "",
      separated: false,
    };
  }

  return {
    systemContent,
    userContent,
    separated: true,
  };
}

export function joinPromptUserContent(parts: Array<string | null | undefined>): string {
  return parts
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}
