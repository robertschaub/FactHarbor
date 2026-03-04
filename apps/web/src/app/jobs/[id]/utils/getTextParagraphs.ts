const SHORT_TEXT_SPLIT_LENGTH = 400;
const WALL_OF_TEXT_MIN_LENGTH = 500;
const MIN_LINES_FOR_SINGLE_NEWLINE_SPLIT = 3;
const LIST_LINE_MIN_COUNT = 2;
const LIST_LINE_RATIO_THRESHOLD = 0.3;
const PUNCTUATION_LINE_RATIO_THRESHOLD = 0.4;
const SENTENCES_PER_PARAGRAPH_CHUNK = 3;

const DOUBLE_NEWLINE_REGEX = /\n{2,}/;
const SENTENCE_PUNCTUATION_REGEX = /([.!?。！？]+)/;

function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

function splitIntoSentenceLikeUnits(text: string): string[] {
  const tokens = text.split(SENTENCE_PUNCTUATION_REGEX);
  const units: string[] = [];
  let buffer = "";

  for (const token of tokens) {
    if (!token) continue;

    if (SENTENCE_PUNCTUATION_REGEX.test(token)) {
      buffer += token;
      if (buffer.trim().length > 0) {
        units.push(buffer);
      }
      buffer = "";
      continue;
    }

    buffer += token;
  }

  if (buffer.trim().length > 0) {
    units.push(buffer);
  }

  return units;
}

export function getTextParagraphs(text: string): string[] {
  const normalized = normalizeNewlines(text);

  const hasDoubleNewlines = normalized.includes("\n\n");
  const hasSingleNewlines = normalized.includes("\n");

  if (hasDoubleNewlines || normalized.length < SHORT_TEXT_SPLIT_LENGTH) {
    return normalized.split(DOUBLE_NEWLINE_REGEX);
  }

  if (hasSingleNewlines) {
    const lines = normalized.split("\n");
    const nonEmptyLines = lines.filter((line) => line.trim().length > 0);
    const lineCount = nonEmptyLines.length;

    const punctuationLines = nonEmptyLines.filter((line) => /[.!?:。！？]\s*$/.test(line)).length;
    const listLineCount = nonEmptyLines.filter((line) => /^\s*(?:\d+[.)]|[-*+])\s+/.test(line)).length;

    const looksLikeList = lineCount > 0
      && listLineCount >= LIST_LINE_MIN_COUNT
      && (listLineCount / lineCount) >= LIST_LINE_RATIO_THRESHOLD;

    const hasIntentionalBreaks = looksLikeList
      || (lineCount >= MIN_LINES_FOR_SINGLE_NEWLINE_SPLIT
        && (punctuationLines / lineCount) > PUNCTUATION_LINE_RATIO_THRESHOLD);

    return hasIntentionalBreaks ? lines : [normalized];
  }

  if (normalized.length > WALL_OF_TEXT_MIN_LENGTH) {
    const sentences = splitIntoSentenceLikeUnits(normalized);
    if (sentences.length > 1) {
      const paragraphs: string[] = [];
      let currentParagraph = "";
      let sentenceCount = 0;

      for (const sentence of sentences) {
        currentParagraph += sentence;
        sentenceCount++;

        if (sentenceCount >= SENTENCES_PER_PARAGRAPH_CHUNK) {
          paragraphs.push(currentParagraph.trim());
          currentParagraph = "";
          sentenceCount = 0;
        }
      }

      if (currentParagraph.trim().length > 0) {
        paragraphs.push(currentParagraph.trim());
      }

      return paragraphs.length > 0 ? paragraphs : [normalized];
    }
  }

  return [normalized];
}
