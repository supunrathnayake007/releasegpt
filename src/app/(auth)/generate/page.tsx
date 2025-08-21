"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  FileText, Rocket, ClipboardCopy, Download, AlertTriangle, Sparkles, Layers, Folder, ListChecks, X
} from "lucide-react";
import { useSearchParams } from "next/navigation";

/** ---------- Types ---------- */
type Project = {
  id: string;
  name: string;
  jiraKey: string;
  devopsRepo: string;
  branch: string;
};

type TicketItem = { id: string; key: string; title: string; type?: string };
type CommitItem = { id: string; hash: string; message: string; author?: string; date?: string };

type ReleaseAI = {
  title: string;
  date: string;
  narrative: string[];
  sections: { heading: string; items: string[] }[];
  markdown: string;
};

type Template = {
  id: string;
  name: string;
  description?: string;
  content: string;
  updatedAt: string;
  isDefault?: boolean;
};

/** ---------- Constants / LS Keys ---------- */
const LS_PROJECTS = "projects:v1";
const LS_SELECTED_PREFIX = "projects:selected:v1:"; // + projectId
const LS_TEMPLATES = "templates:v1";

/** Default templates (kept to render markdown for copy/download; not shown on screen) */
const DEFAULT_TEMPLATES: Template[] = [
  {
    id: "classic",
    name: "Classic Release Notes",
    description: "Narrative + sections (Highlights, Features, Fixes, etc.)",
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
  }
];

/** ---------- Helpers ---------- */
function readProjects(): Project[] {
  try {
    const raw = localStorage.getItem(LS_PROJECTS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function readSelections(id: string): { tickets: string[]; commits: string[] } {
  try {
    const raw = localStorage.getItem(LS_SELECTED_PREFIX + id);
    return raw ? JSON.parse(raw) : { tickets: [], commits: [] };
  } catch {
    return { tickets: [], commits: [] };
  }
}
function writeSelections(id: string, sel: { tickets: string[]; commits: string[] }) {
  try {
    localStorage.setItem(LS_SELECTED_PREFIX + id, JSON.stringify(sel));
  } catch {}
}
function readTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(LS_TEMPLATES);
    const list = raw ? JSON.parse(raw) : null;
    if (Array.isArray(list) && list.length) return list as Template[];
    return DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
}

/** Render the API output into the chosen template (for export/copy only) */
function renderIntoTemplate(ai: ReleaseAI, project: Project, tpl: Template): string {
  const get = (h: string) =>
    ai.sections.find((s) => s.heading.toLowerCase() === h.toLowerCase())?.items ?? [];

  const bullets = (items: string[]) => (items.length ? items.map((i) => `- ${i}`).join("\n") : "- None");
  const paras = (ps: string[]) => (ps.length ? ps.join("\n\n") : "");

  const content = tpl.content
    .replaceAll("{{TITLE}}", ai.title)
    .replaceAll("{{DATE}}", ai.date)
    .replaceAll("{{PROJECT_NAME}}", project.name)
    .replaceAll("{{JIRA_KEY}}", project.jiraKey)
    .replaceAll("{{REPO}}", project.devopsRepo)
    .replaceAll("{{BRANCH}}", project.branch)
    .replaceAll("{{NARRATIVE}}", paras(ai.narrative))
    .replaceAll("{{HIGHLIGHTS}}", bullets(get("Highlights")))
    .replaceAll("{{FEATURES}}", bullets(get("New Features")))
    .replaceAll("{{FIXES}}", bullets(get("Bug Fixes")))
    .replaceAll("{{IMPROVEMENTS}}", bullets(get("Improvements")))
    .replaceAll("{{KNOWN_ISSUES}}", bullets(get("Known Issues")))
    .replaceAll("{{UPGRADE_NOTES}}", bullets(get("Upgrade Notes")))
    .replaceAll("{{CREDITS}}", bullets(get("Credits")))
    .replaceAll("{{CHANGELOG}}", bullets(get("Changelog")));

  return content;
}

/** Download a text file */
function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function PreselectFromQuery({
  onProject,
}: { onProject: (pid: string) => void }) {
  const search = useSearchParams();

  useEffect(() => {
    const pid = search.get("project");
    if (pid) onProject(pid);
  }, [search, onProject]);

  return null;
}


/** ---------- Page ---------- */
export default function GenerateNotesPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [selTickets, setSelTickets] = useState<string[]>([]);
  const [selCommits, setSelCommits] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);
  const [ai, setAi] = useState<ReleaseAI | null>(null);
  const [rendered, setRendered] = useState<string>("");

  // modal for selecting items
  const [pickerOpen, setPickerOpen] = useState(false);

  // Load initial data
  useEffect(() => {
    (async () => {
      const projs = readProjects();
      const tpls = readTemplates();
      setProjects(projs);
      setTemplates(tpls);
      if (projs[0]) {
        setSelectedProjectId(projs[0].id);
        const sel = readSelections(projs[0].id);
        setSelTickets(sel.tickets);
        setSelCommits(sel.commits);
      }
      if (tpls[0]) setSelectedTemplateId(tpls[0].id);

      // Load mock items (global, for simplicity)
      try {
        const [tj, cj] = await Promise.all([
          fetch("/mock/jira_tickets.json").then((r) => r.json()).catch(() => ({ tickets: [] })),
          fetch("/mock/devops_commits.json").then((r) => r.json()).catch(() => ({ commits: [] })),
        ]);
        setTickets((tj.tickets || []).slice(0, 100));
        setCommits((cj.commits || []).slice(0, 100));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Load selections from URL search params
  // const search = useSearchParams();
  // useEffect(() => {
  //   const pid = search.get("project");
  //   if (!pid) return;
  //   setSelectedProjectId(pid);
  //   const sel = readSelections(pid);
  //   setSelTickets(sel.tickets);
  //   setSelCommits(sel.commits);
  // }, [search]);

  // Update selections when project changes
  useEffect(() => {
    if (!selectedProjectId) return;
    const sel = readSelections(selectedProjectId);
    setSelTickets(sel.tickets);
    setSelCommits(sel.commits);
    setAi(null);
    setRendered("");
  }, [selectedProjectId]);

  const selectedProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId) || null,
    [projects, selectedProjectId]
  );
  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const canGenerate = useMemo(() => {
    return Boolean(selectedProject) && (selTickets.length + selCommits.length > 0);
  }, [selectedProject, selTickets.length, selCommits.length]);

  async function generate() {
    if (!selectedProject) return;
    try {
      setGenError(null);
      setGenLoading(true);
      setAi(null);
      setRendered("");

      const payload = {
        project: selectedProject,
        tickets: tickets.filter((t) => selTickets.includes(t.id)),
        commits: commits.filter((c) => selCommits.includes(c.id)),
      };

      const res = await fetch("/api/generateReleaseNote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: ReleaseAI = await res.json();
      setAi(data);

      const tpl = selectedTemplate ?? DEFAULT_TEMPLATES[0];
      const md = renderIntoTemplate(data, selectedProject, tpl);
      setRendered(md);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate";
      setGenError(msg);
    } finally {
      setGenLoading(false);
    }
  }

  function openPicker() {
    setPickerOpen(true);
  }
  function closePicker() {
    setPickerOpen(false);
  }
  function applyPicker(nextTickets: string[], nextCommits: string[]) {
    setSelTickets(nextTickets);
    setSelCommits(nextCommits);
    if (selectedProjectId) {
      writeSelections(selectedProjectId, { tickets: nextTickets, commits: nextCommits });
    }
    setPickerOpen(false);
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 h-28 animate-pulse" />
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl border bg-white/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Suspense fallback={null}>
  <PreselectFromQuery
    onProject={(pid) => {
      setSelectedProjectId(pid);
      const sel = readSelections(pid);
      setSelTickets(sel.tickets);
      setSelCommits(sel.commits);
    }}
  />
</Suspense>

      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Generate Notes</h1>
        </div>
        <p className="mt-2 text-white/90">
          Select a project and template, pick the items, then generate a polished draft. This uses your mock AI route and doesn’t change any data.
        </p>
      </div>

      {/* Step selectors */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Project */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Folder className="w-5 h-5 text-teal-700" />
            <h2 className="font-medium">1. Project</h2>
          </div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
          >
            {projects.length === 0 && <option value="">No projects</option>}
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.jiraKey})
              </option>
            ))}
          </select>
          {selectedProject && (
            <p className="mt-2 text-xs text-slate-600">
              Repo: <strong>{selectedProject.devopsRepo}</strong> @{selectedProject.branch}
            </p>
          )}
          <p className="mt-1 text-xs text-slate-500">
            Items default to selections made on the Project page. You can adjust them here.
          </p>
        </div>

        {/* Template */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-5 h-5 text-teal-700" />
            <h2 className="font-medium">2. Template</h2>
          </div>
          <select
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
          >
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-slate-500">
            Edit templates from <Link className="text-teal-700 hover:underline" href="/templates">Templates</Link>.
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-teal-700" />
            <h2 className="font-medium">3. Summary</h2>
          </div>
          <div className="text-sm text-slate-700">
            <div>
              Tickets selected: <strong>{selTickets.length}</strong>
            </div>
            <div>
              Commits selected: <strong>{selCommits.length}</strong>
            </div>
          </div>

          <button
            className="mt-3 mr-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
            onClick={openPicker}
          >
            <ListChecks className="w-4 h-4" />
            Pick items
          </button>

          {selTickets.length + selCommits.length === 0 && (
            <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              No items selected yet.
            </div>
          )}

          <button
            className="mt-3 inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-60"
            onClick={generate}
            disabled={!canGenerate || genLoading}
          >
            <Rocket className="w-4 h-4" />
            {genLoading ? "Generating…" : "Generate Draft"}
          </button>
          {genError && <p className="mt-2 text-sm text-rose-600">{genError}</p>}
        </div>
      </div>

      {/* Preview panel (taller, no raw Markdown) */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <h2 className="font-medium">Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              onClick={() => {
                if (rendered) navigator.clipboard.writeText(rendered);
              }}
              disabled={!rendered}
              aria-disabled={!rendered}
            >
              <ClipboardCopy className="w-3.5 h-3.5" />
              Copy Markdown
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
              onClick={() => {
                if (rendered) {
                  const base = selectedProject ? selectedProject.jiraKey : "release";
                  downloadText(`${base.toLowerCase()}-notes.md`, rendered);
                }
              }}
              disabled={!rendered}
              aria-disabled={!rendered}
            >
              <Download className="w-3.5 h-3.5" />
              Download .md
            </button>
          </div>
        </div>

        {ai ? (
          <div className="mt-4">
            {/* Single tall panel */}
            <div className="h-[860px] w-full overflow-auto rounded-md border bg-slate-50 p-4 text-sm leading-6">
              <div className="text-lg font-semibold">{ai.title}</div>
              <div className="text-xs text-slate-500">{ai.date}</div>

              {ai.narrative.map((n, i) => (
                <p key={i} className="mt-3">{n}</p>
              ))}

              {ai.sections.map((s, i) => (
                <div key={i} className="mt-4">
                  <div className="font-medium">{s.heading}</div>
                  {s.items.length ? (
                    <ul className="list-disc pl-5">
                      {s.items.map((it, j) => <li key={j}>{it}</li>)}
                    </ul>
                  ) : (
                    <div className="text-xs text-slate-500">None</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            No draft yet. Pick a project & template, then click <strong>Generate Draft</strong>.
          </p>
        )}
      </div>

      {/* Footer helper */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm text-sm text-slate-700">
        Want a different look? Adjust your template in{" "}
        <Link href="/templates" className="text-teal-700 hover:underline">Templates</Link>
        , then re-generate here.
      </div>

      {/* Picker Modal */}
      {pickerOpen && selectedProject && (
        <PickerModal
          tickets={tickets}
          commits={commits}
          selectedTickets={selTickets}
          selectedCommits={selCommits}
          onClose={closePicker}
          onApply={(t, c) => applyPicker(t, c)}
          projectName={selectedProject.name}
        />
      )}
    </div>
  );
}

/** ---------- Modal to select tickets/commits ---------- */
function PickerModal(props: {
  tickets: TicketItem[];
  commits: CommitItem[];
  selectedTickets: string[];
  selectedCommits: string[];
  onClose: () => void;
  onApply: (tickets: string[], commits: string[]) => void;
  projectName: string;
}) {
  const {
    tickets, commits, selectedTickets, selectedCommits, onClose, onApply, projectName
  } = props;

  const [tSel, setTSel] = useState<string[]>(selectedTickets);
  const [cSel, setCSel] = useState<string[]>(selectedCommits);
  const [tab, setTab] = useState<"tickets" | "commits">("tickets");
  const [tFilter, setTFilter] = useState("");
  const [cFilter, setCFilter] = useState("");

  const tView = useMemo(() => {
    const q = tFilter.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.type || "").toLowerCase().includes(q)
    );
  }, [tickets, tFilter]);

  const cView = useMemo(() => {
    const q = cFilter.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter((c) =>
      c.message.toLowerCase().includes(q) || (c.author || "").toLowerCase().includes(q) || c.hash.toLowerCase().includes(q)
    );
  }, [commits, cFilter]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
      
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="text-sm text-slate-500">Pick items for</div>
            <h4 className="font-medium">{projectName}</h4>
          </div>
          <button
            className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-2 border-b">
            {(["tickets", "commits"] as const).map((t) => (
              <button
                key={t}
                className={`px-4 py-2 text-sm ${tab === t ? "border-b-2 border-teal-600 text-teal-700" : "text-gray-600"}`}
                onClick={() => setTab(t)}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-4 grid gap-4 md:grid-cols-2">
          {/* Tickets panel */}
          <div className={`${tab === "tickets" ? "" : "opacity-40 pointer-events-none"}`}>
            <div className="flex items-center gap-2 mb-2">
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Filter tickets (key, title, type)…"
                value={tFilter}
                onChange={(e) => setTFilter(e.target.value)}
              />
            </div>
            <div className="h-64 overflow-auto rounded-md border">
              <ul className="divide-y">
                {tView.map((t) => {
                  const checked = tSel.includes(t.id);
                  return (
                    <li key={t.id} className="p-2 text-sm flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setTSel((prev) =>
                            e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)
                          )
                        }
                      />
                      <div>
                        <div className="font-medium">{t.key} — {t.title}</div>
                        {t.type && <div className="text-xs text-slate-500">{t.type}</div>}
                      </div>
                    </li>
                  );
                })}
                {tView.length === 0 && <li className="p-3 text-sm text-slate-500">No tickets match.</li>}
              </ul>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Selected: {tSel.length}
            </div>
          </div>

          {/* Commits panel */}
          <div className={`${tab === "commits" ? "" : "opacity-40 pointer-events-none"}`}>
            <div className="flex items-center gap-2 mb-2">
              <input
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Filter commits (message, author, hash)…"
                value={cFilter}
                onChange={(e) => setCFilter(e.target.value)}
              />
            </div>
            <div className="h-64 overflow-auto rounded-md border">
              <ul className="divide-y">
                {cView.map((c) => {
                  const checked = cSel.includes(c.id);
                  return (
                    <li key={c.id} className="p-2 text-sm flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setCSel((prev) =>
                            e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                          )
                        }
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {c.message} <span className="text-slate-500">({c.hash.slice(0, 7)})</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {c.author || "unknown"} {c.date ? `• ${c.date}` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
                {cView.length === 0 && <li className="p-3 text-sm text-slate-500">No commits match.</li>}
              </ul>
            </div>
            <div className="mt-2 text-xs text-slate-500">
              Selected: {cSel.length}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t p-4">
          <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onClose}>
            Cancel
          </button>
          <button
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
            onClick={() => onApply(tSel, cSel)}
          >
            Apply selection
          </button>
        </div>
      </div>
    </div>
  );
}
