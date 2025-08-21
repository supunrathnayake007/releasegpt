"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FileText, Plus, Save, Copy, Trash2, RotateCcw, Edit3, Check, X, Search, Layers, Sparkles
} from "lucide-react";

/** ---------------- Types ---------------- */
type Template = {
  id: string;
  name: string;
  description?: string;
  content: string;
  updatedAt: string; // ISO
  isDefault?: boolean;
};

type SampleContext = {
  title: string;
  date: string;
  project: { name: string; jiraKey: string; repo: string; branch: string };
  narrative: string[];
  highlights: string[];
  features: string[];
  fixes: string[];
  improvements: string[];
  knownIssues: string[];
  upgradeNotes: string[];
  credits: string[];
  changelog: string[];
};

/** ---------------- Constants ---------------- */
const LS_KEY = "templates:v1";

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "classic",
    name: "Classic Release Notes",
    description: "Sections for Highlights, Features, Fixes, Improvements + narrative.",
    updatedAt: new Date().toISOString(),
    isDefault: true,
    content: `# {{TITLE}}

{{NARRATIVE}}

## Highlights
{{HIGHLIGHTS}}

## New Features
{{FEATURES}}

## Bug Fixes
{{FIXES}}

## Improvements
{{IMPROVEMENTS}}

## Known Issues
{{KNOWN_ISSUES}}

## Upgrade Notes
{{UPGRADE_NOTES}}

## Credits
{{CREDITS}}

## Changelog
{{CHANGELOG}}
`
  },
  {
    id: "concise",
    name: "Concise (Email style)",
    description: "Short intro + bullets for quick email updates.",
    updatedAt: new Date().toISOString(),
    isDefault: true,
    content: `**{{PROJECT_NAME}} — {{DATE}}**

{{NARRATIVE}}

**Highlights**
{{HIGHLIGHTS}}

**Changes**
- Features:
{{FEATURES}}
- Fixes:
{{FIXES}}
- Improvements:
{{IMPROVEMENTS}}
`
  },
  {
    id: "product-marketing",
    name: "Product Marketing",
    description: "Narrative-first with callouts.",
    updatedAt: new Date().toISOString(),
    isDefault: true,
    content: `# What's new in {{PROJECT_NAME}} ({{DATE}})

> This release focuses on reliability and visibility for operations teams.

{{NARRATIVE}}

### Top 3 Highlights
{{HIGHLIGHTS}}

### Feature details
{{FEATURES}}

### Fixes & polish
{{FIXES}}

*Generated with ❤️ by your Release Assistant.*
`
  }
];

/** ---------------- Helpers ---------------- */
function readTemplates(): Template[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    // Quick validation
    const ok = parsed.every(
      (t) =>
        t && typeof t.id === "string" && typeof t.name === "string" && typeof t.content === "string"
    );
    return ok ? (parsed as Template[]) : null;
  } catch {
    return null;
  }
}

function writeTemplates(list: Template[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function newId(): string {
  if (
    typeof window !== "undefined" &&
    typeof window.crypto?.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

/** Simple sample data for preview (SkyRoute vibe) */
const SAMPLE: SampleContext = {
  title: "SkyRoute — Release Notes",
  date: new Date().toISOString().slice(0, 10),
  project: { name: "SkyRoute - AI Drone Logistics", jiraKey: "SR", repo: "team/skyroute-service", branch: "main" },
  narrative: [
    "This release pushes SkyRoute closer to reliable, real-world operations. Our focus was making autonomous routing smarter in tough conditions while giving operators better visibility into live missions.",
    "From wind-aware path planning to faster LIDAR processing, the system is more resilient and responsive. Operators also get a clearer control surface through an updated fleet dashboard."
  ],
  highlights: [
    "Wind-aware routing for safer autonomous flights.",
    "Live fleet monitoring dashboard with richer telemetry.",
    "Lower latency in obstacle detection pipeline."
  ],
  features: [
    "SR-101: Optimize drone routing for heavy winds",
    "SR-103: Add dashboard for live fleet monitoring"
  ],
  fixes: [
    "SR-102: Fix battery overheating alert issue"
  ],
  improvements: [
    "perf: optimize LIDAR data processing (f51c8d9)",
    "ui: refine telemetry rendering (c81d5a7)"
  ],
  knownIssues: [
    "Occasional jitter in drone icon at <2s telemetry intervals.",
    "Brief pause during route recompute under extreme wind spikes."
  ],
  upgradeNotes: [
    "No schema migrations.",
    "Check new wind-compensation toggle in project settings."
  ],
  credits: ["Alice", "Bob", "Chathumi", "Chanuka", "Supun"],
  changelog: [
    "feat: add wind compensation to route planner (d91a2b3) — Alice on 2025-08-15",
    "fix: prevent false overheating alerts (a73ff21) — Bob on 2025-08-16",
    "ui: new dashboard for fleet live tracking (c81d5a7) — Chathumi on 2025-08-18",
    "perf: optimize LIDAR data processing (f51c8d9) — Chanuka on 2025-08-19"
  ]
};

/** Render preview by replacing supported tokens with Markdown */
function bullets(items: string[]): string {
  if (!items.length) return "- None";
  return items.map((i) => `- ${i}`).join("\n");
}

function paragraphs(items: string[]): string {
  return items.join("\n\n");
}

function renderTemplate(content: string, ctx: SampleContext): string {
  return content
    .replaceAll("{{TITLE}}", ctx.title)
    .replaceAll("{{DATE}}", ctx.date)
    .replaceAll("{{PROJECT_NAME}}", ctx.project.name)
    .replaceAll("{{JIRA_KEY}}", ctx.project.jiraKey)
    .replaceAll("{{REPO}}", ctx.project.repo)
    .replaceAll("{{BRANCH}}", ctx.project.branch)
    .replaceAll("{{NARRATIVE}}", paragraphs(ctx.narrative))
    .replaceAll("{{HIGHLIGHTS}}", bullets(ctx.highlights))
    .replaceAll("{{FEATURES}}", bullets(ctx.features))
    .replaceAll("{{FIXES}}", bullets(ctx.fixes))
    .replaceAll("{{IMPROVEMENTS}}", bullets(ctx.improvements))
    .replaceAll("{{KNOWN_ISSUES}}", bullets(ctx.knownIssues))
    .replaceAll("{{UPGRADE_NOTES}}", bullets(ctx.upgradeNotes))
    .replaceAll("{{CREDITS}}", bullets(ctx.credits))
    .replaceAll("{{CHANGELOG}}", bullets(ctx.changelog));
}

/** ---------------- Page ---------------- */
export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [activeId, setActiveId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [filter, setFilter] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // Load from LS or optional /mock/templates.json once
  useEffect(() => {
    (async () => {
      const saved = readTemplates();
      if (saved && saved.length) {
        setTemplates(saved);
        setActiveId(saved[0].id);
        return;
      }
      // optional mock file; ignore if missing
      try {
        const res = await fetch("/mock/templates.json");
        if (res.ok) {
          const json = (await res.json()) as Template[];
          if (Array.isArray(json) && json.length) {
            setTemplates(json);
            setActiveId(json[0].id);
            writeTemplates(json);
            return;
          }
        }
      } catch {
        // ignore
      }
      // else keep defaults and persist
      writeTemplates(DEFAULT_TEMPLATES);
    })();
  }, []);

  // Persist on change
  useEffect(() => {
    writeTemplates(templates);
  }, [templates]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1800);
    return () => clearTimeout(t);
  }, [toast]);

  const active = useMemo(
    () => templates.find((t) => t.id === activeId) ?? null,
    [templates, activeId]
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q)
    );
  }, [templates, filter]);

  function updateActiveContent(next: string) {
    setTemplates((prev) =>
      prev.map((t) =>
        t.id === activeId ? { ...t, content: next, updatedAt: new Date().toISOString() } : t
      )
    );
  }

  function duplicateTemplate(id: string) {
    const base = templates.find((t) => t.id === id);
    if (!base) return;
    const dup: Template = {
      ...base,
      id: newId(),
      name: `${base.name} (Copy)`,
      isDefault: false,
      updatedAt: new Date().toISOString(),
    };
    setTemplates((prev) => [dup, ...prev]);
    setActiveId(dup.id);
    setToast("Template duplicated");
  }

  function deleteTemplate(id: string) {
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const keep = templates.filter((x) => x.id !== id);
    setTemplates(keep.length ? keep : DEFAULT_TEMPLATES);
    setActiveId((keep[0] || DEFAULT_TEMPLATES[0]).id);
    setToast("Template deleted");
  }

  function resetTemplate(id: string) {
    const def = DEFAULT_TEMPLATES.find((t) => t.id === id);
    if (!def) return;
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...def, updatedAt: new Date().toISOString() } : t))
    );
    setToast("Reset to default");
  }

  function createTemplate() {
    const fresh: Template = {
      id: newId(),
      name: "New Template",
      description: "Start customizing your release note format.",
      content: `# {{TITLE}}

{{NARRATIVE}}

## Highlights
{{HIGHLIGHTS}}

## Changes
- Features:
{{FEATURES}}
- Fixes:
{{FIXES}}
- Improvements:
{{IMPROVEMENTS}}
`,
      updatedAt: new Date().toISOString(),
      isDefault: false,
    };
    setTemplates((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  }

  function startRename(id: string, current: string) {
    setRenamingId(id);
    setRenameVal(current);
  }
  function applyRename() {
    if (!renamingId) return;
    const val = renameVal.trim();
    if (val.length < 2) {
      setToast("Name too short");
      return;
    }
    setTemplates((prev) =>
      prev.map((t) => (t.id === renamingId ? { ...t, name: val } : t))
    );
    setRenamingId(null);
    setToast("Renamed");
  }

  const preview = useMemo(() => {
    return active ? renderTemplate(active.content, SAMPLE) : "";
  }, [active]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Layers className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Templates</h1>
        </div>
        <p className="mt-2 text-white/90">
          Customize how your release notes are formatted. Changes here don’t affect generation yet — perfect for prototyping.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={createTemplate}
            className="rounded-xl bg-white/90 px-4 py-2 text-sm text-teal-700 hover:bg-white inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New template
          </button>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Sidebar */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-3">
          <div className="rounded-2xl border bg-white p-3">
            <div className="flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                className="w-full outline-none text-sm"
                placeholder="Search templates…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-2">
            <ul className="max-h-[60vh] overflow-auto">
              {filtered.map((t) => {
                const activeCls = t.id === activeId ? "border-teal-500 ring-1 ring-teal-500/30" : "border-transparent";
                return (
                  <li
                    key={t.id}
                    className={`mb-2 last:mb-0 rounded-xl border bg-white hover:bg-slate-50 transition ${activeCls}`}
                  >
                    <button
                      className="w-full text-left px-3 py-2"
                      onClick={() => setActiveId(t.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-teal-700" />
                          <span className="font-medium text-sm">{t.name}</span>
                        </div>
                        {t.isDefault && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">Default</span>
                        )}
                      </div>
                      {t.description && <div className="text-xs text-slate-500 mt-1">{t.description}</div>}
                      <div className="mt-1 text-[10px] text-slate-400">Updated {new Date(t.updatedAt).toLocaleString()}</div>
                    </button>

                    {/* Row actions */}
                    <div className="flex items-center gap-2 px-3 pb-2">
                      {renamingId === t.id ? (
                        <>
                          <input
                            className="flex-1 rounded-md border px-2 py-1 text-xs"
                            value={renameVal}
                            onChange={(e) => setRenameVal(e.target.value)}
                            autoFocus
                          />
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={applyRename}
                            aria-label="Confirm rename"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          </button>
                          <button
                            className="rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => setRenamingId(null)}
                            aria-label="Cancel rename"
                          >
                            <X className="w-3.5 h-3.5 text-rose-600" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => startRename(t.id, t.name)}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Rename
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                            onClick={() => duplicateTemplate(t.id)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Duplicate
                          </button>
                          {!t.isDefault && (
                            <button
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                              onClick={() => deleteTemplate(t.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Delete
                            </button>
                          )}
                          {t.isDefault && (
                            <button
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-slate-50"
                              onClick={() => resetTemplate(t.id)}
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="p-3 text-sm text-slate-500">No templates match your search.</li>
              )}
            </ul>
          </div>
        </aside>

        {/* Editor + Preview */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-3">
          {active ? (
            <>
              <div className="rounded-2xl border bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-700" />
                    <h2 className="font-medium">{active.name}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                      onClick={() => {
                        writeTemplates(templates);
                        setToast("Saved");
                      }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      Save
                    </button>
                    <button
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                      onClick={() => {
                        navigator.clipboard.writeText(preview);
                        setToast("Copied preview");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Copy Markdown
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {/* Editor */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Template (Markdown + tokens)</div>
                    <textarea
                      className="h-[360px] w-full rounded-md border px-3 py-2 text-sm font-mono"
                      value={active.content}
                      onChange={(e) => updateActiveContent(e.target.value)}
                      spellCheck={false}
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Supported tokens:{" "}
                      <code className="font-mono">{"{{TITLE}}, {{DATE}}, {{PROJECT_NAME}}, {{JIRA_KEY}}, {{REPO}}, {{BRANCH}}"}</code>
                      , list tokens:{" "}
                      <code className="font-mono">{"{{NARRATIVE}}, {{HIGHLIGHTS}}, {{FEATURES}}, {{FIXES}}, {{IMPROVEMENTS}}, {{KNOWN_ISSUES}}, {{UPGRADE_NOTES}}, {{CREDITS}}, {{CHANGELOG}}"}</code>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Preview (with sample data)</div>
                    <pre className="h-[360px] w-full overflow-auto rounded-md border bg-slate-50 p-3 text-sm leading-6 whitespace-pre-wrap">
{preview}
                    </pre>
                    <div className="mt-2 text-xs text-slate-500">
                      This is a Markdown preview populated with fictional SkyRoute data.
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-white p-6 text-slate-600">
              Select or create a template to start editing.
            </div>
          )}

          {/* Helper panel */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="text-sm font-medium mb-2">Tips</div>
            <ul className="text-sm text-slate-700 list-disc pl-5 space-y-1">
              <li>Use tokens for dynamic fields (e.g., <code className="font-mono">{"{{TITLE}}"}</code>).</li>
              <li>List tokens expand into bullet points automatically.</li>
              <li>You can duplicate & tweak a template to A/B test formats in your demo.</li>
            </ul>
          </div>
        </main>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-xl bg-slate-900 text-white text-sm px-3 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
