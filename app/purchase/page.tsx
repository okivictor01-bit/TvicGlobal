"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function PurchaseEntry() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [qualityRules, setQualityRules] = useState<any[]>([]);
  const [balances, setBalances] = useState<Record<string, number>>({});

  const [farmerId, setFarmerId] = useState("");
  const [productId, setProductId] = useState("");
  const [weight, setWeight] = useState<number>(0);
  const [price, setPrice] = useState<number>(0);
  const [moisture, setMoisture] = useState<number>(0);
  const [grade, setGrade] = useState("A");
  const [advanceDeduct, setAdvanceDeduct] = useState<number>(0);

  const [receipt, setReceipt] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
    if (!prof || !["owner", "manager", "secretary"].includes(prof.role)) {
      router.push("/dashboard");
      return;
    }
    setProfile(prof);

    const { data: farmerList } = await supabase.from("farmers").select("*").order("name");
    setFarmers(farmerList || []);
    if (farmerList && farmerList.length > 0) setFarmerId(farmerList[0].id);

    const { data: productList } = await supabase.from("products").select("*").order("name");
    setProducts(productList || []);
    if (productList && productList.length > 0) {
      setProductId(productList[0].id);
      setPrice(Number(productList[0].price_per_kg));
    }

    const { data: rules } = await supabase.from("quality_rules").select("*");
    setQualityRules(rules || []);

    const { data: advancesData } = await supabase.from("advances").select("farmer_id, amount");
    const { data: purchasesData } = await supabase.from("purchases").select("farmer_id, advance_deducted");
    const bal: Record<string, number> = {};
    (advancesData || []).forEach((a: any) => { bal[a.farmer_id] = (bal[a.farmer_id] || 0) + Number(a.amount); });
    (purchasesData || []).forEach((p: any) => { bal[p.farmer_id] = (bal[p.farmer_id] || 0) - Number(p.advance_deducted || 0); });
    setBalances(bal);

    setLoading(false);
  }

  const product = products.find((p) => p.id === productId);
  const rulesForProduct = qualityRules.filter((r) => r.product_id === productId);

  function getDiscount() {
    if (!product) return { pct: 0, resultLabel: "" };
    if (product.test_type === "moisture") {
      const rule = rulesForProduct.find(
        (r) => moisture >= Number(r.min_value) && moisture <= Number(r.max_value)
      );
      return { pct: rule ? Number(rule.discount_pct) : 0, resultLabel: `${moisture}% moisture` };
    } else {
      const rule = rulesForProduct.find((r) => r.grade_value === grade);
      return { pct: rule ? Number(rule.discount_pct) : 0, resultLabel: `Grade ${grade}` };
    }
  }

  const gross = weight * price;
  const { pct, resultLabel } = getDiscount();
  const discountValue = gross * (pct / 100);
  const netValue = gross - discountValue;
  const farmerBalance = balances[farmerId] || 0;
  const deduct = Math.min(advanceDeduct || 0, farmerBalance, netValue);
  const finalPay = netValue - deduct;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("purchases")
      .insert({
        business_id: profile.business_id,
        branch_id: profile.branch_id,
        farmer_id: farmerId,
        product_id: productId,
        weight_kg: weight,
        price_per_kg: price,
        gross_value: gross,
        quality_test_type: product.test_type,
        quality_result: resultLabel,
        quality_discount_pct: pct,
        quality_discount_value: discountValue,
        net_value: netValue,
        advance_deducted: deduct,
        final_amount_paid: finalPay,
        recorded_by: profile.id,
        approval_status: "auto_approved",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    setReceipt({
      ...data,
      farmerName: farmers.find((f) => f.id === farmerId)?.name,
      productName: product?.name,
    });
    setSaving(false);
    load();
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  if (farmers.length === 0) {
    return (
      <main className="min-h-screen p-8 max-w-md mx-auto">
        <p className="text-sm opacity-70 mb-4">You need at least one farmer before recording a purchase.</p>
        <a href="/farmers" className="text-gold underline text-sm">+ Add a farmer</a>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-6">Record a Purchase</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs opacity-60 block mb-1">Farmer</label>
          <select
            className="w-full bg-surface border border-white/10 rounded-md p-3"
            value={farmerId}
            onChange={(e) => setFarmerId(e.target.value)}
          >
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
          <p className="text-xs opacity-60 mt-1">Outstanding advance: NGN {farmerBalance.toLocaleString()}</p>
        </div>

        <div>
          <label className="text-xs opacity-60 block mb-1">Product</label>
          <select
            className="w-full bg-surface border border-white/10 rounded-md p-3"
