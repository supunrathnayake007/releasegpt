'use client';

import { useEffect, useState } from 'react';
import type { JiraMockData, Ticket } from '@/types/jira';

export default function GeneratePage() {
  const [data, setData] = useState<JiraMockData | null>(null);

  useEffect(() => {
    fetch('/mock/jira.json')
      .then((r) => r.json())
      .then((d: JiraMockData) => setData(d))
      .catch(() => setData({ tickets: [] }));
  }, []);

  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Generate Notes</h1>
      <Filters />
      <Draft data={data} />
    </main>
  );
}

function Filters() {
  return (
    <div className="rounded-xl border p-4 grid gap-3 sm:grid-cols-3">
      <input className="rounded-md border px-3 py-2" placeholder="Date range" />
      <input className="rounded-md border px-3 py-2" placeholder="Labels" />
      <input className="rounded-md border px-3 py-2" placeholder="Branch" />
      <button className="sm:col-span-3 rounded-md bg-black px-3 py-2 text-white">
        Generate
      </button>
    </div>
  );
}

function Draft({ data }: { data: JiraMockData | null }) {
  if (!data) return <p className="text-gray-500">Loading sample data…</p>;

  const features: Ticket[] = data.tickets.filter(
    (t) => t.type === 'Story' || t.type === 'Task'
  );
  const fixes: Ticket[] = data.tickets.filter((t) => t.type === 'Bug');

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-semibold mb-2">Draft Release Notes</h2>

      <section className="mb-3">
        <h3 className="font-medium">Features</h3>
        <ul className="list-disc pl-5 text-sm">
          {features.map((t) => (
            <li key={t.key}>
              {t.summary} ({t.key})
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="font-medium">Fixes</h3>
        <ul className="list-disc pl-5 text-sm">
          {fixes.map((t) => (
            <li key={t.key}>
              {t.summary} ({t.key})
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4 flex gap-2">
        <button className="rounded-md border px-3 py-1 text-sm">Copy</button>
        <button className="rounded-md border px-3 py-1 text-sm">
          Download .txt
        </button>
      </div>
    </div>
  );
}
