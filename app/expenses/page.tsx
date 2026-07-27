"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const EXPENSE_CATEGORIES = [
  "Fuel", "Salary", "Security", "Transportation",
  "Maintenance", "Office Expenses", "Electricity", "Others",
];

export default function ExpensesPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ category: EXPENSE_CATEGORIES[0], amount: "", description: "" });
  const [saving, setSaving] = useState(false);

  async function loadExpenses(businessId: string, branchId: string) {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", businessId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false });
    setExpenses(data || []);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
      if (!prof || prof.role !== "manager") {
        router.push("/dashboard");
        return;
      }
      setProfile(prof);
      await loadExpenses(prof.business_id, prof.branch_id);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid expense amount.");
      return;
    }
    setSaving(true);
    const { error: insertError } = await supabase.from("expenses").insert({
      business_id: profile.business_id,
      branch_id: profile.branch_id,
      category: form.category,
      amount,
      description: form.description || null,
      recorded_by: profile.id,
      approval_status: "pending",
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setForm({ category: EXPENSE_CATEGORIES[0], amount: "", description: "" });
    await loadExpenses(profile.business_id, profile.branch_id);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  function statusColor(status: string) {
    if (status === "approved") return "text-gold";
    if (status === "rejected") return "text-rust";
    return "opacity-70";
  }

  return (
    <main className="min-h-screen p-6 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
      <h1 className="text-2xl font-semibold mb-1">Expenses</h1>
      <p className="text-sm opacity-60 mb-6">
        Submitted expenses need owner approval before they affect Finance records.
      </p>

      <div className="bg-surface border border-white/10 rounded-md p-4 mb-6">
        <p className="text-sm font-semibold mb-3">Submit an expense</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <select
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Amount (NGN)"
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            required
          />
          <input
            placeholder="Description (optional)"
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          {error && <p className="text-rust text-sm">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit for Approval"}
          </button>
        </form>
      </div>

      <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3">Your submitted expenses</h2>
      <ul className="space-y-3 mb-6">
        {expenses.map((e) => (
          <li key={e.id} className="border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold">{e.category}</p>
              <span className={`text-xs uppercase tracking-widest ${statusColor(e.approval_status)}`}>
                {e.approval_status}
              </span>
            </div>
            <p className="text-sm mt-1">NGN {Number(e.amount).toLocaleString()}</p>
            {e.description && <p className="text-xs opacity-60 mt-1">{e.description}</p>}
            <p className="text-xs opacity-40 mt-1">{new Date(e.created_at).toLocaleDateString()}</p>
          </li>
        ))}
        {expenses.length === 0 && <p className="text-sm opacity-60">No expenses submitted yet.</p>}
      </ul>

      <a href="/dashboard" className="block text-sm underline opacity-70">Back to Dashboard</a>
    </main>
  );
}
