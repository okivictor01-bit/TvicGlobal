import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(req: Request) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { data: affiliate, error: affiliateError } = await supabaseAdmin
    .from("affiliates")
    .select("*")
    .eq("user_id", userData.user.id)
    .single();

  if (affiliateError || !affiliate) {
    return NextResponse.json({ error: "No affiliate account found for this user." }, { status: 404 });
  }

  const { data: referrals } = await supabaseAdmin
    .from("businesses")
    .select("id, name, subscription_status, created_at")
    .eq("referred_by_affiliate_id", affiliate.id)
    .order("created_at", { ascending: false });

  const { data: commissions } = await supabaseAdmin
    .from("affiliate_commissions")
    .select("*")
    .eq("affiliate_id", affiliate.id);

  return NextResponse.json({ affiliate, referrals: referrals || [], commissions: commissions || [] });
}
