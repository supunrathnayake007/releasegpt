"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid, TrendingUp, GitCommit, FileText, Sparkles,
} from "lucide-react";
// Charts
import {
  ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip,
  PieChart, Pie, Cell, Legend,
} from "recharts";

import { useRouter } from 'next/navigation';

/** Types matching the JSON below */
type DashboardData = {
  stats: { projects: number; tickets: number; commits: number; releases: number };
  projects: Array<{
    id: string; name: string; jiraKey: string;
    lastRelease?: string; ticketCount: number; commitCount: number;
    status: "Active" | "Draft" | "Released";
  }>;
  activity: {
    recentTickets: Array<{ id: string; key: string; title: string; project: string; when: string; type?: string }>;
    recentCommits: Array<{ id: string; hash: string; message: string; author: string; project: string; when: string }>;
  };
  charts: {
    ticketsByType: Array<{ type: string; count: number }>;
    commitsByAuthor: Array<{ author: string; commits: number }>;
  };
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/mock/dashboard.json");
        const json = (await res.json()) as DashboardData;
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse h-8 w-48 bg-teal-200/60 rounded mb-6" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl border bg-white/50" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-red-600">Failed to load dashboard.</p>
      </div>
    );
  }

  const TEAL = "#0d9488";
  const NEUTRAL = "#94a3b8";
  const PIE_COLORS = ["#14b8a6", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Mission Control</h1>
        </div>
        <p className="mt-2 text-white/90">
          A quick pulse of your projects. Track work, skim activity, and jump straight into generating release notes.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="/projects"
            className="rounded-xl bg-white/90 px-4 py-2 text-sm text-teal-700 hover:bg-white"
          >
            View Projects
          </Link>
          <Link
            href="/projects"
            className="rounded-xl border border-white/60 px-4 py-2 text-sm text-white hover:bg-white/10"
          >
            Create Project
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Projects"
          value={data.stats.projects}
          icon={<LayoutGrid className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          title="Tickets"
          value={data.stats.tickets}
          icon={<TrendingUp className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          title="Commits"
          value={data.stats.commits}
          icon={<GitCommit className="w-5 h-5 text-teal-700" />}
        />
        <StatCard
          title="Releases"
          value={data.stats.releases}
          icon={<FileText className="w-5 h-5 text-teal-700" />}
        />
      </div>

      {/* Content grid */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column: Projects table */}
        <div className="xl:col-span-2 space-y-6">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Project Overview</h2>
              <span className="text-xs text-slate-500">Top 3 projects</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b">
                    <th className="py-2 pr-2">Project</th>
                    <th className="py-2 pr-2">Jira</th>
                    <th className="py-2 pr-2">Tickets</th>
                    <th className="py-2 pr-2">Commits</th>
                    <th className="py-2 pr-2">Last Release</th>
                    <th className="py-2 pr-2">Status</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.projects.slice(0, 3).map((p) => (
                    <tr key={p.id} className="border-b last:border-0">
                      <td className="py-2 pr-2 font-medium">{p.name}</td>
                      <td className="py-2 pr-2">{p.jiraKey}</td>
                      <td className="py-2 pr-2">{p.ticketCount}</td>
                      <td className="py-2 pr-2">{p.commitCount}</td>
                      <td className="py-2 pr-2">{p.lastRelease ?? "—"}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            p.status === "Active"
                              ? "bg-teal-100 text-teal-700"
                              : p.status === "Released"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <Link
                          href={`/projects/${p.id}`}
                          className="text-teal-700 hover:underline"
                        >
                          Open
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Activity feed */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-teal-700" />
                <h3 className="font-medium">Recent Tickets</h3>
              </div>
              <ul className="space-y-3">
                {data.activity.recentTickets.slice(0, 6).map((t) => (
                  <li key={t.id} className="text-sm">
                    <div className="font-medium">
                      {t.key} — {t.title}
                    </div>
                    <div className="text-xs text-slate-500">
                      {t.project} • {t.when} {t.type ? `• ${t.type}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <GitCommit className="w-5 h-5 text-teal-700" />
                <h3 className="font-medium">Recent Commits</h3>
              </div>
              <ul className="space-y-3">
                {data.activity.recentCommits.slice(0, 6).map((c) => (
                  <li key={c.id} className="text-sm">
                    <div className="font-medium truncate">
                      {c.message} <span className="text-slate-500">({c.hash.slice(0, 7)})</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {c.project} • {c.author} • {c.when}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Right column: Charts + AI highlight */}
        <div className="space-y-6">
          {/* Tickets by type (Pie) */}
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-medium mb-3">Tickets by Type</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.charts.ticketsByType}
                    dataKey="count"
                    nameKey="type"
                    outerRadius={80}
                    label
                  >
                    {data.charts.ticketsByType.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Commits by author (Bar) */}
          <div className="rounded-2xl border bg-white p-4">
            <h3 className="font-medium mb-3">Commits by Author</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.charts.commitsByAuthor}>
                  <XAxis dataKey="author" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="commits" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI highlight (demo candy) */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h3 className="font-medium">AI Highlights</h3>
            </div>
            <p className="text-sm text-slate-700">
              SkyRoute added <strong>2 features</strong> and fixed <strong>1 bug</strong> this week.
              PixelForge shipped a <strong>shader preview</strong>. PulseTrack improved analytics refresh time.
            </p>
            <div className="mt-3 flex gap-2">
              <Link
                href={`/projects/${data.projects[0]?.id ?? ""}`}
                className="rounded-lg bg-teal-600 text-white text-xs px-3 py-1.5 hover:bg-teal-700"
              >
                Generate Notes for SkyRoute
              </Link>
              <Link
                href="/projects"
                className="rounded-lg border text-xs px-3 py-1.5 hover:bg-slate-50"
              >
                View All Projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small card component */
function StatCard({
  title, value, icon,
}: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-slate-500">{title}</div>
          <div className="text-2xl font-semibold text-slate-800">{value}</div>
        </div>
        <div className="rounded-xl bg-teal-50 p-2">{icon}</div>
      </div>
    </div>
  );
}
