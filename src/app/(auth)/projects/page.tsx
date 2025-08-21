"use client";

import { useState, useEffect, useMemo } from "react";
import { Folder, RotateCcw } from "lucide-react";
import Link from "next/link";

/** ---------- ClientOnly (prevents SSR/CSR mismatch) ---------- */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

/** ---------- Types ---------- */
type ProjectRow = {
  id: string;
  name: string;
  jiraKey: string;
  devopsRepo: string;
  branch: string;
};

type JiraProjectOpt = { key: string; name: string };
type DevRepoOpt = { id: string; name: string; defaultBranch?: string };

/** ---------- Constants & helpers ---------- */
const LS_KEY = "projects:v1";

const defaultProjects: ProjectRow[] = [
  { id: "1", name: "Release System", jiraKey: "RLS", devopsRepo: "azend/releasegpt", branch: "main" },
  { id: "2", name: "Mobile App", jiraKey: "APP", devopsRepo: "azend/mobile-app", branch: "develop" },
];

function readProjectsLS(): ProjectRow[] | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ok = parsed.every(
      (p) =>
        p &&
        typeof p.id === "string" &&
        typeof p.name === "string" &&
        typeof p.jiraKey === "string" &&
        typeof p.devopsRepo === "string" &&
        typeof p.branch === "string"
    );
    return ok ? (parsed as ProjectRow[]) : null;
  } catch {
    return null;
  }
}

function writeProjectsLS(list: ProjectRow[]) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch (err) {
    console.error("Failed to save projects to localStorage:", err);
  }
}

function clearProjectsLS() {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

/** ---------- Inner page rendered only on the client ---------- */
function ProjectsInner() {
  // Safe to read localStorage in the initializer because this component never renders on the server
  const [projects, setProjects] = useState<ProjectRow[]>(() => {
    const fromLS = readProjectsLS();
    return fromLS ?? defaultProjects;
  });

  // form state
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  // options
  const [jiraOptions, setJiraOptions] = useState<JiraProjectOpt[]>([]);
  const [repoOptions, setRepoOptions] = useState<DevRepoOpt[]>([]);
  const [loadingOpts, setLoadingOpts] = useState(true);

  // selections
  const [selectedJiraKey, setSelectedJiraKey] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<DevRepoOpt | null>(null);
  const [branch, setBranch] = useState("main");

  // Persist whenever projects change
  useEffect(() => {
    writeProjectsLS(projects);
  }, [projects]);

  // Sync if storage changes in another tab
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LS_KEY) {
        const next = readProjectsLS();
        if (next) setProjects(next);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Load mock options once
  useEffect(() => {
    async function loadOptions() {
      try {
        const [jp, dr] = await Promise.all([
          fetch("/mock/jira_projects.json").then((r) => r.json()),
          fetch("/mock/devops_repos.json").then((r) => r.json()),
        ]);
        const jps: JiraProjectOpt[] = jp.projects || [];
        const drs: DevRepoOpt[] = dr.repos || [];

        setJiraOptions(jps);
        setRepoOptions(drs);

        setSelectedJiraKey(jps?.[0]?.key ?? "");
        const firstRepo = drs?.[0] ?? null;
        setSelectedRepo(firstRepo);
        setBranch(firstRepo?.defaultBranch ?? "main");
      } finally {
        setLoadingOpts(false);
      }
    }
    loadOptions();
  }, []);

  const canAdd = useMemo(() => {
    return name.trim().length >= 3 && selectedJiraKey && selectedRepo;
  }, [name, selectedJiraKey, selectedRepo]);

  function cryptoRandom() {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }
    return Math.random().toString(36).slice(2);
  }

  function addProject() {
    if (!canAdd || !selectedRepo) return;
    setAdding(true);

    const row: ProjectRow = {
      id: cryptoRandom(),
      name: name.trim(),
      jiraKey: selectedJiraKey.toUpperCase(),
      devopsRepo: selectedRepo.name,
      branch: branch.trim() || selectedRepo.defaultBranch || "main",
    };

    setProjects((prev) => {
      const next = [row, ...prev];
      writeProjectsLS(next); // immediate write
      return next;
    });

    // reset form
    setName("");
    setSelectedJiraKey(jiraOptions[0]?.key ?? "");
    const firstRepo = repoOptions[0] ?? null;
    setSelectedRepo(firstRepo);
    setBranch(firstRepo?.defaultBranch ?? "main");
    setAdding(false);
  }

  function resetProjects() {
    clearProjectsLS();
    setProjects(defaultProjects);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Projects</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/90">Saved locally ✓</span>
            <button
              onClick={resetProjects}
              className="inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-sm text-teal-700 hover:bg-white"
              title="Reset saved projects (localStorage)"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
        <p className="mt-2 text-white/90">
          Create projects by linking a Jira project and a repository. Everything is stored in your browser for the demo.
        </p>
      </div>

      {/* Create Project */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="font-medium mb-3">Create Project</h2>

        {loadingOpts ? (
          <p className="text-sm text-gray-600">Loading connected Jira projects and DevOps repos…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-5">
            {/* Name */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="p-name">
                Name
              </label>
              <input
                id="p-name"
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Project Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">Display name in lists.</p>
            </div>

            {/* Jira project */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="p-jira">
                Jira Project
              </label>
              <select
                id="p-jira"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={selectedJiraKey}
                onChange={(e) => setSelectedJiraKey(e.target.value)}
              >
                {jiraOptions.length === 0 && <option value="">No Jira projects found</option>}
                {jiraOptions.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.key} — {p.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Used to tag tickets in release notes.</p>
            </div>

            {/* Repository */}
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="p-repo">
                Repository
              </label>
              <select
                id="p-repo"
                className="w-full rounded-md border px-3 py-2 text-sm"
                value={selectedRepo?.id ?? ""}
                onChange={(e) => {
                  const repo = repoOptions.find((r) => r.id === e.target.value);
                  setSelectedRepo(repo || null);
                  if (repo?.defaultBranch) setBranch(repo.defaultBranch);
                }}
              >
                {repoOptions.length === 0 && <option value="">No repos found</option>}
                {repoOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[11px] text-slate-500">Source of commits for this project.</p>
            </div>

            {/* Branch */}
            <div className="sm:col-span-1">
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="p-branch">
                Branch
              </label>
              <input
                id="p-branch"
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="main"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
              />
              <p className="mt-1 text-[11px] text-slate-500">Default branch to track.</p>
            </div>

            {/* Create button (full width on small screens) */}
            <div className="sm:col-span-5">
              <button
                onClick={addProject}
                disabled={!canAdd || adding}
                className="w-full sm:w-auto rounded-xl bg-teal-600 px-4 py-2 text-sm text-white hover:bg-teal-700 disabled:opacity-60"
              >
                {adding ? "Adding…" : "Create"}
              </button>
            </div>
          </div>
        )}

        <p className="mt-2 text-xs text-gray-500">
          Options load from mock JSON. You can change the branch if needed.
        </p>
      </div>

      {/* Project list */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-medium">Project List</h2>
          <span className="text-xs text-slate-500">{projects.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-slate-600">
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Jira Key</th>
                <th className="p-2 text-left">Repo</th>
                <th className="p-2 text-left">Branch</th>
                <th className="p-2 text-right">Open</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-3 text-center text-gray-500">
                    No projects yet
                  </td>
                </tr>
              )}
              {projects.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-2">
                    <Link href={`/projects/${p.id}`} className="text-teal-700 hover:underline">
                      {p.name}
                    </Link>
                  </td>
                  <td className="p-2">{p.jiraKey}</td>
                  <td className="p-2">{p.devopsRepo}</td>
                  <td className="p-2">{p.branch}</td>
                  <td className="p-2 text-right">
                    <Link href={`/projects/${p.id}`} className="rounded-md border px-2 py-1 hover:bg-slate-50">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-gray-500">Saved locally in your browser (localStorage). Use “Reset” to clear.</p>
      </div>
    </div>
  );
}

/** ---------- Page export (renders only on client) ---------- */
export default function ProjectsPage() {
  return (
    <ClientOnly>
      <ProjectsInner />
    </ClientOnly>
  );
}
