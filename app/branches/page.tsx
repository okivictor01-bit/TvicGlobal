"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function BranchesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [staffCounts, setStaffCounts] = useState<Record<string, number>>({});
  const [newBranch, setNewBranch] = useState({ name: "", location: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || prof.role !== "owner") { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: branchList } = await supabase.from("branches").select("*").order("created_at");
    setBranches(branchList || []);

    const { data: staffList } = await supabase.from("app_users").select("branch_id");
    const counts: Record<string, number> = {};
    (staffList || []).forEach((s: any) => {
      if (s.branch_id) counts[s.branch_id] = (counts[s.branch_id] || 0) + 1;
    });
    setStaffCounts(counts);

    setLoading(false);
  }

  async function handleAddBranch(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const { error: insertError } = await supabase.from("branches").insert({
      business_id: profile.business_id,
      name: newBranch.name,
      location: newBranch.location,
    });
    if (insertError) { setError(insertError.message); return; }
    setNewBranch({ name: "", location: "" });
    load();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
      <h1 className="text-2xl font-semibold mb-6">Branches</h1>

      <form onSubmit={handleAddBranch} className="space-y-3 mb-8 border border-white/10 rounded-lg p-4">
        <p className="text-sm font-semibold mb-1">Add Branch</p>
        <input
          placeholder="Branch name"
          className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
          value={newBranch.name}
          onChange={(e) => setNewBranch({ ...newBranch, name: e.target.value })}
          required
        />
        <input
          placeholder="Location"
          className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
          value={newBranch.location}
          onChange={(e) => setNewBranch({ ...newBranch, location: e.target.value })}
        />
        {error && <p className="text-rust text-sm">{error}</p>}
        <button type="submit" className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm">
          Add Branch
        </button>
      </form>

      <ul className="space-y-3">
        {branches.map((b) => (
          <li key={b.id} className="border border-white/10 rounded-lg p-4">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs opacity-60">{b.location || "No location set"}</p>
            <p className="text-xs opacity-60 mt-1">{staffCounts[b.id] || 0} staff assigned</p>
          </li>
        ))}
        {branches.length === 0 && <p className="text-sm opacity-60">No branches yet.</p>}
      </ul>

      <p className="text-xs opacity-60 mt-6">
        To assign staff to a branch, use{" "}
        <a href="/staff/invite" className="text-gold underline">Invite Staff</a> and pick the branch there.
      </p>
    </main>
  );
}
