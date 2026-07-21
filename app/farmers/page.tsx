"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function FarmersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [newFarmer, setNewFarmer] = useState({ name: "", phone: "", location: "" });
  const [advanceAmount, setAdvanceAmount] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || prof.role === "super_admin") { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: farmerList } = await supabase.from("farmers").select("*").order("name");
    setFarmers(farmerList || []);

    const { data: advancesData } = await supabase.from("advances").select("farmer_id, amount");
    const { data: purchasesData } = await supabase.from("purchases").select("farmer_id, advance_deducted");

    const bal: Record<string, number> = {};
    (advancesData || []).forEach((a: any) => {
      bal[a.farmer_id] = (bal[a.farmer_id] || 0) + Number(a.amount);
    });
    (purchasesData || []).forEach((p: any) => {
      bal[p.farmer_id] = (bal[p.farmer_id] || 0) - Number(p.advance_deducted || 0);
    });
    setBalances(bal);
    setLoading(false);
  }

  async function handleAddFarmer(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: insertError } = await supabase.from("farmers").insert({
      business_id: profile.business_id,
      name: newFarmer.name,
      phone: newFarmer.phone,
      location: newFarmer.location,
    });
    if (insertError) { setError(insertError.message); return; }
    setNewFarmer({ name: "", phone: "", location: "" });
    load();
  }

  async function handleGiveAdvance(farmerId: string) {
    const amount = parseFloat(advanceAmount[farmerId] || "0");
    if (!amount || amount <= 0) return;
    const { error: insertError } = await supabase.from("advances").insert({
      business_id: profile.business_id,
      branch_id: profile.branch_id,
      farmer_id: farmerId,
      amount,
      issued_by: profile.id,
    });
    if (insertError) { setError(insertError.message); return; }
    setAdvanceAmount((prev) => ({ ...prev, [farmerId]: "" }));
    load();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-6">Farmers</h1>

      <form onSubmit={handleAddFarmer} className="space-y-3 mb-8 border border-white/10 rounded-lg p-4">
        <p className="text-sm font-semibold mb-1">Add Farmer</p>
        <input
          placeholder="Full name"
          className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
          value={newFarmer.name}
          onChange={(e) => setNewFarmer({ ...newFarmer, name: e.target.value })}
          required
        />
        <input
          placeholder="Phone"
          className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
          value={newFarmer.phone}
          onChange={(e) => setNewFarmer({ ...newFarmer, phone: e.target.value })}
        />
        <input
          placeholder="Location"
          className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
          value={newFarmer.location}
          onChange={(e) => setNewFarmer({ ...newFarmer, location: e.target.value })}
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button type="submit" className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Add Farmer
        </button>
      </form>

      <ul className="space-y-3">
        {farmers.map((f) => (
          <li key={f.id} className="border border-white/10 rounded-lg p-4">
            <a href={`/farmers/${f.id}`} className="block mb-2">
              <p className="font-semibold text-gold underline">{f.name}</p>
              <p className="text-xs opacity-60">{f.phone} {f.location ? `- ${f.location}` : ""}</p>
            </a>
            <p className="text-sm font-mono text-gold mb-2">
              Outstanding: NGN {(balances[f.id] || 0).toLocaleString()}
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Advance amount"
                className="flex-1 bg-surface border border-white/10 rounded-md p-2 text-sm"
                value={advanceAmount[f.id] || ""}
                onChange={(e) => setAdvanceAmount((prev) => ({ ...prev, [f.id]: e.target.value }))}
              />
              <button
                onClick={() => handleGiveAdvance(f.id)}
                className="text-xs border border-white/10 rounded-md px-3 py-2"
              >
                Give Advance
              </button>
            </div>
          </li>
        ))}
        {farmers.length === 0 && <p className="text-sm opacity-60">No farmers yet.</p>}
      </ul>
    </main>
  );
}
