"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  async function loadCommissions() {
    const { data } = await supabase
      .from("affiliate_commissions")
      .select("*, affiliates(full_name, email), businesses(name)")
      .order("created_at", { ascending: false });
    setCommissions(data || []);
  }

  async function markAsPaid(commissionId: string) {
    setMarkingPaidId(commissionId);
    await supabase
      .from("affiliate_commissions")
      .update({ status: "paid", failure_reason: null })
      .eq("id", commissionId);
    await loadCommissions();
    setMarkingPaidId(null);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
      if (!prof || prof.role !== "super_admin") {
        router.push("/dashboard");
        return;
      }
      setProfile(prof);

      const { data: bizList } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      setBusinesses(bizList || []);

      await loadCommissions();
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
        Agrobuyer · Super Admin
      </p>
      <h1 className="text-2xl font-semibold mb-6">All Businesses</h1>

      <ul className="space-y-3 max-w-lg mb-6">
        {businesses.map((b) => (
          <li key={b.id} className="border border-white/10 rounded-lg p-4">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs opacity-60">
              {b.slug}.agrobuyer.app · {b.subscription_status}
            </p>
          </li>
        ))}
        {businesses.length === 0 && <p className="text-sm opacity-60">No businesses registered yet.</p>}
      </ul>

      <h2 className="text-xl font-semibold mb-4">Affiliate Commissions</h2>
      <p className="text-sm opacity-60 mb-4 max-w-lg">
        Automatic payout via Paystack Transfer isn't available yet (Starter Business account).
        Pay affiliates manually and mark their commission as paid here once done.
      </p>

      <ul className="space-y-3 max-w-lg mb-6">
        {commissions.map((c) => (
          <li key={c.id} className="border border-white/10 rounded-lg p-4">
            <p className="font-semibold">{c.affiliates?.full_name || "Unknown affiliate"}</p>
            <p className="text-xs opacity-60">{c.affiliates?.email}</p>
            <p className="text-sm mt-1">
              Referred: <span className="font-medium">{c.businesses?.name || "Unknown business"}</span>
            </p>
            <p className="text-sm mt-1">
              Amount: NGN {Number(c.amount).toLocaleString()} —{" "}
              <span className={c.status === "paid" ? "text-gold" : "opacity-70"}>{c.status}</span>
            </p>
            {c.failure_reason && (
              <p className="text-xs text-rust mt-1">Reason: {c.failure_reason}</p>
            )}
            {c.status !== "paid" && (
              <button
                onClick={() => markAsPaid(c.id)}
                disabled={markingPaidId === c.id}
                className="mt-3 bg-gold text-ink text-sm font-semibold rounded-md px-3 py-2 disabled:opacity-50"
              >
                {markingPaidId === c.id ? "Marking..." : "Mark as Paid"}
              </button>
            )}
          </li>
        ))}
        {commissions.length === 0 && <p className="text-sm opacity-60">No affiliate commissions yet.</p>}
      </ul>

      <button onClick={handleLogout} className="text-sm border border-white/10 rounded-md px-4 py-2">
        Log out
      </button>
    </main>
  );
}
