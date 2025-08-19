// src/app/(auth)/connected/page.tsx
export default function ConnectedPage() {
  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Connected Accounts</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card label="GitHub" status="Connected" />
        <Card label="Jira" status="Not linked" />
        <Card label="Azure DevOps" status="Not linked" />
        <Card label="GitLab" status="Connected" />
      </div>
    </main>
  );
}

function Card({ label, status }: { label:string; status:string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <span className="font-medium">{label}</span>
        <span className="text-sm text-gray-600">{status}</span>
      </div>
      <button className="mt-3 rounded-md border px-3 py-1 text-sm hover:bg-gray-50">
        Test Connection
      </button>
    </div>
  );
}
