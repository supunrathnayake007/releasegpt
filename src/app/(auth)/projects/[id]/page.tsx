"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, GitCommit, Ticket, FileText, Search, ListChecks
} from "lucide-react";

/** ---------------- ClientOnly ---------------- */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/** ---------------- Types ---------------- */
type ProjectRow = {
  id: string;
  name: string;
  jiraKey: string;
  devopsRepo: string;
  branch: string;
};

type TicketItem = { id: string; key: string; title: string; type?: string };
type CommitItem = { id: string; hash: string; message: string; author?: string; date?: string };

/** ---------------- LS Keys & Helpers ---------------- */
const LS_PROJECTS = "projects:v1";
const LS_SELECTED_PREFIX = "projects:selected:v1:"; // + projectId

function readProjects(): ProjectRow[] {
  try {
    const raw = localStorage.getItem(LS_PROJECTS);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function readSelected(projectId: string) {
  try {
    const raw = localStorage.getItem(LS_SELECTED_PREFIX + projectId);
    return raw ? JSON.parse(raw) as { tickets: string[]; commits: string[] } : { tickets: [], commits: [] };
  } catch {
    return { tickets: [], commits: [] };
  }
}

function writeSelected(projectId: string, data: { tickets: string[]; commits: string[] }) {
  try {
    localStorage.setItem(LS_SELECTED_PREFIX + projectId, JSON.stringify(data));
  } catch {
    // ignore
  }
}

/** ---------------- Page ---------------- */
export default function ProjectDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = params?.id;
  const id = Array.isArray(idParam) ? idParam[0] : idParam || "";

  return (
    <ClientOnly>
      <ProjectDetailInner id={id} />
    </ClientOnly>
  );
}

/** ---------------- Inner Component ---------------- */
function ProjectDetailInner({ id }: { id: string }) {
  const [project, setProject] = useState<ProjectRow | null>(null);

  type Tab = "overview" | "tickets" | "commits" | "generate";
  const [tab, setTab] = useState<Tab>("overview");

  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [commits, setCommits] = useState<CommitItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectedCommits, setSelectedCommits] = useState<string[]>([]);

  // Filters
  const [tFilter, setTFilter] = useState("");
  const [cFilter, setCFilter] = useState("");

  // Load project, selections, and mock data
  useEffect(() => {
    if (!id) return;

    const list = readProjects();
    const p = list.find((x) => x.id === id) ?? null;
    setProject(p);

    const sel = readSelected(id);
    setSelectedTickets(sel.tickets || []);
    setSelectedCommits(sel.commits || []);

    async function load() {
      try {
        const [tj, cj] = await Promise.all([
          fetch("/mock/jira_tickets.json").then((r) => r.json()).catch(() => ({ tickets: [] })),
          fetch("/mock/devops_commits.json").then((r) => r.json()).catch(() => ({ commits: [] })),
        ]);
        setTickets((tj.tickets || []).slice(0, 200));
        setCommits((cj.commits || []).slice(0, 200));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // Persist selections per-project
  useEffect(() => {
    if (!id) return;
    writeSelected(id, { tickets: selectedTickets, commits: selectedCommits });
  }, [id, selectedTickets, selectedCommits]);

  const tView = useMemo(() => {
    const q = tFilter.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter((t) =>
      t.key.toLowerCase().includes(q) ||
      t.title.toLowerCase().includes(q) ||
      (t.type || "").toLowerCase().includes(q)
    );
  }, [tickets, tFilter]);

  const cView = useMemo(() => {
    const q = cFilter.trim().toLowerCase();
    if (!q) return commits;
    return commits.filter((c) =>
      c.message.toLowerCase().includes(q) ||
      (c.author || "").toLowerCase().includes(q) ||
      c.hash.toLowerCase().includes(q)
    );
  }, [commits, cFilter]);

  const canGenerate = useMemo(
    () => selectedTickets.length + selectedCommits.length > 0,
    [selectedTickets, selectedCommits]
  );

  if (!project) {
    return (
      <div className="p-6 space-y-4">
        <Link href="/projects" className="inline-flex items-center gap-2 text-teal-700 hover:underline">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
        <p className="text-rose-600">Project not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row">
          <div className="space-y-2">
            <Link href="/projects" className="inline-flex items-center gap-2 text-white/90 hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Back to Projects
            </Link>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            <div className="text-sm text-white/90">
              Jira: <strong>{project.jiraKey}</strong> • Repo: <strong>{project.devopsRepo}</strong> @{project.branch}
            </div>
          </div>
          <Link
            href={`/generate?project=${encodeURIComponent(project.id)}`}
            className="rounded-xl bg-white/90 px-4 py-2 text-sm text-teal-700 hover:bg-white inline-flex items-center gap-2"
          >
            <ListChecks className="w-4 h-4" />
            Generate Notes
          </Link>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex gap-2 border-b">
        {(["overview","tickets","commits","generate"] as const).map((t) => (
          <button
            key={t}
            className={`px-4 py-2 text-sm ${
              tab === t ? "border-b-2 border-teal-600 text-teal-700" : "text-gray-600 hover:text-teal-700"
            }`}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>

      {/* Overview */}
      {tab === "overview" && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Tickets selected</div>
              <div className="text-xl font-semibold">{selectedTickets.length}</div>
              <div className="text-xs text-slate-500">of {tickets.length} loaded</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Commits selected</div>
              <div className="text-xl font-semibold">{selectedCommits.length}</div>
              <div className="text-xs text-slate-500">of {commits.length} loaded</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Ready to generate</div>
              <div className={`text-sm font-medium ${canGenerate ? "text-emerald-700" : "text-slate-600"}`}>
                {canGenerate ? "Yes — selections found" : "No — pick items first"}
              </div>
              <div className="mt-2">
                <Link
                  href={`/generate?project=${encodeURIComponent(project.id)}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                >
                  <ListChecks className="w-3.5 h-3.5" />
                  Open Generate
                </Link>
              </div>
            </div>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Use the <strong>Tickets</strong> and <strong>Commits</strong> tabs to curate what goes into the next release.
            Your selection is saved per project.
          </p>
        </section>
      )}

      {/* Tickets */}
      {tab === "tickets" && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ticket className="w-5 h-5 text-teal-700" />
              <h2 className="font-medium">Tickets</h2>
            </div>
            <div className="text-xs text-slate-600">
              Selected <strong>{selectedTickets.length}</strong> / {tickets.length}
            </div>
          </div>

          {/* Controls */}
          <div className="grid gap-2 md:grid-cols-3">
            <div className="col-span-2 flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                className="w-full outline-none text-sm"
                placeholder="Filter by key, title, type…"
                value={tFilter}
                onChange={(e) => setTFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50"
                onClick={() => {
                  const ids = tView.map((t) => t.id);
                  setSelectedTickets((prev) => Array.from(new Set([...prev, ...ids])));
                }}
              >
                Select all (filtered)
              </button>
              <button
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50"
                onClick={() => setSelectedTickets([])}
              >
                Clear all
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-sm text-slate-600">Loading tickets…</p>
          ) : tView.length === 0 ? (
            <p className="text-sm text-slate-600">No tickets match.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {tView.map((t) => {
                const checked = selectedTickets.includes(t.id);
                return (
                  <li key={t.id} className="py-2 px-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedTickets((prev) =>
                          e.target.checked ? [...prev, t.id] : prev.filter((x) => x !== t.id)
                        )
                      }
                    />
                    <div className="text-sm">
                      <div className="font-medium">{t.key} — {t.title}</div>
                      {t.type && <div className="text-xs text-slate-500">{t.type}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {/* Commits */}
      {tab === "commits" && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitCommit className="w-5 h-5 text-teal-700" />
              <h2 className="font-medium">Commits</h2>
            </div>
            <div className="text-xs text-slate-600">
              Selected <strong>{selectedCommits.length}</strong> / {commits.length}
            </div>
          </div>

          {/* Controls */}
          <div className="grid gap-2 md:grid-cols-3">
            <div className="col-span-2 flex items-center gap-2 rounded-lg border px-2 py-1.5">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                className="w-full outline-none text-sm"
                placeholder="Filter by message, author, hash…"
                value={cFilter}
                onChange={(e) => setCFilter(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50"
                onClick={() => {
                  const ids = cView.map((c) => c.id);
                  setSelectedCommits((prev) => Array.from(new Set([...prev, ...ids])));
                }}
              >
                Select all (filtered)
              </button>
              <button
                className="rounded-md border px-3 py-1.5 text-xs hover:bg-slate-50"
                onClick={() => setSelectedCommits([])}
              >
                Clear all
              </button>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <p className="text-sm text-slate-600">Loading commits…</p>
          ) : cView.length === 0 ? (
            <p className="text-sm text-slate-600">No commits match.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {cView.map((c) => {
                const checked = selectedCommits.includes(c.id);
                return (
                  <li key={c.id} className="py-2 px-3 flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setSelectedCommits((prev) =>
                          e.target.checked ? [...prev, c.id] : prev.filter((x) => x !== c.id)
                        )
                      }
                    />
                    <div className="min-w-0 text-sm">
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
            </ul>
          )}
        </section>
      )}

      {/* Generate hand-off */}
      {tab === "generate" && (
        <section className="rounded-2xl border bg-white p-4 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-700" />
            <h2 className="font-medium">Generate Release Notes</h2>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            This page is for <strong>picking items</strong>. When you’re ready, jump to the Generate Notes page to apply
            a template and export. Your selections are saved for this project.
          </div>

          <div className="text-sm text-slate-700">
            Selected: <strong>{selectedTickets.length}</strong> tickets &nbsp;•&nbsp;{" "}
            <strong>{selectedCommits.length}</strong> commits
          </div>

          <div className="flex gap-3">
            <Link
              href={`/generate?project=${encodeURIComponent(project.id)}`}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-60 inline-flex items-center gap-2"
            >
              <ListChecks className="w-4 h-4" />
              Open Generate Notes
            </Link>
            <Link
              href="/templates"
              className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-50"
            >
              Adjust Templates
            </Link>
          </div>

          <p className="text-xs text-slate-500">
            Tip: You can switch templates later on the Generate page without losing your selections.
          </p>
        </section>
      )}
    </div>
  );
}
