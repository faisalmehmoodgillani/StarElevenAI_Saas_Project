"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  Terminal,
  Table2,
  Download,
  ChevronDown,
  ChevronRight,
  BrainCircuit,
} from "lucide-react";

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

type CellAlign = "left" | "center" | "right";

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-[#27272A] bg-[#09090B] shadow-inner">
      <div className="flex items-center justify-between border-b border-[#27272A] bg-[#121215] px-3.5 py-2">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
          <Terminal className="h-3.5 w-3.5 text-[#84CC16]" />
          <span>{language || "code"}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-[#84CC16]" />
              <span className="text-[#A3E635]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-zinc-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) trimmed = trimmed.slice(1);
  if (trimmed.endsWith("|")) trimmed = trimmed.slice(0, -1);
  return trimmed.split("|").map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  const cells = splitTableRow(line);
  if (cells.length === 0) return false;
  return cells.every((cell) => /^:?-{2,}:?$/.test(cell));
}

function parseAlignments(separatorLine: string): CellAlign[] {
  return splitTableRow(separatorLine).map((cell) => {
    const startsColon = cell.startsWith(":");
    const endsColon = cell.endsWith(":");
    if (startsColon && endsColon) return "center";
    if (endsColon) return "right";
    return "left";
  });
}

function TableBlock({
  headers,
  alignments,
  rows,
}: {
  headers: string[];
  alignments: CellAlign[];
  rows: string[][];
}) {
  const [copiedCsv, setCopiedCsv] = useState(false);

  const handleCopyCsv = async () => {
    const escapeCsv = (val: string) =>
      `"${val.replace(/\*\*/g, "").replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((r) => r.map(escapeCsv).join(",")),
    ];
    await navigator.clipboard.writeText(csvLines.join("\n"));
    setCopiedCsv(true);
    setTimeout(() => setCopiedCsv(false), 1800);
  };

  const getAlignClass = (idx: number) => {
    const align = alignments[idx] || "left";
    if (align === "center") return "text-center";
    if (align === "right") return "text-right";
    return "text-left";
  };

  return (
    <div className="my-3.5 overflow-hidden rounded-xl border border-[#27272A] bg-[#09090B] shadow-lg">
      {/* Table Header Strip */}
      <div className="flex items-center justify-between border-b border-[#27272A] bg-[#121215] px-3.5 py-2">
        <div className="flex items-center gap-2 font-mono text-[11px] text-zinc-400">
          <Table2 className="h-3.5 w-3.5 text-[#84CC16]" />
          <span className="font-semibold text-zinc-200">Structured Output</span>
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
            {rows.length} {rows.length === 1 ? "row" : "rows"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopyCsv}
          className="inline-flex items-center gap-1 rounded-md border border-[#27272A] bg-[#18181B] px-2 py-1 text-[11px] text-zinc-300 transition hover:border-[#84CC16]/50 hover:text-[#A3E635]"
          title="Copy table as CSV"
        >
          {copiedCsv ? (
            <>
              <Check className="h-3 w-3 text-[#84CC16]" />
              <span className="text-[#A3E635]">CSV Copied</span>
            </>
          ) : (
            <>
              <Download className="h-3 w-3" />
              <span>Copy CSV</span>
            </>
          )}
        </button>
      </div>

      {/* Responsive Scrollable Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#27272A] bg-[#141418]">
              {headers.map((header, idx) => (
                <th
                  key={idx}
                  className={`whitespace-nowrap px-3.5 py-2.5 font-semibold tracking-wide text-[#A3E635] ${getAlignClass(
                    idx
                  )}`}
                >
                  {renderInline(header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#27272A]/80">
            {rows.map((row, rIdx) => (
              <tr
                key={rIdx}
                className="transition-colors odd:bg-[#09090B] even:bg-[#101014] hover:bg-[#84CC16]/[0.06]"
              >
                {headers.map((_, cIdx) => (
                  <td
                    key={cIdx}
                    className={`px-3.5 py-2.5 align-top leading-relaxed text-zinc-200 ${getAlignClass(
                      cIdx
                    )}`}
                  >
                    {renderInline(row[cIdx] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReasoningAccordion({ thought }: { thought: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!thought.trim()) return null;

  return (
    <div className="mb-3 rounded-xl border border-[#27272A] bg-[#09090B]/90">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-[11px] font-mono text-zinc-400 transition hover:text-zinc-200"
      >
        <span className="inline-flex items-center gap-1.5">
          <BrainCircuit className="h-3.5 w-3.5 text-amber-400" />
          <span>Agent Reasoning Trace</span>
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-[#27272A] px-3.5 py-2.5 font-mono text-[11px] leading-relaxed text-zinc-400 whitespace-pre-wrap">
          {thought.trim()}
        </div>
      )}
    </div>
  );
}

/**
 * Sanitizes incomplete trailing Markdown markers during live token streaming
 * so raw '**' or '`' characters do not flash before their closing pair arrives.
 */
function sanitizeStreamingInline(text: string, isStreaming?: boolean): string {
  if (!isStreaming) return text;
  let cleaned = text;
  const doubleStarMatches = cleaned.match(/\*\*/g);
  if (doubleStarMatches && doubleStarMatches.length % 2 === 1) {
    const lastIdx = cleaned.lastIndexOf("**");
    cleaned = cleaned.slice(0, lastIdx) + cleaned.slice(lastIdx + 2);
  }
  return cleaned;
}

function renderInline(
  rawText: string,
  isStreaming?: boolean
): React.ReactNode[] {
  const text = sanitizeStreamingInline(rawText, isStreaming);

  const tokenRegex =
    /(\*\*\*[\s\S]+?\*\*\*|\*\*[\s\S]+?\*\*|__[\s\S]+?__|\*[^*\n]+?\*|_[^_\n]+?_|~~[\s\S]+?~~|`[^`\n]+?`|\[[^\]]+\]\([^)]+\))/g;

  const tokens = text.split(tokenRegex);

  return tokens.map((token, idx) => {
    if (!token) return null;

    // ***Bold Italic***
    if (
      token.startsWith("***") &&
      token.endsWith("***") &&
      token.length > 6
    ) {
      return (
        <strong key={idx} className="font-bold italic text-white">
          {token.slice(3, -3)}
        </strong>
      );
    }

    // **Bold** or __Bold__
    if (
      ((token.startsWith("**") && token.endsWith("**")) ||
        (token.startsWith("__") && token.endsWith("__"))) &&
      token.length > 4
    ) {
      return (
        <strong key={idx} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }

    // *Italic* or _Italic_
    if (
      ((token.startsWith("*") && token.endsWith("*")) ||
        (token.startsWith("_") && token.endsWith("_"))) &&
      token.length > 2
    ) {
      return (
        <em key={idx} className="italic text-zinc-200">
          {token.slice(1, -1)}
        </em>
      );
    }

    // ~~Strikethrough~~
    if (token.startsWith("~~") && token.endsWith("~~") && token.length > 4) {
      return (
        <del key={idx} className="text-zinc-500 line-through">
          {token.slice(2, -2)}
        </del>
      );
    }

    // `Inline Code`
    if (token.startsWith("`") && token.endsWith("`") && token.length > 2) {
      return (
        <code
          key={idx}
          className="rounded border border-[#27272A] bg-[#09090B] px-1.5 py-0.5 font-mono text-[12px] text-[#A3E635]"
        >
          {token.slice(1, -1)}
        </code>
      );
    }

    // [Link](url)
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      const safeHref = /^https?:\/\//i.test(href) ? href : `https://${href}`;
      return (
        <a
          key={idx}
          href={safeHref}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-[#A3E635] underline decoration-[#84CC16]/50 underline-offset-2 transition hover:text-[#84CC16]"
        >
          {label}
        </a>
      );
    }

    return <React.Fragment key={idx}>{token}</React.Fragment>;
  });
}

function renderMarkdownBlocks(
  markdown: string,
  isStreaming?: boolean
): React.ReactNode[] {
  const lines = markdown.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Empty spacer line
    if (!trimmed) {
      nodes.push(<div key={`sp-${i}`} className="h-1.5" />);
      i++;
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^([-*_]){3,}$/.test(trimmed)) {
      nodes.push(<hr key={`hr-${i}`} className="my-3.5 border-[#27272A]" />);
      i++;
      continue;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const titleText = headingMatch[2];
      if (level === 1) {
        nodes.push(
          <h2
            key={`h1-${i}`}
            className="pt-2 text-lg font-bold tracking-tight text-white"
          >
            {renderInline(titleText, isStreaming)}
          </h2>
        );
      } else if (level === 2) {
        nodes.push(
          <h3
            key={`h2-${i}`}
            className="pt-2 text-base font-bold text-white"
          >
            {renderInline(titleText, isStreaming)}
          </h3>
        );
      } else {
        nodes.push(
          <h4
            key={`h3-${i}`}
            className="pt-1.5 text-sm font-semibold text-[#A3E635]"
          >
            {renderInline(titleText, isStreaming)}
          </h4>
        );
      }
      i++;
      continue;
    }

    // GFM Table Detection (Header row + separator row '|---|---|')
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRow(trimmed);
      const alignments = parseAlignments(lines[i + 1]);
      const rows: string[][] = [];
      i += 2; // Skip header & separator

      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes("|")) break;
        // Skip duplicate separator lines if model emits any
        if (!isTableSeparator(rowLine)) {
          rows.push(splitTableRow(rowLine));
        }
        i++;
      }

      nodes.push(
        <TableBlock
          key={`tbl-${i}`}
          headers={headers}
          alignments={alignments}
          rows={rows}
        />
      );
      continue;
    }

    // Blockquote (> ...)
    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      nodes.push(
        <blockquote
          key={`bq-${i}`}
          className="my-2.5 rounded-r-xl border-l-2 border-[#84CC16] bg-[#09090B]/80 px-3.5 py-2 text-xs italic leading-relaxed text-zinc-300"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx}>{renderInline(qLine, isStreaming)}</p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Unordered Bullet List (-, *, + with optional indentation)
    const bulletMatch = line.match(/^(\s*)([-*+])\s+(.+)$/);
    if (bulletMatch) {
      const listItems: { indent: number; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)([-*+])\s+(.+)$/);
        if (!m) break;
        listItems.push({
          indent: Math.min(Math.floor(m[1].length / 2), 3),
          text: m[3],
        });
        i++;
      }
      nodes.push(
        <ul key={`ul-${i}`} className="my-1.5 space-y-1.5">
          {listItems.map((item, idx) => (
            <li
              key={idx}
              style={{ paddingLeft: `${item.indent * 16 + 4}px` }}
              className="flex items-start gap-2.5"
            >
              <span
                className={`mt-2 shrink-0 rounded-full ${
                  item.indent > 0
                    ? "h-1.5 w-1.5 border border-[#84CC16]"
                    : "h-1.5 w-1.5 bg-[#84CC16]"
                }`}
              />
              <span className="min-w-0 flex-1">
                {renderInline(item.text, isStreaming)}
              </span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered Numbered List (1. , 2. )
    const orderedMatch = line.match(/^(\s*)(\d+)[.)]\s+(.+)$/);
    if (orderedMatch) {
      const orderedItems: { num: string; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].match(/^(\s*)(\d+)[.)]\s+(.+)$/);
        if (!m) break;
        orderedItems.push({ num: m[2], text: m[3] });
        i++;
      }
      nodes.push(
        <ol key={`ol-${i}`} className="my-1.5 space-y-1.5">
          {orderedItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 pl-1">
              <span className="mt-0.5 inline-flex min-w-[20px] shrink-0 items-center justify-center rounded bg-[#84CC16]/15 px-1 font-mono text-[11px] font-semibold text-[#A3E635]">
                {item.num}.
              </span>
              <span className="min-w-0 flex-1">
                {renderInline(item.text, isStreaming)}
              </span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Standard Paragraph Line
    nodes.push(
      <p key={`p-${i}`} className="whitespace-pre-wrap leading-relaxed">
        {renderInline(line, isStreaming)}
      </p>
    );
    i++;
  }

  return nodes;
}

export function MarkdownRenderer({
  content,
  isStreaming = false,
}: MarkdownRendererProps) {
  // Separate optional <think>...</think> reasoning block if emitted by model
  let thoughtText = "";
  let visibleContent = content;

  const thinkMatch = visibleContent.match(/^<think>([\s\S]*?)(?:<\/think>|$)/i);
  if (thinkMatch) {
    thoughtText = thinkMatch[1] || "";
    visibleContent = visibleContent
      .replace(/^<think>[\s\S]*?(?:<\/think>|$)/i, "")
      .trimStart();
  }

  // Split by fenced code blocks (supports unclosed code blocks during streaming)
  const segments = visibleContent.split(/(```[\s\S]*?(?:```|$))/g);

  return (
    <div className="space-y-1.5 text-sm leading-relaxed text-zinc-200">
      {thoughtText && <ReasoningAccordion thought={thoughtText} />}

      {segments.map((segment, index) => {
        if (!segment) return null;

        if (segment.startsWith("```")) {
          const withoutOpening = segment.slice(3);
          const withoutClosing = withoutOpening.endsWith("```")
            ? withoutOpening.slice(0, -3)
            : withoutOpening;

          const lines = withoutClosing.split("\n");
          const firstLine = lines[0]?.trim() || "";
          const hasLang = /^[a-zA-Z0-9_+-]+$/.test(firstLine);
          const lang = hasLang ? firstLine : "code";
          const codeBody = (hasLang ? lines.slice(1) : lines).join("\n").trim();

          return <CodeBlock key={`code-${index}`} language={lang} code={codeBody} />;
        }

        return (
          <React.Fragment key={`blk-${index}`}>
            {renderMarkdownBlocks(segment, isStreaming)}
          </React.Fragment>
        );
      })}

      {isStreaming && (
        <span className="ml-1 inline-block h-4 w-2 animate-pulse rounded-xs bg-[#A3E635] align-middle shadow-[0_0_10px_#84CC16]" />
      )}
    </div>
  );
}