"use client";

import { useMemo, useState } from "react";
import { Check, X, Sparkles, ShieldCheck, Rocket, HelpCircle } from "lucide-react";

type BillingCycle = "monthly" | "annual";

type Plan = {
  id: "starter" | "pro" | "enterprise";
  name: string;
  tagline: string;
  monthly: number;         // base monthly price
  popular?: boolean;
  features: string[];
  limits: {
    projects: string;
    ticketsPerMonth: string;
    commitsPerMonth: string;
    providers: string;
  };
  cta: { label: string; href: string };
};

const PLANS: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "For small demos & side projects",
    monthly: 0,
    features: ["Local storage", "Manual sync", "Basic release notes"],
    limits: {
      projects: "3",
      ticketsPerMonth: "500",
      commitsPerMonth: "500",
      providers: "1",
    },
    cta: { label: "Get started", href: "/signup?plan=starter" },
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For growing teams shipping weekly",
    monthly: 29,
    popular: true,
    features: ["AI draft generation", "Auto sync (hourly)", "Markdown export", "Priority support"],
    limits: {
      projects: "Unlimited",
      ticketsPerMonth: "20,000",
      commitsPerMonth: "20,000",
      providers: "3",
    },
    cta: { label: "Start Pro", href: "/signup?plan=pro" },
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "For orgs with security & scale needs",
    monthly: 0, // shown as contact sales
    features: ["SSO/SAML", "On-prem/Private cloud", "Custom SLAs", "Audit & compliance"],
    limits: {
      projects: "Unlimited",
      ticketsPerMonth: "Custom",
      commitsPerMonth: "Custom",
      providers: "Unlimited",
    },
    cta: { label: "Contact sales", href: "/contact-sales" },
  },
];

type FeatureRow = {
  label: string;
  plans: Record<Plan["id"], boolean | "limit">;
};

const FEATURE_MATRIX: FeatureRow[] = [
  { label: "AI draft generation", plans: { starter: false, pro: true, enterprise: true } },
  { label: "Auto sync", plans: { starter: false, pro: true, enterprise: true } },
  { label: "Markdown / HTML export", plans: { starter: true, pro: true, enterprise: true } },
  { label: "Jira integration", plans: { starter: true, pro: true, enterprise: true } },
  { label: "Azure DevOps integration", plans: { starter: true, pro: true, enterprise: true } },
  { label: "GitHub integration", plans: { starter: false, pro: true, enterprise: true } },
  { label: "SSO / SAML", plans: { starter: false, pro: false, enterprise: true } },
];

type FAQ = { q: string; a: string };
const FAQS: FAQ[] = [
  {
    q: "How does annual billing work?",
    a: "Choose annual to get 2 months free. You’ll be billed once per year and can switch back to monthly at renewal.",
  },
  {
    q: "What counts as a ticket or commit?",
    a: "Each synced Jira issue or Git commit counts toward your monthly quota. We only read metadata and never write to your tools.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. You can upgrade or downgrade anytime. Changes apply pro-rata on your next bill.",
  },
  {
    q: "Do you offer discounts for startups or education?",
    a: "We do! Contact us and we’ll figure out a friendly plan.",
  },
];

export default function PricingPage() {
  const [billing, setBilling] = useState<BillingCycle>("monthly");

  // Annual price = 10× monthly (2 months free)
  const priceFor = (p: Plan) =>
    p.id === "enterprise"
      ? "Custom"
      : billing === "monthly"
      ? `$${p.monthly}/mo`
      : `$${p.monthly * 10}/yr`;

  const sublabel = useMemo(
    () => (billing === "annual" ? "2 months free (billed yearly)" : "Billed monthly, cancel anytime"),
    [billing]
  );

  return (
    <div className="p-6 md:p-10 space-y-10">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-8 shadow-sm">
        <div className="flex items-start md:items-center justify-between gap-6 flex-col md:flex-row">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              <h1 className="text-3xl font-semibold">Pricing</h1>
            </div>
            <p className="mt-2 text-white/90">
              Ship polished release notes in minutes. Start free, grow when you’re ready.
            </p>
          </div>

          {/* Billing toggle */}
          <div className="bg-white/10 rounded-xl p-1 inline-flex">
            <button
              className={`px-4 py-2 text-sm rounded-lg ${billing === "monthly" ? "bg-white text-teal-700" : "text-white/90"}`}
              onClick={() => setBilling("monthly")}
              aria-label="Monthly billing"
            >
              Monthly
            </button>
            <button
              className={`px-4 py-2 text-sm rounded-lg ${billing === "annual" ? "bg-white text-teal-700" : "text-white/90"}`}
              onClick={() => setBilling("annual")}
              aria-label="Annual billing"
            >
              Annual <span className="ml-1 text-xs opacity-80">Save 17%</span>
            </button>
          </div>
        </div>

        <div className="mt-3 text-sm text-white/90">{sublabel}</div>
      </div>

      {/* Plans */}
      <section className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.id}
            className={`rounded-2xl border bg-white p-6 shadow-sm relative ${p.popular ? "ring-2 ring-teal-500" : ""}`}
          >
            {p.popular && (
              <div className="absolute -top-3 left-6 rounded-full bg-teal-600 text-white text-xs px-2 py-0.5 shadow">
                Most popular
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{p.name}</h3>
                <p className="text-sm text-slate-600">{p.tagline}</p>
              </div>
              {p.id === "enterprise" ? <ShieldCheck className="w-6 h-6 text-teal-700" /> : <Rocket className="w-6 h-6 text-teal-700" />}
            </div>

            <div className="mt-5">
              <div className="text-3xl font-semibold text-slate-900">{priceFor(p)}</div>
              {p.id !== "enterprise" && (
                <div className="text-xs text-slate-500">{billing === "monthly" ? "per month" : "per year"}</div>
              )}
            </div>

            <ul className="mt-5 space-y-2">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-teal-700 mt-0.5" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
              <Limit label="Projects" value={p.limits.projects} />
              <Limit label="Providers" value={p.limits.providers} />
              <Limit label="Tickets / mo" value={p.limits.ticketsPerMonth} />
              <Limit label="Commits / mo" value={p.limits.commitsPerMonth} />
            </div>

            <a
              href={p.cta.href}
              className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-2 text-sm font-medium ${
                p.id === "enterprise"
                  ? "border hover:bg-slate-50"
                  : "bg-teal-600 text-white hover:bg-teal-700"
              }`}
            >
              {p.cta.label}
            </a>
          </div>
        ))}
      </section>

      {/* Comparison table */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h2 className="text-lg font-medium">Compare features</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b">
                <th className="py-2 pr-2">Feature</th>
                <th className="py-2 pr-2">Starter</th>
                <th className="py-2 pr-2">Pro</th>
                <th className="py-2 pr-2">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_MATRIX.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <td className="py-2 pr-2">{row.label}</td>
                  {(["starter", "pro", "enterprise"] as Plan["id"][]).map((pid) => {
                    const val = row.plans[pid];
                    return (
                      <td key={pid} className="py-2 pr-2">
                        {val === true ? (
                          <Check className="w-4 h-4 text-teal-700" />
                        ) : val === false ? (
                          <X className="w-4 h-4 text-slate-400" />
                        ) : (
                          <span className="text-xs text-slate-600">Limited</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium">FAQs</h2>
        <div className="mt-4 divide-y">
          {FAQS.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* CTA strip */}
      <section className="rounded-2xl bg-gradient-to-r from-teal-600 via-teal-500 to-teal-400 text-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold">Ready to level up release notes?</h3>
          <p className="text-white/90">Connect Jira/Dev tools and ship a polished draft in minutes.</p>
        </div>
        <div className="flex gap-3">
          <a href="/signup?plan=pro" className="rounded-xl bg-white text-teal-700 px-4 py-2 text-sm hover:bg-white/95">
            Start Pro
          </a>
          <a href="/contact-sales" className="rounded-xl border border-white/70 px-4 py-2 text-sm hover:bg-white/10">
            Contact sales
          </a>
        </div>
      </section>
    </div>
  );
}

/* ---------- small components ---------- */
function Limit({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="py-3">
      <button
        className="w-full flex items-start justify-between text-left gap-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={q}
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-700 mt-0.5" />
          <span className="font-medium">{q}</span>
        </div>
        <span className="text-teal-100">{open ? "—" : "+"}</span>
      </button>
      {open && (
        <p id={q} className="mt-2 text-sm text-slate-700">
          {a}
        </p>
      )}
    </div>
  );
}
