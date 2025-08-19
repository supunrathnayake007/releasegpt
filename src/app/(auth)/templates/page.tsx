// src/app/(auth)/templates/page.tsx
export default function TemplatesPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Templates</h1>
      <div className="rounded-xl border p-4 space-y-3">
        <select className="rounded-md border px-3 py-2">
          <option>Dev format</option>
          <option>Client-facing</option>
        </select>
        <pre className="rounded-md border bg-gray-50 p-3 text-sm">{`{ Release Name }\n{ Features }\n{ Fixes }\n{ Improvements }`}</pre>
        <div className="flex gap-2">
          <button className="rounded-md border px-3 py-1 text-sm">Apply</button>
          <button className="rounded-md border px-3 py-1 text-sm">Customize</button>
        </div>
      </div>
    </main>
  );
}
