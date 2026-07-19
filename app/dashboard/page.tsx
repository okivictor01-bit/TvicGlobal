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

  return (
    <main className="min-h-screen p-8">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-2">
        TvicGlobal
      </p>
      <h1 className="text-2xl font-semibold mb-1">
        Welcome, {profile?.full_name || "there"}
      </h1>
      {(profile?.role === "owner" || profile?.role === "manager") && (
  <a href="/staff/invite" className="text-xs text-gold underline mb-2 inline-block">
    + Invite Staff
  </a>
)}
      <p className="text-sm opacity-70 mb-6">
        Role: {profile?.role} {profile?.businesses?.name ? `· ${profile.businesses.name}` : "· Platform Admin"}
      </p>
      <button
        onClick={handleLogout}
        className="text-sm border border-white/10 rounded-md px-4 py-2"
      >
        Log out
      </button>
    </main>
  );
}
