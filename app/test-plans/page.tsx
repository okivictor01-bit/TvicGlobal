import { supabase } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

export default async function TestPlans() {
  const { data: plans, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("price", { ascending: true });

  return (
    <main className="min-h-screen p-8">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-3">
        TvicGlobal · Connection Test
      </p>
      <h1 className="text-2xl font-semibold mb-6">Subscription Plans</h1>

      {error && (
        <p className="text-rust font-mono text-sm">
          Error: {error.message}
        </p>
      )}

      {plans && plans.length === 0 && (
        <p className="text-sm opacity-70">
          Connected, but no plans found — check the seed data.
        </p>
      )}

      {plans && plans.length > 0 && (
        <ul className="space-y-3">
          {plans.map((plan) => (
            <li
              key={plan.id}
              className="border border-white/10 rounded-lg p-4 flex justify-between"
            >
              <span>{plan.name}</span>
              <span className="font-mono text-gold">
              {"\u20A6"}{Number(plan.price).toLocaleString()} / {plan.billing_cycle}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
