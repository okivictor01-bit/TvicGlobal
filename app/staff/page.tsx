"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function StaffList() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [resetResult, setResetResult] = useState<{ id: string; password: string } | null>(null);
  const [error, setError] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

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

      let query = supabase.from("app_users").select("*").neq("id", user.id);
      if (prof.role === "manager") {
        query = query.eq("branch_id", prof.branch_id);
      } else {
        query = query.eq("business_id", prof.business_id);
      }
      const { data: staffList } = await query;
      setStaff(staffList || []);
    }
    load();
  }, [router]);

  async function handleReset(staffUserId: string) {
    setLoadingId(staffUserId);
    setError("");
    setResetResult(null);

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/reset-staff-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ staffUserId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong.");
      setLoadingId(null);
      return;
    }
    setResetResult({ id: staffUserId, password: data.tempPassword });
    setLoadingId(null);
  }

  if (!profile) return <main className="min-h-screen flex items-center justify-center">Loading...</main>;

  return (
    <main className="min-h-screen p-8 max-w-lg mx-auto">
      <p className="font-mono text-xs tracking-widest text-gold uppercase mb-1">TvicGlobal</p>
      <h1 className="text-2xl font-semibold mb-6">Staff</h1>

      {error && <p className="text-rust text-sm mb-4">{error}</p>}

      <ul className="space-y-3">
        {staff.map((s) => (
          <li key={s.id} className="border border-white/10 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">{s.full_name}</p>
                <p className="text-xs opacity-60">{s.role}</p>
              </div>
              <button
                onClick={() => handleReset(s.id)}
                disabled={loadingId === s.id}
                className="text-xs border border-white/10 rounded-md px-3 py-2 disabled:opacity-50"
              >
                {loadingId === s.id ? "Resetting..." : "Reset Password"}
              </button>
            </div>
            {resetResult?.id === s.id && (
              <div className="mt-3 border border-olive rounded-md p-3">
                <p className="text-olive text-sm mb-1">New password ✓</p>
                <p className="font-mono text-sm">{resetResult?.password}</p>
                <p className="text-xs opacity-60 mt-1">Share this with {s.full_name} directly.</p>
              </div>
            )}
          </li>
        ))}
        {staff.length === 0 && <p className="text-sm opacity-60">No staff yet.</p>}
      </ul>
    </main>
  );
}
