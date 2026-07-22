"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "ok" | "locked">("checking");
  const [business, setBusiness] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: prof } = await supabase
      .from("app_users")
      .select("role, business_id, businesses(*)")
      .eq("id", user.id)
      .single();

    if (!prof) {
      router.push("/login");
      return;
    }

    // Platform admins aren't tied to a business subscription.
    if (prof.role === "super_admin") {
      setStatus("ok");
      return;
    }

    const biz: any = prof.businesses;
    setBusiness(biz);
    setIsOwner(prof.role === "owner");

    const now = new Date();
    const trialEndsAt = biz?.trial_ends_at ? new Date(biz.trial_ends_at) : null;
    const subExpiresAt = biz?.subscription_expires_at ? new Date(biz.subscription_expires_at) : null;
    const isPaidActive = biz?.subscription_status === "active" && subExpiresAt && now < subExpiresAt;
    const isTrialActive = !isPaidActive && biz?.subscription_status === "trial" && trialEndsAt && now < trialEndsAt;

    setStatus(!isPaidActive && !isTrialActive ? "locked" : "ok");
  }

  if (status === "checking") {
    return <main className="min-h-screen flex items-center justify-center">Loading...</main>;
  }

  if (status === "locked") {
    return (
      <main className="min-h-screen p-8 max-w-lg mx-auto flex flex-col items-center justify-center text-center">
        <p className="font-mono text-xs tracking-widest text-gold uppercase mb-2">Agrobuyer</p>
        <h1 className="text-2xl font-semibold mb-3">Your trial has ended</h1>
        <p className="text-sm opacity-70 mb-6">
          {isOwner
            ? `Subscribe to keep recording purchases, sales, and reports for ${business?.name || "your business"}.`
            : `Ask ${business?.name ? `the owner of ${business.name}` : "your business owner"} to renew the subscription to keep using Agrobuyer.`}
        </p>
        {isOwner && (
          <a href="/billing" className="bg-gold text-ink font-semibold px-5 py-3 rounded-md">
            Subscribe Now
          </a>
        )}
      </main>
    );
  }

  return <>{children}</>;
}
