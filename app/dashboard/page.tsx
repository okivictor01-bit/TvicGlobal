"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function Dashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
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
        .select("*, businesses(name)")
        .eq("id", user.id)
        .single();
      if (data?.role === "super_admin") {
        router.push("/admin/dashboard");
        return;
      }
      setProfile(data);
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  const canManageStaff = profile?.role === "owner" || profile?.role === "manager";
  const canRecordPurchases = ["owner", "manager", "secretary"].includes(profile?.role);

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-2">
        TvicGlobal
      </p>
      <h1 className="text-2xl font-semibold mb-1">
        Welcome, {profile?.full_name || "there"}
      </h1>
      <p className="text-sm opacity-70 mb-6">
        Role: {profile?.role} {profile?.businesses?.name ? `- ${profile.businesses.name}` : "- Platform Admin"}
      </p>

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
