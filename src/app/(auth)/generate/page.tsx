// src/app/(auth)/generate/page.tsx
'use client';
import { useEffect, useState } from 'react';

export default function GeneratePage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/mock/jira.json').then(r => r.json()).then(setData);
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
      <button className="sm:col-span-3 rounded-md bg-black px-3 py-2 text-white">Generate</button>
    </div>
  );
}

function Draft({ data }: { data:any }) {
  if (!data) return <p className="text-gray-500">Load sample data…</p>;
  const features = data.tickets?.filter((t:any)=>t.type==='Story' || t.type==='Task');
  const fixes = data.tickets?.filter((t:any)=>t.type==='Bug');

  return (
    <div className="rounded-xl border p-4">
      <h2 className="font-semibold mb-2">Draft Release Notes</h2>
      <section className="mb-3">
        <h3 className="font-medium">Features</h3>
        <ul className="list-disc pl-5 text-sm">
          {features.map((t:any)=><li key={t.key}>{t.summary} ({t.key})</li>)}
        </ul>
      </section>
      <section>
        <h3 className="font-medium">Fixes</h3>
        <ul className="list-disc pl-5 text-sm">
          {fixes.map((t:any)=><li key={t.key}>{t.summary} ({t.key})</li>)}
        </ul>
      </section>
      <div className="mt-4 flex gap-2">
        <button className="rounded-md border px-3 py-1 text-sm">Copy</button>
        <button className="rounded-md border px-3 py-1 text-sm">Download .txt</button>
      </div>
    </div>
  );
}
