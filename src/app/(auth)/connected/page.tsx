"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Cable, Settings2, RefreshCw, Power, CheckCircle2, AlertTriangle, XCircle, PlugZap,
} from "lucide-react";

/** ===================== Types (match mock JSON) ===================== */
type ProviderStatus = "connected" | "attention" | "disconnected" | "error";
type SyncMode = "manual" | "daily" | "hourly" | null;

type Provider = {
  id: string;
  name: string;
  status: ProviderStatus;
  account:
    | { site?: string; user?: string; org?: string }
    | null;
  lastSync: string | null;   // ISO or null
  nextSync: string | null;   // ISO or null
  scopes: string[];
  stats: Record<string, number>; // e.g., { projects: 3, tickets: 124 } or { repos: 5, commits: 86 }
  issues: string[];
  syncMode: SyncMode;
};

type MappingRow = {
  provider: string;
  external: string;
  internalProjectId: string;
};

type AuditRow = {
  at: string;           // ISO date
  event: string;
  provider: string;
  details: string;
};

type ConnectedJSON = {
  providers: Provider[];
  mappings: MappingRow[];
  audit: AuditRow[];
};

/** ===================== Helpers ===================== */
const TEAL_PRIMARY = "text-teal-700";
const BADGE = {
  connected: "bg-emerald-100 text-emerald-700",
  attention: "bg-amber-100 text-amber-700",
  error: "bg-rose-100 text-rose-700",
  disconnected: "bg-slate-100 text-slate-600",
} as const;

function fmtDate(d: string | null): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "—";
    // Show local short style
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

function nowISO(): string {
  return new Date().toISOString();
}

function inXHoursISO(hours: number): string {
  const n = new Date();
  n.setHours(n.getHours() + hours);
  return n.toISOString();
}

/** ===================== Page ===================== */
export default function ConnectedPage() {
  const [data, setData] = useState<ConnectedJSON | null>(null);
  const [loading, setLoading] = useState(true);

  // UI state
  const [configureFor, setConfigureFor] = useState<Provider | null>(null);
  const [connectFor, setConnectFor] = useState<Provider | null>(null);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/mock/connected_accounts.json");
        const json = (await res.json()) as ConnectedJSON;
        setData(json);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Quick toast that fades
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /** ---------- Actions (mocked) ---------- */
  function updateProvider(id: string, updater: (p: Provider) => Provider) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        providers: prev.providers.map((p) => (p.id === id ? updater(p) : p)),
      };
    });
  }

  function addAudit(event: string, providerId: string, details: string) {
    setData((prev) => {
      if (!prev) return prev;
      const row: AuditRow = { at: nowISO(), event, provider: providerId, details };
      return { ...prev, audit: [row, ...prev.audit].slice(0, 200) };
    });
  }

  function onTestConnection(id: string) {
    setTesting((s) => ({ ...s, [id]: true }));
    // Fake test: success unless status === error
    setTimeout(() => {
      setTesting((s) => ({ ...s, [id]: false }));
      const prov = data?.providers.find((p) => p.id === id);
      const ok = prov?.status !== "error";
      setToast(ok ? "Connection looks good" : "Test failed");
      addAudit(ok ? "test_ok" : "test_failed", id, ok ? "Connectivity verified" : "Could not reach provider");
    }, 900);
  }

  function onSyncNow(id: string) {
    setSyncing((s) => ({ ...s, [id]: true }));
    setTimeout(() => {
      setSyncing((s) => ({ ...s, [id]: false }));
      // Mock: bump some numbers, update last/next sync
      updateProvider(id, (p) => {
        const bumped: Provider = {
          ...p,
          lastSync: nowISO(),
          nextSync: p.syncMode === "hourly" ? inXHoursISO(1) : p.syncMode === "daily" ? inXHoursISO(24) : null,
          stats: Object.fromEntries(
            Object.entries(p.stats).map(([k, v]) => [k, typeof v === "number" ? v + Math.floor(Math.random() * 3) : v])
          ),
          issues: p.issues.filter((i) => !/expired|token/i.test(i)), // pretend resolved
        };
        return bumped;
      });
      setToast("Sync completed");
      addAudit("sync_completed", id, "Data refreshed");
    }, 1200);
  }

  function onDisconnect(id: string) {
    updateProvider(id, (p) => ({
      ...p,
      status: "disconnected",
      account: null,
      lastSync: null,
      nextSync: null,
      scopes: [],
      issues: [],
      syncMode: null,
    }));
    setToast("Disconnected");
    addAudit("disconnected", id, "User disconnected provider");
  }

  function onReconnect(id: string) {
    // Simple: flip to connected, set next sync, keep account
    updateProvider(id, (p) => ({
      ...p,
      status: "connected",
      lastSync: p.lastSync ?? nowISO(),
      nextSync: p.nextSync ?? inXHoursISO(24),
      issues: [],
      syncMode: p.syncMode ?? "daily",
    }));
    setToast("Reconnected");
    addAudit("reconnected", id, "Token refreshed / re-auth");
  }

  function onOpenConfigure(p: Provider) {
    setConfigureFor(p);
  }
  function onOpenConnect(p: Provider) {
    setConnectFor(p);
  }

  function onApplyConfigure(input: { syncMode: SyncMode; filter?: string }) {
    if (!configureFor) return;
    const id = configureFor.id;
    updateProvider(id, (p) => ({
      ...p,
      syncMode: input.syncMode,
      // Optional: store filter in a synthetic stat key so it's visible somewhere
      stats: input.filter ? { ...p.stats, filterCount: (p.stats.filterCount ?? 0) + 1 } : p.stats,
      nextSync:
        input.syncMode === "hourly" ? inXHoursISO(1) : input.syncMode === "daily" ? inXHoursISO(24) : null,
    }));
    addAudit("configured", id, `Sync mode set to ${input.syncMode ?? "manual"}${input.filter ? " with filter" : ""}`);
    setToast("Configuration saved");
    setConfigureFor(null);
  }

  function onApplyConnect(scopesAccepted: boolean) {
    if (!connectFor) return;
    const id = connectFor.id;
    if (!scopesAccepted) {
      setToast("Cancelled");
      setConnectFor(null);
      return;
    }
    // Mock connect: mark as connected and fill minimal account info
    updateProvider(id, (p) => ({
      ...p,
      status: "connected",
      account: p.account ?? { user: "demo-user", org: "demo-org" },
      lastSync: nowISO(),
      nextSync: inXHoursISO(24),
      syncMode: "daily",
      scopes: p.scopes.length ? p.scopes : ["read:project", "read:issue", "repo:read"],
    }));
    addAudit("connected", id, "OAuth completed (mock)");
    setToast(`${connectFor.name} connected`);
    setConnectFor(null);
  }

  const hasMappings = Boolean(data?.mappings?.length);
  const hasAudit = Boolean(data?.audit?.length);

  /** ---------- Render ---------- */
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <header className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Cable className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Connected Accounts</h1>
          </div>
          <p className="mt-2 text-white/90">Manage your integrations and data syncs.</p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-36 rounded-2xl border bg-white/50 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p className="text-red-600">Failed to load connected accounts.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <header className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Cable className="w-6 h-6" />
            <h1 className="text-2xl font-semibold">Connected Accounts</h1>
          </div>
          <Link
            href="/projects"
            className="rounded-xl bg-white/90 px-4 py-2 text-sm text-teal-700 hover:bg-white"
          >
            Back to Projects
          </Link>
        </div>
        <p className="mt-2 text-white/90">
          Connect Jira and Dev tools, configure sync, and keep everything ready for fast release notes.
        </p>
      </header>

      {/* Provider cards */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.providers.map((p) => (
          <div key={p.id} className="rounded-2xl border bg-white p-4 shadow-sm space-y-3">
            {/* Title & Status */}
            <div className="flex items-center justify-between">
              <h2 className="font-medium">{p.name}</h2>
              <span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[p.status]}`}>
                {p.status === "connected"
                  ? "Connected"
                  : p.status === "attention"
                  ? "Needs attention"
                  : p.status === "error"
                  ? "Error"
                  : "Not connected"}
              </span>
            </div>

            {/* Account / Stats */}
            <div className="text-sm">
              <div className="text-slate-600">
                {p.account ? (
                  <>
                    {p.account.site ?? p.account.org ?? "—"} • {p.account.user ?? "—"}
                  </>
                ) : (
                  <span className="text-slate-400">No account linked</span>
                )}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-slate-700">
                {Object.entries(p.stats).map(([k, v]) => (
                  <div key={k} className="rounded-lg bg-slate-50 px-2 py-1">
                    <span className="text-xs text-slate-500">{k}</span>
                    <div className="text-sm font-medium">{String(v)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync info */}
            <div className="text-xs text-slate-500">
              <div>Last sync: <span className="text-slate-700">{fmtDate(p.lastSync)}</span></div>
              <div>Next sync: <span className="text-slate-700">{fmtDate(p.nextSync)}</span></div>
              <div>Mode: <span className="text-slate-700">{p.syncMode ?? "manual"}</span></div>
            </div>

            {/* Issues */}
            {p.issues.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                {p.issues[0]}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              {p.status === "connected" ? (
                <>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700 disabled:opacity-60"
                    onClick={() => onSyncNow(p.id)}
                    disabled={syncing[p.id]}
                    aria-label={`Sync now: ${p.name}`}
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    {syncing[p.id] ? "Syncing…" : "Sync now"}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onOpenConfigure(p)}
                    aria-label={`Configure: ${p.name}`}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onTestConnection(p.id)}
                    disabled={testing[p.id]}
                    aria-label={`Test connection: ${p.name}`}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${TEAL_PRIMARY}`} />
                    {testing[p.id] ? "Testing…" : "Test"}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onReconnect(p.id)}
                    aria-label={`Reconnect: ${p.name}`}
                  >
                    <PlugZap className="w-3.5 h-3.5" />
                    Reconnect
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onDisconnect(p.id)}
                    aria-label={`Disconnect: ${p.name}`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    Disconnect
                  </button>
                </>
              ) : p.status === "attention" ? (
                <>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-3 py-1.5 text-xs text-white hover:bg-amber-700"
                    onClick={() => onReconnect(p.id)}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Fix & reconnect
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onOpenConfigure(p)}
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    Configure
                  </button>
                </>
              ) : p.status === "error" ? (
                <>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs text-white hover:bg-rose-700"
                    onClick={() => onReconnect(p.id)}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Retry connect
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50"
                    onClick={() => onTestConnection(p.id)}
                    disabled={testing[p.id]}
                  >
                    <CheckCircle2 className={`w-3.5 h-3.5 ${TEAL_PRIMARY}`} />
                    {testing[p.id] ? "Testing…" : "Test"}
                  </button>
                </>
              ) : (
                <button
                  className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs text-white hover:bg-teal-700"
                  onClick={() => onOpenConnect(p)}
                >
                  <PlugZap className="w-3.5 h-3.5" />
                  Connect
                </button>
              )}
            </div>
          </div>
        ))}
      </section>

      {/* Mappings */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Project Mappings</h3>
          <span className="text-xs text-slate-500">{hasMappings ? `${data.mappings.length} links` : "No mappings"}</span>
        </div>
        {hasMappings ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b">
                  <th className="py-2 pr-2">Provider</th>
                  <th className="py-2 pr-2">External</th>
                  <th className="py-2 pr-2">Internal Project</th>
                </tr>
              </thead>
              <tbody>
                {data.mappings.map((m, i) => (
                  <tr key={`${m.provider}-${m.external}-${i}`} className="border-b last:border-0">
                    <td className="py-2 pr-2">{m.provider}</td>
                    <td className="py-2 pr-2">{m.external}</td>
                    <td className="py-2 pr-2">
                      <Link href={`/projects/${m.internalProjectId}`} className="text-teal-700 hover:underline">
                        {m.internalProjectId}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-600">No mappings yet. Connect providers to start mapping Jira projects & repos.</p>
        )}
      </section>

      {/* Audit log */}
      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Audit Log</h3>
          <span className="text-xs text-slate-500">{hasAudit ? `${data.audit.length} events` : "No events"}</span>
        </div>
        {hasAudit ? (
          <ul className="divide-y">
            {data.audit.slice(0, 15).map((a, i) => (
              <li key={`${a.at}-${i}`} className="py-2 text-sm">
                <div className="font-medium">{a.event}</div>
                <div className="text-xs text-slate-500">
                  {fmtDate(a.at)} • {a.provider} — {a.details}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">No recent activity yet.</p>
        )}
      </section>

      {/* Configure modal */}
      {configureFor && (
        <Modal onClose={() => setConfigureFor(null)} title={`Configure ${configureFor.name}`}>
          <ConfigureForm
            provider={configureFor}
            onCancel={() => setConfigureFor(null)}
            onSave={(payload) => onApplyConfigure(payload)}
          />
        </Modal>
      )}

      {/* Connect modal */}
      {connectFor && (
        <Modal onClose={() => setConnectFor(null)} title={`Connect ${connectFor.name}`}>
          <ConnectForm
            provider={connectFor}
            onCancel={() => setConnectFor(null)}
            onConnect={(accepted) => onApplyConnect(accepted)}
          />
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 rounded-xl bg-slate-900 text-white text-sm px-3 py-2 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

/** ===================== Modal Shell ===================== */
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b p-4">
          <h4 className="font-medium">{title}</h4>
          <button
            className="rounded-lg border px-2 py-1 text-xs hover:bg-slate-50"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

/** ===================== Configure Form ===================== */
function ConfigureForm({
  provider,
  onSave,
  onCancel,
}: {
  provider: Provider;
  onSave: (payload: { syncMode: SyncMode; filter?: string }) => void;
  onCancel: () => void;
}) {
  const [syncMode, setSyncMode] = useState<SyncMode>(provider.syncMode ?? "daily");
  const [filter, setFilter] = useState<string>("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ syncMode, filter: filter.trim() || undefined });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm text-slate-600 mb-1">Sync mode</label>
        <select
          className="w-full rounded-md border px-3 py-2 text-sm"
          value={syncMode ?? "manual"}
          onChange={(e) => setSyncMode((e.target.value as SyncMode) || "manual")}
        >
          <option value="manual">Manual</option>
          <option value="hourly">Hourly</option>
          <option value="daily">Daily</option>
        </select>
        <p className="mt-1 text-xs text-slate-500">
          Choose how often this provider should sync automatically.
        </p>
      </div>

      <div>
        <label className="block text-sm text-slate-600 mb-1">Project/Repo filter (optional)</label>
        <input
          className="w-full rounded-md border px-3 py-2 text-sm"
          placeholder={provider.id === "jira" ? "e.g., JQL or project keys (SR, PF)" : "e.g., org/team prefixes"}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <p className="mt-1 text-xs text-slate-500">
          Limit what gets synced (for demo, this only updates an internal counter).
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700">
          Save
        </button>
      </div>
    </form>
  );
}

/** ===================== Connect Form ===================== */
function ConnectForm({
  provider,
  onConnect,
  onCancel,
}: {
  provider: Provider;
  onConnect: (accepted: boolean) => void;
  onCancel: () => void;
}) {
  const [accepted, setAccepted] = useState(false);

  const scopesList = useMemo(() => {
    if (provider.scopes.length) return provider.scopes;
    // Reasonable defaults per provider
    if (provider.id === "jira") return ["read:issue", "read:project"];
    if (provider.id === "devops") return ["code:read"];
    if (provider.id === "github") return ["repo:read"];
    return ["read"];
  }, [provider]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-700">
        Connect <strong>{provider.name}</strong> to import tickets and/or commits into your workspace. We only request
        the scopes listed below. You can disconnect anytime.
      </p>

      <div className="rounded-xl border bg-slate-50 p-3">
        <div className="text-xs font-medium text-slate-600 mb-2">Requested scopes</div>
        <ul className="flex flex-wrap gap-2">
          {scopesList.map((s) => (
            <li key={s} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
              {s}
            </li>
          ))}
        </ul>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>
          I understand this app will <strong>read</strong> issues/commits metadata from {provider.name}. It will not write
          or delete anything.
        </span>
      </label>

      <div className="flex items-center justify-end gap-2">
        <button className="rounded-lg border px-3 py-1.5 text-sm hover:bg-slate-50" onClick={onCancel}>
          Cancel
        </button>
        <button
          disabled={!accepted}
          onClick={() => onConnect(accepted)}
          className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700 disabled:opacity-60"
        >
          <PlugZap className="w-4 h-4" />
          Connect
        </button>
      </div>
    </div>
  );
}
