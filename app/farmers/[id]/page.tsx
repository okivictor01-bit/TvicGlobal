"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function FarmerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const farmerId = params.id as string;

  const [profile, setProfile] = useState<any>(null);
  const [farmer, setFarmer] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPurchaseId, setEditingPurchaseId] = useState<string | null>(null);
  const [editPurchaseForm, setEditPurchaseForm] = useState({
    weight_kg: "", price_per_kg: "", quality_result: "", discount_value: "", advance_deducted: "",
  });
  const [savingPurchaseEdit, setSavingPurchaseEdit] = useState(false);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId]);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || prof.role === "super_admin") { router.push("/dashboard"); return; }
    setProfile(prof);

    const { data: farmerData, error: farmerError } = await supabase
      .from("farmers")
      .select("*")
      .eq("id", farmerId)
      .single();
    if (farmerError || !farmerData) {
      setError("Customer not found.");
      setLoading(false);
      return;
    }
    setFarmer(farmerData);

    const { data: purchases } = await supabase
      .from("purchases")
      .select("*, products(name)")
      .eq("farmer_id", farmerId)
      .order("created_at", { ascending: false });

    const { data: advances } = await supabase
      .from("advances")
      .select("*")
      .eq("farmer_id", farmerId)
      .order("created_at", { ascending: false });

    const purchaseRows = (purchases || []).map((p: any) => ({
      type: "purchase" as const,
      id: p.id,
      branch_id: p.branch_id,
      created_at: p.created_at,
      productName: p.products?.name || "Unknown",
      weight_kg: p.weight_kg,
      price_per_kg: p.price_per_kg,
      quality_result: p.quality_result,
      quality_discount_value: p.quality_discount_value,
      net_value: p.net_value,
      advance_deducted: p.advance_deducted,
      final_amount_paid: p.final_amount_paid,
    }));

    const advanceRows = (advances || []).map((a: any) => ({
      type: "advance" as const,
      id: a.id,
      created_at: a.created_at,
      amount: a.amount,
    }));

    const combined = [...purchaseRows, ...advanceRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    setTransactions(combined);

    const totalAdvances = (advances || []).reduce((sum: number, a: any) => sum + Number(a.amount), 0);
    const totalDeducted = (purchases || []).reduce(
      (sum: number, p: any) => sum + Number(p.advance_deducted || 0),
      0
    );
    setBalance(totalAdvances - totalDeducted);

    setLoading(false);
  }

  function startEditPurchase(t: any) {
    setEditingPurchaseId(t.id);
    setEditPurchaseForm({
      weight_kg: String(t.weight_kg),
      price_per_kg: String(t.price_per_kg),
      quality_result: t.quality_result || "",
      discount_value: String(t.quality_discount_value || 0),
      advance_deducted: String(t.advance_deducted || 0),
    });
    setError("");
  }

  async function handleSavePurchaseEdit(purchaseId: string) {
    setError("");
    const weight_kg = Number(editPurchaseForm.weight_kg);
    const price_per_kg = Number(editPurchaseForm.price_per_kg);
    const discount_value = Number(editPurchaseForm.discount_value) || 0;
    const advance_deducted = Number(editPurchaseForm.advance_deducted) || 0;

    if (!weight_kg || weight_kg <= 0 || !price_per_kg || price_per_kg <= 0) {
      setError("Weight and price must be valid positive numbers.");
      return;
    }

    const gross_value = weight_kg * price_per_kg;
    const net_value = gross_value - discount_value;
    const quality_discount_pct = gross_value > 0 ? Math.round((discount_value / gross_value) * 10000) / 100 : 0;
    const final_amount_paid = net_value - advance_deducted;

    setSavingPurchaseEdit(true);
    const { error: updateError } = await supabase
      .from("purchases")
      .update({
        weight_kg,
        price_per_kg,
        quality_result: editPurchaseForm.quality_result,
        gross_value,
        quality_discount_value: discount_value,
        quality_discount_pct,
        net_value,
        advance_deducted,
        final_amount_paid,
      })
      .eq("id", purchaseId);
    setSavingPurchaseEdit(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }
    setEditingPurchaseId(null);
    load();
  }

  async function handleDeletePurchase(purchaseId: string) {
    if (!confirm("Delete this purchase permanently? This can't be undone.")) return;
    setError("");
    const { error: deleteError } = await supabase.from("purchases").delete().eq("id", purchaseId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    load();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  if (error) {
    return (
      <main className="min-h-screen p-8 max-w-lg mx-auto text-center">
        <p className="text-rust text-sm mb-4">{error}</p>
        <a href="/farmers" className="text-gold underline text-sm">Back to Farmers</a>
      </main>
    );
  }

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
          .print-card { border: 1px solid #ccc !important; background: white !important; color: black !important; }
        }
      `}</style>
      <main className="min-h-screen p-8 max-w-lg mx-auto">
        <a href="/farmers" className="no-print text-xs text-gold underline mb-4 inline-block">Back to Farmers</a>

        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">Agrobuyer</p>
        <h1 className="text-2xl font-semibold mb-1">{farmer.name}</h1>
        <p className="text-xs opacity-60 mb-4">
          {farmer.phone} {farmer.location ? `- ${farmer.location}` : ""}
        </p>

        <div className="print-card border border-white/10 rounded-lg p-4 mb-8">
          <p className="text-xs opacity-60 mb-1">Outstanding Advance Balance</p>
          <p className="text-xl font-mono text-gold">NGN {balance.toLocaleString()}</p>
        </div>

        <p className="text-sm font-semibold mb-3">Transaction History</p>
        <ul className="space-y-3">
          {transactions.map((t) => (
            <li key={`${t.type}-${t.id}`} className="print-card border border-white/10 rounded-lg p-4">
              {t.type === "advance" ? (
                <>
                  <p className="text-xs text-olive uppercase tracking-wide mb-1">Advance Given</p>
                  <p className="font-mono text-sm mb-1">NGN {Number(t.amount).toLocaleString()}</p>
                </>
              ) : editingPurchaseId === t.id ? (
                <div className="space-y-2 no-print">
                  <p className="text-xs text-gold uppercase tracking-wide mb-1">Editing Purchase — {t.productName}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Weight (kg)"
                      className="bg-surface border border-white/10 rounded-md p-2 text-sm"
                      value={editPurchaseForm.weight_kg}
                      onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, weight_kg: e.target.value })}
                    />
                    <input
                      type="number"
                      placeholder="Price/kg"
                      className="bg-surface border border-white/10 rounded-md p-2 text-sm"
                      value={editPurchaseForm.price_per_kg}
                      onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, price_per_kg: e.target.value })}
                    />
                  </div>
                  <input
                    placeholder="Quality result (e.g. Grade A, 12% moisture)"
                    className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
                    value={editPurchaseForm.quality_result}
                    onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, quality_result: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs opacity-60">Quality discount (NGN)</label>
                      <input
                        type="number"
                        className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
                        value={editPurchaseForm.discount_value}
                        onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, discount_value: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-xs opacity-60">Advance deducted (NGN)</label>
                      <input
                        type="number"
                        className="w-full bg-surface border border-white/10 rounded-md p-2 text-sm"
                        value={editPurchaseForm.advance_deducted}
                        onChange={(e) => setEditPurchaseForm({ ...editPurchaseForm, advance_deducted: e.target.value })}
                      />
                    </div>
                  </div>
                  {error && <p className="text-rust text-xs">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSavePurchaseEdit(t.id)}
                      disabled={savingPurchaseEdit}
                      className="text-xs bg-gold text-ink font-semibold rounded-md px-3 py-2 disabled:opacity-50"
                    >
                      {savingPurchaseEdit ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => setEditingPurchaseId(null)}
                      className="text-xs border border-white/10 rounded-md px-3 py-2"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <p className="text-xs text-gold uppercase tracking-wide mb-1">Purchase</p>
                    {(profile?.role === "owner" || (profile?.role === "manager" && t.branch_id === profile.branch_id)) && (
                      <div className="no-print flex gap-2">
                        <button
                          onClick={() => startEditPurchase(t)}
                          className="text-xs underline opacity-70"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePurchase(t.id)}
                          className="text-xs underline text-rust"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm mb-1">
                    {t.productName} - {Number(t.weight_kg).toLocaleString()} kg @ NGN{" "}
                    {Number(t.price_per_kg).toLocaleString()}/kg
                  </p>
                  <p className="text-xs opacity-60 mb-1">Quality: {t.quality_result}</p>
                  <p className="text-xs opacity-60 mb-1">
                    Net value: NGN {Number(t.net_value).toLocaleString()}
                  </p>
                  {Number(t.advance_deducted) > 0 && (
                    <p className="text-xs opacity-60 mb-1">
                      Advance deducted: NGN {Number(t.advance_deducted).toLocaleString()}
                    </p>
                  )}
                  <p className="font-mono text-sm text-gold">
                    Paid: NGN {Number(t.final_amount_paid).toLocaleString()}
                  </p>
                </>
              )}
              <p className="text-xs opacity-40 mt-2">
                {new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString()}
              </p>
            </li>
          ))}
          {transactions.length === 0 && (
            <p className="text-sm opacity-60">No transactions with this customer yet.</p>
          )}
        </ul>

        <button onClick={() => window.print()} className="no-print w-full bg-gold text-ink font-semibold rounded-md p-3 mt-6">Download as PDF</button>
        <a href="/dashboard" className="no-print block mt-3 text-sm underline opacity-70 text-center">Back to Dashboard</a>
      </main>
    </>
  );
}
