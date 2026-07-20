"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data } = await supabase
        .from("app_users")
        .select("*, businesses(*)")
        .eq("id", user.id)
        .single();
      if (data?.role === "super_admin") {
        router.push("/admin/dashboard");
        return;
      }
      setProfile(data);
      setBusiness(data?.businesses || null);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const now = new Date();
  const trialEndsAt = business?.trial_ends_at ? new Date(business.trial_ends_at) : null;
  const subExpiresAt = business?.subscription_expires_at ? new Date(business.subscription_expires_at) : null;
  const isPaidActive = business?.subscription_status === "active" && subExpiresAt && now < subExpiresAt;
  const isTrialActive = !isPaidActive && business?.subscription_status === "trial" && trialEndsAt && now < trialEndsAt;
  const isLocked = business && !isPaidActive && !isTrialActive;

  if (isLocked) {
    const isOwner = profile?.role === "owner";
    return (
      <main className="min-h-screen p-8 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-2">TvicGlobal</p>
        <h1 className="text-2xl font-semibold mb-3">Your trial has ended</h1>
        <p className="text-sm opacity-70 mb-6">
          {isOwner
            ? "Subscribe to keep recording purchases, sales, and reports for " + (business?.name || "your business") + "."
            : `Ask ${business?.name ? `the owner of ${business.name}` : "your business owner"} to renew the subscription to keep using TvicGlobal.`}
        </p>
        {isOwner && (
          <a href="/billing" className="bg-gold text-ink font-semibold px-5 py-3 rounded-md mb-4">
            Subscribe Now
          </a>
        )}
        <button onClick={handleLogout} className="text-sm border border-white/10 rounded-md px-4 py-2">
          Log out
        </button>
      </main>
    );
  }

  const canManageStaff = profile?.role === "owner" || profile?.role === "manager";
  const canManageInventory = profile?.role === "owner" || profile?.role === "manager";
  const canRecordPurchases = ["owner", "manager", "secretary"].includes(profile?.role);
  const trialDaysLeft = isTrialActive && trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-2">
        TvicGlobal
      </p>
      <h1 className="text-2xl font-semibold mb-1">
        Welcome, {profile?.full_name || "there"}
      </h1>
      <p className="text-sm opacity-70 mb-1">
        Role: {profile?.role} {business?.name ? `- ${business.name}` : "- Platform Admin"}
      </p>
      {trialDaysLeft !== null && (
        <p className="text-xs mb-6">
          <a href="/billing" className="text-gold underline">
            {trialDaysLeft} day(s) left in your free trial
          </a>
        </p>
      )}
      {trialDaysLeft === null && <div className="mb-6" />}

      <nav className="space-y-3 mb-8">
        {canRecordPurchases && (
          <a
            href="/purchase"
            className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
          >
            <p className="font-semibold text-sm">Record a Purchase</p>
            <p className="text-xs opacity-60">Weigh, grade, and pay a farmer</p>
          </a>
        )}

        <a
          href="/farmers"
          className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
        >
          <p className="font-semibold text-sm">Farmers</p>
          <p className="text-xs opacity-60">Add farmers, give advances, view balances</p>
        </a>

        {profile?.role === "owner" && (
          <a
            href="/branches"
            className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
          >
            <p className="font-semibold text-sm">Branches</p>
            <p className="text-xs opacity-60">Add branches, see staff per branch</p>
          </a>
        )}

        {profile?.role === "owner" && (
          <a
            href="/reports"
            className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
          >
            <p className="font-semibold text-sm">Reports</p>
            <p className="text-xs opacity-60">Daily, weekly, monthly, yearly - export as PDF</p>
          </a>
        )}

        {canManageInventory && (
          <>
            <a
              href="/inventory"
              className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
            >
              <p className="font-semibold text-sm">Inventory</p>
              <p className="text-xs opacity-60">Stock on hand, cost basis, margin</p>
            </a>
            <a
              href="/sales"
              className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
            >
              <p className="font-semibold text-sm">Record a Sale</p>
              <p className="text-xs opacity-60">Sell to an exporter</p>
            </a>
          </>
        )}

        {canManageStaff && (
          <>
            <a
              href="/staff"
              className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
            >
              <p className="font-semibold text-sm">Staff</p>
              <p className="text-xs opacity-60">View staff, reset passwords</p>
            </a>
            <a
              href="/staff/invite"
              className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
            >
              <p className="font-semibold text-sm">+ Invite Staff</p>
              <p className="text-xs opacity-60">Create a manager, secretary, or worker account</p>
            </a>
          </>
        )}

        {profile?.role === "owner" && (
          <a
            href="/billing"
            className="block border border-white/10 rounded-lg p-4 hover:border-gold transition-colors"
          >
            <p className="font-semibold text-sm">Billing</p>
            <p className="text-xs opacity-60">Manage your subscription</p>
          </a>
        )}
      </nav>

      <button
        onClick={handleLogout}
        className="text-sm border border-white/10 rounded-md px-4 py-2"
      >
        Log out
      </button>
    </main>
  );
}
