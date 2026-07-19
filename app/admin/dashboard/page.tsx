"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AdminDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [businesses, setBusinesses] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: prof } = await supabase.from("app_users").select("*").eq("id", user.id).single();
      if (!prof || prof.role !== "super_admin") {
        router.push("/dashboard");
        return;
      }
      setProfile(prof);

      const { data: bizList } = await supabase
        .from("businesses")
        .select("*")
        .order("created_at", { ascending: false });
      setBusinesses(bizList || []);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!profile) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">
        TvicGlobal · Super Admin
      </p>
      <h1 className="text-2xl font-semibold mb-6">All Businesses</h1>

      <ul className="space-y-3 max-w-lg mb-6">
        {businesses.map((b) => (
          <li key={b.id} className="border border-white/10 rounded-lg p-4">
            <p className="font-semibold">{b.name}</p>
            <p className="text-xs opacity-60">
              {b.slug}.tvicglobal.app · {b.subscription_status}
            </p>
          </li>
        ))}
        {businesses.length === 0 && <p className="text-sm opacity-60">No businesses registered yet.</p>}
      </ul>

      <button onClick={handleLogout} className="text-sm border border-white/10 rounded-md px-4 py-2">
        Log out
      </button>
    </main>
  );
}
