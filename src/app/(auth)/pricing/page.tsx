// src/app/(auth)/pricing/page.tsx
export default function PricingPage() {
  const tiers = [
    { name:'Free', price:'$0', bullets:['Basic generation','GitHub only','Monthly limits'] },
    { name:'Starter', price:'$19', bullets:['All integrations','Unlimited runs','Filters'] },
    { name:'Team', price:'$49', bullets:['Collaboration','Exports','Priority support'] },
  ];
  return (
    <main className="space-y-6">
      <h1 className="text-xl font-semibold">Pricing</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {tiers.map(t=>(
          <div key={t.name} className="rounded-xl border p-4">
            <h2 className="font-semibold">{t.name}</h2>
            <p className="text-2xl font-bold mt-1">{t.price}</p>
            <ul className="mt-3 space-y-1 text-sm text-gray-700">
              {t.bullets.map(b=><li key={b}>• {b}</li>)}
            </ul>
            <button className="mt-4 w-full rounded-md bg-black px-3 py-2 text-white">Get started</button>
          </div>
        ))}
      </div>
    </main>
  );
}
