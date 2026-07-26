"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const EXPENSE_CATEGORIES = [
  "Fuel", "Salary", "Security", "Transportation",
  "Maintenance", "Office Expenses", "Electricity", "Others",
];

export default function Finance() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchFilter, setBranchFilter] = useState<string>("all");
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [advances, setAdvances] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashAdjustments, setCashAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [expenseForm, setExpenseForm] = useState({ category: EXPENSE_CATEGORIES[0], amount: "", description: "", branchId: "" });
  const [savingExpense, setSavingExpense] = useState(false);

  const [cashForm, setCashForm] = useState({ type: "injection", amount: "", description: "" });
  const [savingCash, setSavingCash] = useState(false);

  async function loadFinanceData(businessId: string) {
    const [{ data: p }, { data: s }, { data: a }, { data: e }, { data: c }] = await Promise.all([
      supabase.from("purchases").select("final_amount_paid, branch_id, created_at").eq("business_id", businessId),
      supabase.from("sales").select("total_value, branch_id, created_at").eq("business_id", businessId),
      supabase.from("advances").select("amount, branch_id, created_at").eq("business_id", businessId),
      supabase.from("expenses").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
      supabase.from("cash_adjustments").select("*").eq("business_id", businessId),
    ]);
    setPurchases(p || []);
    setSales(s || []);
    setAdvances(a || []);
    setExpenses(e || []);
    setCashAdjustments(c || []);
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
      if (!prof || !["owner", "manager"].includes(prof.role)) {
        router.push("/dashboard");
        return;
      }
      setProfile(prof);

      if (prof.role === "owner") {
        const { data: branchList } = await supabase.from("branches").select("*").order("name");
        setBranches(branchList || []);
        if (branchList && branchList.length > 0) {
          setExpenseForm((f) => ({ ...f, branchId: branchList[0].id }));
        }
      } else {
        setBranchFilter(prof.branch_id);
        setExpenseForm((f) => ({ ...f, branchId: prof.branch_id }));
      }

      await loadFinanceData(prof.business_id);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = Number(expenseForm.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid expense amount.");
      return;
    }
    setSavingExpense(true);
    const { error: insertError } = await supabase.from("expenses").insert({
      business_id: profile.business_id,
      branch_id: expenseForm.branchId,
      category: expenseForm.category,
      amount,
      description: expenseForm.description || null,
      recorded_by: profile.id,
    });
    setSavingExpense(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setExpenseForm((f) => ({ ...f, amount: "", description: "" }));
    await loadFinanceData(profile.business_id);
  }

  async function handleCashAdjustment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const amount = Number(cashForm.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    setSavingCash(true);
    const { error: insertError } = await supabase.from("cash_adjustments").insert({
      business_id: profile.business_id,
      type: cashForm.type,
      amount,
      description: cashForm.description || null,
      recorded_by: profile.id,
    });
    setSavingCash(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCashForm({ type: "injection", amount: "", description: "" });
    await loadFinanceData(profile.business_id);
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const isAllBranches = branchFilter === "all";
  const inBranch = (row: any) => isAllBranches || row.branch_id === branchFilter;

  const totalPurchases = purchases.filter(inBranch).reduce((sum, r) => sum + Number(r.final_amount_paid || 0), 0);
  const totalSales = sales.filter(inBranch).reduce((sum, r) => sum + Number(r.total_value || 0), 0);
  const totalAdvances = advances.filter(inBranch).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const totalExpenses = expenses.filter(inBranch).reduce((sum, r) => sum + Number(r.amount || 0), 0);

  // Cash injections/withdrawals are business-wide (not tied to a branch),
  // so they only factor into Cash Available when viewing "All branches".
  const totalInjections = isAllBranches
    ? cashAdjustments.filter((c) => c.type === "injection").reduce((sum, r) => sum + Number(r.amount), 0)
    : 0;
  const totalWithdrawals = isAllBranches
    ? cashAdjustments.filter((c) => c.type === "withdrawal").reduce((sum, r) => sum + Number(r.amount), 0)
    : 0;

  const profit = totalSales - totalPurchases - totalExpenses;
  const cashAvailable = totalInjections - totalWithdrawals + totalSales - totalPurchases - totalAdvances - totalExpenses;

  // Build the cash book: a unified, chronological ledger
  type CashRow = { date: string; description: string; moneyIn: number; moneyOut: number };
  const rows: CashRow[] = [];

  sales.filter(inBranch).forEach((s) =>
    rows.push({ date: s.created_at, description: "Sale to exporter", moneyIn: Number(s.total_value), moneyOut: 0 })
  );
  purchases.filter(inBranch).forEach((p) =>
    rows.push({ date: p.created_at, description: "Purchase from farmer", moneyIn: 0, moneyOut: Number(p.final_amount_paid) })
  );
  advances.filter(inBranch).forEach((a) =>
    rows.push({ date: a.created_at, description: "Advance given to farmer", moneyIn: 0, moneyOut: Number(a.amount) })
  );
  expenses.filter(inBranch).forEach((e) =>
    rows.push({ date: e.created_at, description: `Expense: ${e.category}${e.description ? ` (${e.description})` : ""}`, moneyIn: 0, moneyOut: Number(e.amount) })
  );
  if (isAllBranches) {
    cashAdjustments.forEach((c) =>
      rows.push({
        date: c.created_at,
        description: c.type === "injection" ? `Cash injection${c.description ? ` (${c.description})` : ""}` : `Cash withdrawal${c.description ? ` (${c.description})` : ""}`,
        moneyIn: c.type === "injection" ? Number(c.amount) : 0,
        moneyOut: c.type === "withdrawal" ? Number(c.amount) : 0,
      })
    );
  }

  rows.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  let running = 0;
  const cashBook = rows.map((r) => {
    running += r.moneyIn - r.moneyOut;
    return { ...r, balance: running };
  });

  return (
    <main className="min-h-screen p-6 max-w-2xl mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
      <h1 className="text-2xl font-semibold mb-4">Finance</h1>

      {profile.role === "owner" && branches.length > 0 && (
        <select
          className="w-full bg-surface border border-white/10 rounded-md p-3 text-sm mb-4"
          value={branchFilter}
          onChange={(e) => setBranchFilter(e.target.value)}
        >
          <option value="all">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
      )}
      {!isAllBranches && (
        <p className="text-xs opacity-50 mb-4">
          Cash injections/withdrawals are business-wide and only appear in the "All branches" view.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Cash Available</p>
          <p className="text-xl font-semibold text-gold">NGN {cashAvailable.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Profit</p>
          <p className="text-xl font-semibold">NGN {profit.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Total Sales</p>
          <p className="text-lg font-semibold">NGN {totalSales.toLocaleString()}</p>
        </div>
        <div className="bg-surface border border-white/10 rounded-md p-4">
          <p className="text-xs uppercase tracking-widest opacity-60">Total Advances</p>
          <p className="text-lg font-semibold">NGN {totalAdvances.toLocaleString()}</p>
        </div>
      </div>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <div className="bg-surface border border-white/10 rounded-md p-4 mb-6">
        <p className="text-sm font-semibold mb-3">Record an expense</p>
        <form onSubmit={handleAddExpense} className="space-y-3">
          {profile.role === "owner" && branches.length > 0 && (
            <select
              className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
              value={expenseForm.branchId}
              onChange={(e) => setExpenseForm({ ...expenseForm, branchId: e.target.value })}
              required
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          )}
          <select
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={expenseForm.category}
            onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
          >
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Amount (NGN)"
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={expenseForm.amount}
            onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
            required
          />
          <input
            placeholder="Description (optional)"
            className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
            value={expenseForm.description}
            onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
          />
          <button
            type="submit"
            disabled={savingExpense}
            className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
          >
            {savingExpense ? "Saving..." : "Add Expense"}
          </button>
        </form>
      </div>

      {profile.role === "owner" && (
        <div className="bg-surface border border-white/10 rounded-md p-4 mb-6">
          <p className="text-sm font-semibold mb-3">Record a cash injection / withdrawal</p>
          <form onSubmit={handleCashAdjustment} className="space-y-3">
            <select
              className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
              value={cashForm.type}
              onChange={(e) => setCashForm({ ...cashForm, type: e.target.value })}
            >
              <option value="injection">Cash Injection (money in)</option>
              <option value="withdrawal">Cash Withdrawal (money out)</option>
            </select>
            <input
              type="number"
              placeholder="Amount (NGN)"
              className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
              value={cashForm.amount}
              onChange={(e) => setCashForm({ ...cashForm, amount: e.target.value })}
              required
            />
            <input
              placeholder="Description (optional, e.g. Opening balance)"
              className="w-full bg-transparent border border-white/10 rounded-md p-2 text-sm"
              value={cashForm.description}
              onChange={(e) => setCashForm({ ...cashForm, description: e.target.value })}
            />
            <button
              type="submit"
              disabled={savingCash}
              className="bg-gold text-ink font-semibold rounded-md px-4 py-2 text-sm disabled:opacity-50"
            >
              {savingCash ? "Saving..." : "Record"}
            </button>
          </form>
        </div>
      )}

      <h2 className="text-sm uppercase tracking-widest opacity-60 mb-3">Cash Book</h2>
      <div className="overflow-x-auto mb-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-white/10 opacity-60">
              <th className="py-2 pr-2">Date</th>
              <th className="py-2 pr-2">Description</th>
              <th className="py-2 pr-2 text-right">Money In</th>
              <th className="py-2 pr-2 text-right">Money Out</th>
              <th className="py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {cashBook.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2 pr-2 whitespace-nowrap">{new Date(row.date).toLocaleDateString()}</td>
                <td className="py-2 pr-2">{row.description}</td>
                <td className="py-2 pr-2 text-right text-gold">
                  {row.moneyIn > 0 ? row.moneyIn.toLocaleString() : "-"}
                </td>
                <td className="py-2 pr-2 text-right text-rust">
                  {row.moneyOut > 0 ? row.moneyOut.toLocaleString() : "-"}
                </td>
                <td className="py-2 text-right font-medium">{row.balance.toLocaleString()}</td>
              </tr>
            ))}
            {cashBook.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center opacity-60">No transactions yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <a href="/dashboard" className="text-sm underline opacity-70">Back to Dashboard</a>
    </main>
  );
}
