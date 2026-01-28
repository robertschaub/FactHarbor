"use client";

/**
 * Admin Prompt Management Page
 *
 * View, edit, and manage prompt templates for all pipelines.
 * Includes version history and rollback functionality.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAdminAuth } from "../admin-auth-context";
import styles from "./prompts.module.css";

// Helper to calculate section line offsets from content
function calculateSectionOffsets(content: string): Map<string, number> {
  const lines = content.split("\n");
  const offsets = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match section headers: ## SECTION_NAME
    const match = line.match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
    if (match) {
      offsets.set(match[1], i);
    }
  }

  return offsets;
}

type Pipeline = "orchestrated" | "monolithic-canonical" | "monolithic-dynamic" | "source-reliability";

interface PromptData {
  pipeline: string;
  version: string;
  contentHash: string;
  tokenEstimate: number;
  sectionCount: number;
  sections: Array<{ name: string; lineCount: number; tokenEstimate: number }>;
  variables: string[];
  content: string;
  loadedAt: string;
  warnings: Array<{ type: string; message: string }>;
}

interface VersionEntry {
  contentHash: string;
  versionLabel: string;
  isActive: boolean;
  usageCount: number;
  previousHash: string | null;
  createdUtc: string;
  activatedUtc: string | null;
}

interface PromptFileEntry {
  filename: string;
  isActive: boolean;
  isDefault: boolean;
  version?: string;
  description?: string;
  tokenEstimate?: number;
}

const PIPELINES: Pipeline[] = [
  "orchestrated",
  "monolithic-canonical",
  "monolithic-dynamic",
  "source-reliability",
];

export default function PromptsPage() {
  const { getHeaders } = useAdminAuth();
  const [pipeline, setPipeline] = useState<Pipeline>("orchestrated");
  const [tab, setTab] = useState<"editor" | "history" | "files" | "compare">("editor");
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<VersionEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [promptFiles, setPromptFiles] = useState<PromptFileEntry[]>([]);
  const [activeFile, setActiveFile] = useState<string>("");
  const [switchingFile, setSwitchingFile] = useState(false);

  // Version viewer state
  const [viewingVersion, setViewingVersion] = useState<{
    hash: string;
    label: string;
    content: string;
    createdUtc: string;
  } | null>(null);
  const [loadingVersion, setLoadingVersion] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Section navigation
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // File management state
  const [showNewFileDialog, setShowNewFileDialog] = useState(false);
  const [showRenameDialog, setShowRenameDialog] = useState<string | null>(null);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState<string | null>(null);
  const [newFilename, setNewFilename] = useState("");
  const [fileOperating, setFileOperating] = useState(false);

  // Compare state
  type CompareSource = { type: "file"; filename: string } | { type: "version"; hash: string; label: string } | { type: "editor" };
  const [leftSource, setLeftSource] = useState<CompareSource | null>(null);
  const [rightSource, setRightSource] = useState<CompareSource | null>(null);
  const [leftContent, setLeftContent] = useState<string>("");
  const [rightContent, setRightContent] = useState<string>("");
  const [loadingCompare, setLoadingCompare] = useState(false);

  // Search state
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Section folding state
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Validation state
  interface ValidationIssue { type: "error" | "warning"; message: string; line?: number }
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);

  // Token budget constants
  const TOKEN_WARNING_THRESHOLD = 8000;
  const TOKEN_DANGER_THRESHOLD = 12000;

  // Auto-save draft to localStorage
  const DRAFT_KEY = `prompt-draft-${pipeline}`;

  // Save draft on content change (debounced effect)
  useEffect(() => {
    if (!isDirty || !editContent) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({
          content: editContent,
          timestamp: Date.now(),
          pipeline,
          activeFile,
        }));
      } catch {
        // localStorage might be full or unavailable
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [editContent, isDirty, pipeline, activeFile, DRAFT_KEY]);

  // Restore draft on load
  useEffect(() => {
    try {
      const draft = localStorage.getItem(DRAFT_KEY);
      if (draft && prompt) {
        const parsed = JSON.parse(draft);
        // Only restore if draft is newer than 1 hour and matches current file
        if (parsed.timestamp > Date.now() - 3600000 && parsed.activeFile === activeFile) {
          if (parsed.content !== prompt.content && confirm("Restore unsaved draft from earlier session?")) {
            setEditContent(parsed.content);
            setIsDirty(true);
          }
        }
        // Clear old draft
        localStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // Ignore parse errors
    }
  }, [prompt, activeFile, DRAFT_KEY]);

  // Clear draft when saved
  useEffect(() => {
    if (!isDirty) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // Ignore
      }
    }
  }, [isDirty, DRAFT_KEY]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (isDirty && !saving) {
          handleSave();
        }
      }
      // Ctrl+F / Cmd+F to search
      if ((e.ctrlKey || e.metaKey) && e.key === "f" && tab === "editor") {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      // Escape to close search or reset
      if (e.key === "Escape") {
        if (showSearch) {
          setShowSearch(false);
          setSearchTerm("");
          setSearchMatches([]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDirty, saving, tab, showSearch]);

  // Search functionality
  const performSearch = useCallback((term: string) => {
    if (!term || !editContent) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: number[] = [];
    const lowerContent = editContent.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let pos = 0;

    while ((pos = lowerContent.indexOf(lowerTerm, pos)) !== -1) {
      matches.push(pos);
      pos += 1;
    }

    setSearchMatches(matches);
    setCurrentMatchIndex(matches.length > 0 ? 0 : -1);

    // Scroll to first match
    if (matches.length > 0 && editorRef.current) {
      const editor = editorRef.current;
      editor.setSelectionRange(matches[0], matches[0] + term.length);
      editor.focus();

      // Calculate scroll position
      const textBeforeMatch = editContent.substring(0, matches[0]);
      const lineNumber = textBeforeMatch.split("\n").length - 1;
      const lineHeight = editor.scrollHeight / editContent.split("\n").length;
      editor.scrollTop = Math.max(0, lineNumber * lineHeight - 100);
    }
  }, [editContent]);

  const goToNextMatch = () => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    navigateToMatch(nextIndex);
  };

  const goToPrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prevIndex = currentMatchIndex <= 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    setCurrentMatchIndex(prevIndex);
    navigateToMatch(prevIndex);
  };

  const navigateToMatch = (index: number) => {
    if (!editorRef.current || index < 0 || index >= searchMatches.length) return;
    const pos = searchMatches[index];
    const editor = editorRef.current;
    editor.setSelectionRange(pos, pos + searchTerm.length);
    editor.focus();

    const textBeforeMatch = editContent.substring(0, pos);
    const lineNumber = textBeforeMatch.split("\n").length - 1;
    const lineHeight = editor.scrollHeight / editContent.split("\n").length;
    editor.scrollTop = Math.max(0, lineNumber * lineHeight - 100);
  };

  // Prompt validation
  const validatePrompt = useCallback((content: string): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];
    const lines = content.split("\n");

    // Check for YAML frontmatter
    if (!content.startsWith("---")) {
      issues.push({ type: "error", message: "Missing YAML frontmatter (should start with ---)", line: 1 });
    } else {
      const endFrontmatter = content.indexOf("\n---", 4);
      if (endFrontmatter === -1) {
        issues.push({ type: "error", message: "Unclosed YAML frontmatter (missing closing ---)", line: 1 });
      } else {
        const frontmatter = content.substring(4, endFrontmatter);
        if (!frontmatter.includes("version:")) {
          issues.push({ type: "warning", message: "Missing 'version' in frontmatter" });
        }
        if (!frontmatter.includes("pipeline:")) {
          issues.push({ type: "warning", message: "Missing 'pipeline' in frontmatter" });
        }
      }
    }

    // Check for required sections (basic check)
    const sectionNames = new Set<string>();
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
      if (match) {
        if (sectionNames.has(match[1])) {
          issues.push({ type: "error", message: `Duplicate section: ${match[1]}`, line: i + 1 });
        }
        sectionNames.add(match[1]);
      }
    }

    // Check for undefined variables
    const definedVars = content.match(/variables:\s*\[(.*?)\]/s);
    const usedVars = content.match(/\$\{(\w+)\}/g) || [];
    if (usedVars.length > 0 && definedVars) {
      const varList = definedVars[1];
      for (const v of usedVars) {
        const varName = v.replace(/\$\{|\}/g, "");
        if (!varList.includes(varName)) {
          issues.push({ type: "warning", message: `Variable '${varName}' used but not declared in frontmatter` });
        }
      }
    }

    // Check for empty sections
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
      if (match) {
        // Check if next non-empty line is another section or end
        let hasContent = false;
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].match(/^## [A-Z]/)) break;
          if (lines[j].trim()) {
            hasContent = true;
            break;
          }
        }
        if (!hasContent) {
          issues.push({ type: "warning", message: `Empty section: ${match[1]}`, line: i + 1 });
        }
      }
    }

    return issues;
  }, []);

  // Validate on content change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (editContent) {
        setValidationIssues(validatePrompt(editContent));
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [editContent, validatePrompt]);

  // Toggle section collapse
  const toggleSection = (sectionName: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionName)) {
        next.delete(sectionName);
      } else {
        next.add(sectionName);
      }
      return next;
    });
  };

  // Scroll editor to a specific section
  const scrollToSection = (sectionName: string) => {
    const editor = editorRef.current;
    if (!editor) return;

    const offsets = calculateSectionOffsets(editContent);
    const lineNumber = offsets.get(sectionName);
    if (lineNumber === undefined) return;

    // Calculate approximate scroll position based on line number
    const lines = editContent.split("\n");
    const lineHeight = editor.scrollHeight / lines.length;
    const scrollTop = lineNumber * lineHeight;

    editor.scrollTop = Math.max(0, scrollTop - 50); // 50px padding from top
    editor.focus();

    // Set cursor position to the section start
    let charPosition = 0;
    for (let i = 0; i < lineNumber; i++) {
      charPosition += lines[i].length + 1; // +1 for newline
    }
    editor.setSelectionRange(charPosition, charPosition);
    setActiveSection(sectionName);
  };

  // Load and view a specific version
  const handleViewVersion = async (hash: string, label: string) => {
    setLoadingVersion(true);
    setCopySuccess(false);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/version/${hash}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setViewingVersion({
        hash: data.contentHash,
        label: data.versionLabel || label,
        content: data.content,
        createdUtc: data.createdUtc,
      });
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Failed to load version: ${err?.message}` });
    } finally {
      setLoadingVersion(false);
    }
  };

  // Copy version content to clipboard
  const handleCopyVersion = async () => {
    if (!viewingVersion?.content) return;
    try {
      await navigator.clipboard.writeText(viewingVersion.content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setStatusMsg({ type: "error", text: "Failed to copy to clipboard" });
    }
  };

  // Download version as file
  const handleDownloadVersion = () => {
    if (!viewingVersion?.content) return;
    const blob = new Blob([viewingVersion.content], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${pipeline}-${viewingVersion.label}.prompt.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // File management operations
  const handleCreateFile = async () => {
    if (!newFilename.trim()) return;
    const filename = newFilename.trim().endsWith(".prompt.md")
      ? newFilename.trim()
      : `${newFilename.trim()}.prompt.md`;

    setFileOperating(true);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files/create`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ filename }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: `Created ${filename}` });
      setShowNewFileDialog(false);
      setNewFilename("");
      await loadPromptFiles();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Create failed: ${err?.message}` });
    } finally {
      setFileOperating(false);
    }
  };

  const handleDuplicateFile = async (sourceFilename: string) => {
    if (!newFilename.trim()) return;
    const targetFilename = newFilename.trim().endsWith(".prompt.md")
      ? newFilename.trim()
      : `${newFilename.trim()}.prompt.md`;

    setFileOperating(true);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files/duplicate`, {
        method: "POST",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ sourceFilename, targetFilename }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: `Duplicated to ${targetFilename}` });
      setShowDuplicateDialog(null);
      setNewFilename("");
      await loadPromptFiles();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Duplicate failed: ${err?.message}` });
    } finally {
      setFileOperating(false);
    }
  };

  const handleRenameFile = async (oldFilename: string) => {
    if (!newFilename.trim()) return;
    const newFilenameClean = newFilename.trim().endsWith(".prompt.md")
      ? newFilename.trim()
      : `${newFilename.trim()}.prompt.md`;

    setFileOperating(true);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files/rename`, {
        method: "PUT",
        headers: { ...getHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ oldFilename, newFilename: newFilenameClean }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: `Renamed to ${newFilenameClean}` });
      setShowRenameDialog(null);
      setNewFilename("");
      await loadPromptFiles();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Rename failed: ${err?.message}` });
    } finally {
      setFileOperating(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    if (!confirm(`Delete ${filename}? This cannot be undone.`)) return;

    setFileOperating(true);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: `Deleted ${filename}` });
      await loadPromptFiles();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Delete failed: ${err?.message}` });
    } finally {
      setFileOperating(false);
    }
  };

  // Compare: Load content based on source
  const loadCompareContent = async (source: CompareSource): Promise<string> => {
    if (source.type === "editor") {
      return editContent;
    }
    if (source.type === "file") {
      const res = await fetch(`/api/admin/prompts/${pipeline}/file/${encodeURIComponent(source.filename)}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load file");
      const data = await res.json();
      return data.content || "";
    }
    if (source.type === "version") {
      const res = await fetch(`/api/admin/prompts/${pipeline}/version/${source.hash}`, {
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load version");
      const data = await res.json();
      return data.content || "";
    }
    return "";
  };

  // Compare: Update comparison when sources change
  const updateCompare = async () => {
    if (!leftSource || !rightSource) {
      setLeftContent("");
      setRightContent("");
      return;
    }
    setLoadingCompare(true);
    try {
      const [left, right] = await Promise.all([
        loadCompareContent(leftSource),
        loadCompareContent(rightSource),
      ]);
      setLeftContent(left);
      setRightContent(right);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Compare load failed: ${err?.message}` });
    } finally {
      setLoadingCompare(false);
    }
  };

  // Simple line-based diff algorithm
  type DiffLine = { type: "same" | "added" | "removed"; content: string };
  const computeDiff = (left: string, right: string): { leftLines: DiffLine[]; rightLines: DiffLine[] } => {
    const leftArr = left.split("\n");
    const rightArr = right.split("\n");
    const leftLines: DiffLine[] = [];
    const rightLines: DiffLine[] = [];

    // Simple LCS-based diff
    const lcs = (a: string[], b: string[]): Set<string> => {
      const set = new Set<string>();
      const m = a.length;
      const n = b.length;
      const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

      for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
          if (a[i - 1] === b[j - 1]) {
            dp[i][j] = dp[i - 1][j - 1] + 1;
          } else {
            dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          }
        }
      }

      // Backtrack to find LCS
      let i = m, j = n;
      const lcsLines: string[] = [];
      while (i > 0 && j > 0) {
        if (a[i - 1] === b[j - 1]) {
          lcsLines.unshift(a[i - 1]);
          i--;
          j--;
        } else if (dp[i - 1][j] > dp[i][j - 1]) {
          i--;
        } else {
          j--;
        }
      }
      lcsLines.forEach(l => set.add(l));
      return set;
    };

    // For simplicity, use a line-by-line comparison with index tracking
    let li = 0, ri = 0;
    const maxLen = Math.max(leftArr.length, rightArr.length);

    while (li < leftArr.length || ri < rightArr.length) {
      const leftLine = li < leftArr.length ? leftArr[li] : null;
      const rightLine = ri < rightArr.length ? rightArr[ri] : null;

      if (leftLine === rightLine) {
        leftLines.push({ type: "same", content: leftLine || "" });
        rightLines.push({ type: "same", content: rightLine || "" });
        li++;
        ri++;
      } else if (leftLine !== null && rightLine !== null) {
        // Look ahead to find matches
        let foundRight = rightArr.indexOf(leftLine, ri);
        let foundLeft = leftArr.indexOf(rightLine, li);

        if (foundRight !== -1 && (foundLeft === -1 || foundRight - ri <= foundLeft - li)) {
          // Right has the left line later - left line removed, insert padding on right
          for (let k = ri; k < foundRight; k++) {
            leftLines.push({ type: "same", content: "" }); // padding
            rightLines.push({ type: "added", content: rightArr[k] });
          }
          ri = foundRight;
        } else if (foundLeft !== -1) {
          // Left has the right line later
          for (let k = li; k < foundLeft; k++) {
            leftLines.push({ type: "removed", content: leftArr[k] });
            rightLines.push({ type: "same", content: "" }); // padding
          }
          li = foundLeft;
        } else {
          // No match found nearby, mark as changed
          leftLines.push({ type: "removed", content: leftLine });
          rightLines.push({ type: "added", content: rightLine });
          li++;
          ri++;
        }
      } else if (leftLine !== null) {
        leftLines.push({ type: "removed", content: leftLine });
        rightLines.push({ type: "same", content: "" });
        li++;
      } else if (rightLine !== null) {
        leftLines.push({ type: "same", content: "" });
        rightLines.push({ type: "added", content: rightLine });
        ri++;
      }
    }

    return { leftLines, rightLines };
  };

  // Get source label for display
  const getSourceLabel = (source: CompareSource | null): string => {
    if (!source) return "Select...";
    if (source.type === "editor") return "Current Editor";
    if (source.type === "file") return source.filename;
    if (source.type === "version") return `Version: ${source.label}`;
    return "Unknown";
  };

  // Copy content from compare pane to editor
  const copyToEditor = (content: string, sourceLabel: string) => {
    if (!confirm(`Replace editor content with "${sourceLabel}"? Current changes will be lost.`)) return;
    setEditContent(content);
    setIsDirty(content !== prompt?.content);
    setTab("editor");
    setStatusMsg({ type: "success", text: `Loaded content from ${sourceLabel}` });
  };

  // Quick compare with previous version
  const compareWithPrevious = async (version: VersionEntry) => {
    if (!version.previousHash) {
      setStatusMsg({ type: "error", text: "No previous version to compare with" });
      return;
    }

    // Set up compare sources
    setLeftSource({ type: "version", hash: version.previousHash, label: "Previous" });
    setRightSource({ type: "version", hash: version.contentHash, label: version.versionLabel });
    setTab("compare");

    // Trigger comparison
    setLoadingCompare(true);
    try {
      const [leftRes, rightRes] = await Promise.all([
        fetch(`/api/admin/prompts/${pipeline}/version/${version.previousHash}`, { headers: getHeaders() }),
        fetch(`/api/admin/prompts/${pipeline}/version/${version.contentHash}`, { headers: getHeaders() }),
      ]);
      if (!leftRes.ok || !rightRes.ok) throw new Error("Failed to load versions");
      const [leftData, rightData] = await Promise.all([leftRes.json(), rightRes.json()]);
      setLeftContent(leftData.content || "");
      setRightContent(rightData.content || "");
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Compare failed: ${err?.message}` });
    } finally {
      setLoadingCompare(false);
    }
  };

  // Calculate diff statistics
  const getDiffStats = (left: string, right: string): { added: number; removed: number } => {
    const diff = computeDiff(left, right);
    const added = diff.rightLines.filter(l => l.type === "added").length;
    const removed = diff.leftLines.filter(l => l.type === "removed").length;
    return { added, removed };
  };

  // Load available prompt files for pipeline
  const loadPromptFiles = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setPromptFiles(data.files || []);
      setActiveFile(data.activeFile || `${pipeline}.prompt.md`);
    } catch {
      // Non-critical
    }
  }, [pipeline, getHeaders]);

  // Switch active prompt file
  const handleFileSwitch = async (filename: string) => {
    if (filename === activeFile) return;
    setSwitchingFile(true);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/files`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename: filename || null }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: `Switched to ${filename}` });
      await loadPromptFiles();
      await loadPrompt();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Switch failed: ${err?.message}` });
    } finally {
      setSwitchingFile(false);
    }
  };

  // Load prompt content
  const loadPrompt = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: PromptData = await res.json();
      setPrompt(data);
      setEditContent(data.content);
      setIsDirty(false);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Failed to load: ${err?.message}` });
    } finally {
      setLoading(false);
    }
  }, [pipeline, getHeaders]);

  // Load version history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/history?limit=50`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.versions || []);
      setHistoryTotal(data.total || 0);
    } catch {
      // Non-critical
    }
  }, [pipeline, getHeaders]);

  useEffect(() => {
    loadPromptFiles();
    loadPrompt();
    loadHistory();
  }, [loadPromptFiles, loadPrompt, loadHistory]);

  // Save prompt
  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}`, {
        method: "PUT",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent,
          versionLabel: `manual-${new Date().toISOString().split("T")[0]}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setStatusMsg({
        type: "success",
        text: `Saved! Hash: ${result.contentHash?.substring(0, 12)}... | Tokens: ~${result.tokenEstimate}`,
      });
      setIsDirty(false);
      // Reload to get updated metadata
      await loadPrompt();
      await loadHistory();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Save failed: ${err?.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Rollback to version
  const handleRollback = async (contentHash: string) => {
    if (!confirm(`Rollback to version ${contentHash.substring(0, 12)}...?`)) return;

    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/rollback`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentHash }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: "Rollback successful!" });
      await loadPrompt();
      await loadHistory();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Rollback failed: ${err?.message}` });
    }
  };

  const handleEditorChange = (value: string) => {
    setEditContent(value);
    setIsDirty(value !== prompt?.content);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Prompt Management</h1>
      </div>

      {/* Pipeline Selector */}
      <div className={styles.pipelineSelector}>
        {PIPELINES.map((p) => (
          <button
            key={p}
            className={`${styles.pipelineBtn} ${pipeline === p ? styles.pipelineBtnActive : ""}`}
            onClick={() => { setPipeline(p); setTab("editor"); }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Prompt File Selector */}
      {promptFiles.length > 1 && (
        <div className={styles.fileSelector}>
          <label htmlFor="promptFile">Active Prompt File:</label>
          <select
            id="promptFile"
            value={activeFile}
            onChange={(e) => handleFileSwitch(e.target.value)}
            disabled={switchingFile}
            className={styles.fileSelect}
          >
            {promptFiles.map((f) => (
              <option key={f.filename} value={f.filename}>
                {f.filename}
                {f.version ? ` (v${f.version})` : ""}
                {f.tokenEstimate ? ` ~${Math.round(f.tokenEstimate / 1000)}k tokens` : ""}
                {f.isDefault ? " [default]" : ""}
              </option>
            ))}
          </select>
          {switchingFile && <span className={styles.switchingIndicator}>Switching...</span>}
        </div>
      )}

      {loading ? (
        <div className={styles.loading}>Loading prompt...</div>
      ) : prompt ? (
        <>
          {/* Metadata Bar */}
          <div className={styles.metaBar}>
            <span className={styles.metaItem}>
              <strong>Version:</strong> {prompt.version}
            </span>
            <span className={styles.metaItem}>
              <strong>Hash:</strong>{" "}
              <code>{prompt.contentHash.substring(0, 12)}...</code>
            </span>
            <span className={`${styles.metaItem} ${
              prompt.tokenEstimate > TOKEN_DANGER_THRESHOLD ? styles.tokenDanger :
              prompt.tokenEstimate > TOKEN_WARNING_THRESHOLD ? styles.tokenWarning : ""
            }`}>
              <strong>Tokens:</strong> ~{prompt.tokenEstimate.toLocaleString()}
              {prompt.tokenEstimate > TOKEN_DANGER_THRESHOLD && " ⚠️ Very Large"}
              {prompt.tokenEstimate > TOKEN_WARNING_THRESHOLD && prompt.tokenEstimate <= TOKEN_DANGER_THRESHOLD && " ⚠️ Large"}
            </span>
            <span className={styles.metaItem}>
              <strong>Sections:</strong> {prompt.sectionCount}
            </span>
            {isDirty && <span className={styles.dirtyBadge}>Unsaved changes</span>}
            <span className={styles.shortcutHint}>Ctrl+S save | Ctrl+F search</span>
          </div>

          {/* Validation Issues */}
          {validationIssues.length > 0 && (
            <div className={styles.validationBar}>
              {validationIssues.filter(i => i.type === "error").length > 0 && (
                <span className={styles.validationError}>
                  {validationIssues.filter(i => i.type === "error").length} error(s)
                </span>
              )}
              {validationIssues.filter(i => i.type === "warning").length > 0 && (
                <span className={styles.validationWarning}>
                  {validationIssues.filter(i => i.type === "warning").length} warning(s)
                </span>
              )}
              <details className={styles.validationDetails}>
                <summary>Show details</summary>
                <ul>
                  {validationIssues.map((issue, i) => (
                    <li key={i} className={issue.type === "error" ? styles.issueError : styles.issueWarning}>
                      {issue.line && <span className={styles.issueLine}>Line {issue.line}:</span>}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          )}

          {/* Section Badges - Clickable for navigation with fold toggle */}
          <div className={styles.sectionsList}>
            {prompt.sections.map((s) => (
              <div key={s.name} className={styles.sectionBadgeWrapper}>
                <button
                  className={`${styles.sectionBadge} ${styles.sectionBadgeClickable} ${activeSection === s.name ? styles.sectionBadgeActive : ""} ${collapsedSections.has(s.name) ? styles.sectionBadgeCollapsed : ""}`}
                  onClick={() => scrollToSection(s.name)}
                  title={`Jump to ${s.name}`}
                >
                  {s.name} ({s.lineCount} lines, ~{s.tokenEstimate} tokens)
                </button>
                <button
                  className={styles.sectionFoldBtn}
                  onClick={() => toggleSection(s.name)}
                  title={collapsedSections.has(s.name) ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.has(s.name) ? "▶" : "▼"}
                </button>
              </div>
            ))}
            {collapsedSections.size > 0 && (
              <button
                className={styles.expandAllBtn}
                onClick={() => setCollapsedSections(new Set())}
              >
                Expand All
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "editor" ? styles.tabActive : ""}`}
              onClick={() => setTab("editor")}
            >
              Editor
            </button>
            <button
              className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
              onClick={() => setTab("history")}
            >
              History ({historyTotal})
            </button>
            <button
              className={`${styles.tab} ${tab === "files" ? styles.tabActive : ""}`}
              onClick={() => setTab("files")}
            >
              Files ({promptFiles.length})
            </button>
            <button
              className={`${styles.tab} ${tab === "compare" ? styles.tabActive : ""}`}
              onClick={() => setTab("compare")}
            >
              Compare
            </button>
          </div>

          {tab === "editor" ? (
            <div className={styles.editorWrapper}>
              {/* Search Bar */}
              {showSearch && (
                <div className={styles.searchBar}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      performSearch(e.target.value);
                    }}
                    placeholder="Search in prompt..."
                    className={styles.searchInput}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (e.shiftKey) goToPrevMatch();
                        else goToNextMatch();
                      }
                      if (e.key === "Escape") {
                        setShowSearch(false);
                        setSearchTerm("");
                        setSearchMatches([]);
                      }
                    }}
                  />
                  <span className={styles.searchCount}>
                    {searchMatches.length > 0
                      ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                      : searchTerm ? "No matches" : ""}
                  </span>
                  <button className={styles.searchNavBtn} onClick={goToPrevMatch} disabled={searchMatches.length === 0}>↑</button>
                  <button className={styles.searchNavBtn} onClick={goToNextMatch} disabled={searchMatches.length === 0}>↓</button>
                  <button
                    className={styles.searchCloseBtn}
                    onClick={() => {
                      setShowSearch(false);
                      setSearchTerm("");
                      setSearchMatches([]);
                    }}
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Editor with Line Numbers */}
              <div className={styles.editorContainer}>
                <div className={styles.lineNumbers}>
                  {editContent.split("\n").map((_, i) => (
                    <div key={i} className={styles.lineNumber}>{i + 1}</div>
                  ))}
                </div>
                <textarea
                  ref={editorRef}
                  className={styles.editor}
                  value={editContent}
                  onChange={(e) => handleEditorChange(e.target.value)}
                  spellCheck={false}
                  onScroll={(e) => {
                    // Sync line numbers scroll with editor
                    const lineNumbers = e.currentTarget.previousElementSibling as HTMLElement;
                    if (lineNumbers) {
                      lineNumbers.scrollTop = e.currentTarget.scrollTop;
                    }
                  }}
                />
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  {saving ? "Saving..." : "Save Prompt (Ctrl+S)"}
                </button>
                {isDirty && (
                  <button
                    className={styles.resetBtn}
                    onClick={() => {
                      setEditContent(prompt.content);
                      setIsDirty(false);
                    }}
                  >
                    Reset (Escape)
                  </button>
                )}
                <button
                  className={styles.searchToggleBtn}
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (!showSearch) {
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }
                  }}
                >
                  {showSearch ? "Hide Search" : "Search (Ctrl+F)"}
                </button>
              </div>
            </div>
          ) : tab === "history" ? (
            <div>
              {history.length === 0 ? (
                <div className={styles.loading}>No version history yet</div>
              ) : (
                <ul className={styles.historyList}>
                  {history.map((v) => (
                    <li
                      key={v.contentHash}
                      className={`${styles.historyItem} ${v.isActive ? styles.historyItemActive : ""}`}
                    >
                      <div className={styles.historyMeta}>
                        <div className={styles.historyLabel}>
                          {v.versionLabel}
                          {v.isActive && (
                            <span className={styles.activeBadge}>ACTIVE</span>
                          )}
                        </div>
                        <div className={styles.historyHash}>
                          {v.contentHash.substring(0, 16)}...
                        </div>
                        <div className={styles.historyDate}>
                          Created: {new Date(v.createdUtc).toLocaleString()}
                          {v.activatedUtc && ` | Activated: ${new Date(v.activatedUtc).toLocaleString()}`}
                        </div>
                        <div className={styles.historyUsage}>
                          Used in {v.usageCount} analysis job{v.usageCount !== 1 ? "s" : ""}
                          {v.previousHash && ` | Previous: ${v.previousHash.substring(0, 8)}...`}
                        </div>
                      </div>
                      <div className={styles.historyActions}>
                        <button
                          className={styles.viewBtn}
                          onClick={() => handleViewVersion(v.contentHash, v.versionLabel)}
                          disabled={loadingVersion}
                        >
                          View
                        </button>
                        {v.previousHash && (
                          <button
                            className={styles.diffBtn}
                            onClick={() => compareWithPrevious(v)}
                            title="Compare with previous version"
                          >
                            Diff
                          </button>
                        )}
                        {!v.isActive && (
                          <button
                            className={styles.rollbackBtn}
                            onClick={() => handleRollback(v.contentHash)}
                          >
                            Rollback
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : tab === "files" ? (
            <div className={styles.filesTab}>
              <div className={styles.filesHeader}>
                <h3>Prompt Files for {pipeline}</h3>
                <button
                  className={styles.newFileBtn}
                  onClick={() => {
                    setNewFilename(`${pipeline}-new`);
                    setShowNewFileDialog(true);
                  }}
                >
                  + New Prompt File
                </button>
              </div>
              <ul className={styles.filesList}>
                {promptFiles.map((f) => (
                  <li key={f.filename} className={`${styles.fileItem} ${f.isActive ? styles.fileItemActive : ""}`}>
                    <div className={styles.fileInfo}>
                      <div className={styles.fileName}>
                        {f.filename}
                        {f.isActive && <span className={styles.activeBadge}>ACTIVE</span>}
                        {f.isDefault && <span className={styles.defaultBadge}>DEFAULT</span>}
                      </div>
                      <div className={styles.fileMeta}>
                        {f.version && <span>v{f.version}</span>}
                        {f.tokenEstimate && <span>~{Math.round(f.tokenEstimate / 1000)}k tokens</span>}
                        {f.description && <span className={styles.fileDescription}>{f.description}</span>}
                      </div>
                    </div>
                    <div className={styles.fileActions}>
                      {!f.isActive && (
                        <button
                          className={styles.fileActionBtn}
                          onClick={() => handleFileSwitch(f.filename)}
                          disabled={switchingFile}
                          title="Set as active"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        className={styles.fileActionBtn}
                        onClick={() => {
                          setNewFilename(`${f.filename.replace(".prompt.md", "")}-copy`);
                          setShowDuplicateDialog(f.filename);
                        }}
                        title="Duplicate file"
                      >
                        Duplicate
                      </button>
                      {!f.isDefault && (
                        <>
                          <button
                            className={styles.fileActionBtn}
                            onClick={() => {
                              setNewFilename(f.filename.replace(".prompt.md", ""));
                              setShowRenameDialog(f.filename);
                            }}
                            title="Rename file"
                          >
                            Rename
                          </button>
                          <button
                            className={`${styles.fileActionBtn} ${styles.fileActionBtnDanger}`}
                            onClick={() => handleDeleteFile(f.filename)}
                            title="Delete file"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : tab === "compare" ? (
            <div className={styles.compareTab}>
              <div className={styles.compareHeader}>
                <div className={styles.compareSelector}>
                  <label>Left:</label>
                  <select
                    value={leftSource ? JSON.stringify(leftSource) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setLeftSource(val ? JSON.parse(val) : null);
                    }}
                    className={styles.compareSelect}
                  >
                    <option value="">Select source...</option>
                    <optgroup label="Files">
                      {promptFiles.map((f) => (
                        <option key={`file-${f.filename}`} value={JSON.stringify({ type: "file", filename: f.filename })}>
                          {f.filename}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Versions">
                      {history.slice(0, 10).map((v) => (
                        <option key={`version-${v.contentHash}`} value={JSON.stringify({ type: "version", hash: v.contentHash, label: v.versionLabel })}>
                          {v.versionLabel} ({v.contentHash.substring(0, 8)}...)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      <option value={JSON.stringify({ type: "editor" })}>Current Editor</option>
                    </optgroup>
                  </select>
                </div>
                <div className={styles.compareSelector}>
                  <label>Right:</label>
                  <select
                    value={rightSource ? JSON.stringify(rightSource) : ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRightSource(val ? JSON.parse(val) : null);
                    }}
                    className={styles.compareSelect}
                  >
                    <option value="">Select source...</option>
                    <optgroup label="Files">
                      {promptFiles.map((f) => (
                        <option key={`file-${f.filename}`} value={JSON.stringify({ type: "file", filename: f.filename })}>
                          {f.filename}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Versions">
                      {history.slice(0, 10).map((v) => (
                        <option key={`version-${v.contentHash}`} value={JSON.stringify({ type: "version", hash: v.contentHash, label: v.versionLabel })}>
                          {v.versionLabel} ({v.contentHash.substring(0, 8)}...)
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Other">
                      <option value={JSON.stringify({ type: "editor" })}>Current Editor</option>
                    </optgroup>
                  </select>
                </div>
                <button
                  className={styles.compareBtn}
                  onClick={updateCompare}
                  disabled={!leftSource || !rightSource || loadingCompare}
                >
                  {loadingCompare ? "Loading..." : "Compare"}
                </button>
              </div>

              {(leftContent || rightContent) && (
                <>
                  {/* Diff Statistics */}
                  <div className={styles.diffStats}>
                    {(() => {
                      const stats = getDiffStats(leftContent, rightContent);
                      return (
                        <>
                          <span className={styles.diffStatsRemoved}>−{stats.removed} removed</span>
                          <span className={styles.diffStatsAdded}>+{stats.added} added</span>
                        </>
                      );
                    })()}
                  </div>

                  <div className={styles.compareView}>
                    <div className={styles.comparePane}>
                      <div className={styles.comparePaneHeader}>
                        <span>{getSourceLabel(leftSource)}</span>
                        {leftSource?.type !== "editor" && (
                          <button
                            className={styles.copyToEditorBtn}
                            onClick={() => copyToEditor(leftContent, getSourceLabel(leftSource))}
                          >
                            Use in Editor
                          </button>
                        )}
                      </div>
                      <div className={styles.comparePaneContent}>
                        {computeDiff(leftContent, rightContent).leftLines.map((line, i) => (
                          <div
                            key={i}
                            className={`${styles.diffLine} ${
                              line.type === "removed" ? styles.diffLineRemoved :
                              line.type === "same" && line.content === "" ? styles.diffLinePadding :
                              ""
                            }`}
                          >
                            <span className={styles.diffLineNum}>{line.content !== "" || line.type !== "same" ? i + 1 : ""}</span>
                            <span className={styles.diffLineContent}>{line.content || "\u00A0"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className={styles.comparePane}>
                      <div className={styles.comparePaneHeader}>
                        <span>{getSourceLabel(rightSource)}</span>
                        {rightSource?.type !== "editor" && (
                          <button
                            className={styles.copyToEditorBtn}
                            onClick={() => copyToEditor(rightContent, getSourceLabel(rightSource))}
                          >
                            Use in Editor
                          </button>
                        )}
                      </div>
                      <div className={styles.comparePaneContent}>
                        {computeDiff(leftContent, rightContent).rightLines.map((line, i) => (
                          <div
                            key={i}
                            className={`${styles.diffLine} ${
                              line.type === "added" ? styles.diffLineAdded :
                              line.type === "same" && line.content === "" ? styles.diffLinePadding :
                              ""
                            }`}
                          >
                            <span className={styles.diffLineNum}>{line.content !== "" || line.type !== "same" ? i + 1 : ""}</span>
                            <span className={styles.diffLineContent}>{line.content || "\u00A0"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {!leftContent && !rightContent && (
                <p className={styles.comparePlaceholder}>
                  Select sources to compare and click "Compare"
                </p>
              )}
            </div>
          ) : null}

          {/* New File Dialog */}
          {showNewFileDialog && (
            <div className={styles.modalOverlay} onClick={() => setShowNewFileDialog(false)}>
              <div className={styles.dialogModal} onClick={(e) => e.stopPropagation()}>
                <h3>Create New Prompt File</h3>
                <div className={styles.dialogField}>
                  <label>Filename:</label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder={`${pipeline}-name`}
                    className={styles.dialogInput}
                  />
                  <span className={styles.dialogHint}>.prompt.md will be added if not present</span>
                </div>
                <div className={styles.dialogActions}>
                  <button
                    className={styles.dialogBtnPrimary}
                    onClick={handleCreateFile}
                    disabled={fileOperating || !newFilename.trim()}
                  >
                    {fileOperating ? "Creating..." : "Create"}
                  </button>
                  <button
                    className={styles.dialogBtnSecondary}
                    onClick={() => setShowNewFileDialog(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate File Dialog */}
          {showDuplicateDialog && (
            <div className={styles.modalOverlay} onClick={() => setShowDuplicateDialog(null)}>
              <div className={styles.dialogModal} onClick={(e) => e.stopPropagation()}>
                <h3>Duplicate: {showDuplicateDialog}</h3>
                <div className={styles.dialogField}>
                  <label>New filename:</label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder={`${pipeline}-copy`}
                    className={styles.dialogInput}
                  />
                </div>
                <div className={styles.dialogActions}>
                  <button
                    className={styles.dialogBtnPrimary}
                    onClick={() => handleDuplicateFile(showDuplicateDialog)}
                    disabled={fileOperating || !newFilename.trim()}
                  >
                    {fileOperating ? "Duplicating..." : "Duplicate"}
                  </button>
                  <button
                    className={styles.dialogBtnSecondary}
                    onClick={() => setShowDuplicateDialog(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Rename File Dialog */}
          {showRenameDialog && (
            <div className={styles.modalOverlay} onClick={() => setShowRenameDialog(null)}>
              <div className={styles.dialogModal} onClick={(e) => e.stopPropagation()}>
                <h3>Rename: {showRenameDialog}</h3>
                <div className={styles.dialogField}>
                  <label>New filename:</label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder={`${pipeline}-renamed`}
                    className={styles.dialogInput}
                  />
                </div>
                <div className={styles.dialogActions}>
                  <button
                    className={styles.dialogBtnPrimary}
                    onClick={() => handleRenameFile(showRenameDialog)}
                    disabled={fileOperating || !newFilename.trim()}
                  >
                    {fileOperating ? "Renaming..." : "Rename"}
                  </button>
                  <button
                    className={styles.dialogBtnSecondary}
                    onClick={() => setShowRenameDialog(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Version Viewer Modal */}
          {viewingVersion && (
            <div className={styles.modalOverlay} onClick={() => setViewingVersion(null)}>
              <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2>Version: {viewingVersion.label}</h2>
                  <button
                    className={styles.modalClose}
                    onClick={() => setViewingVersion(null)}
                  >
                    ×
                  </button>
                </div>
                <div className={styles.modalMeta}>
                  <span>Hash: <code>{viewingVersion.hash.substring(0, 16)}...</code></span>
                  <span>Created: {new Date(viewingVersion.createdUtc).toLocaleString()}</span>
                </div>
                <div className={styles.modalActions}>
                  <button
                    className={`${styles.copyBtn} ${copySuccess ? styles.copySuccess : ""}`}
                    onClick={handleCopyVersion}
                  >
                    {copySuccess ? "Copied!" : "Copy to Clipboard"}
                  </button>
                  <button
                    className={styles.downloadBtn}
                    onClick={handleDownloadVersion}
                  >
                    Download as File
                  </button>
                </div>
                <textarea
                  className={styles.modalContent}
                  value={viewingVersion.content}
                  readOnly
                  spellCheck={false}
                />
              </div>
            </div>
          )}

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`${styles.statusMsg} ${
                statusMsg.type === "success" ? styles.statusSuccess : styles.statusError
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </>
      ) : (
        <div className={styles.loading}>No prompt data</div>
      )}
    </div>
  );
}
