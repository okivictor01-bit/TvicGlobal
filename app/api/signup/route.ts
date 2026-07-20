import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { businessName, ownerName, email, password } = await req.json();

  if (!businessName || !ownerName || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const slug = businessName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  // 1. Create the auth user
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || "Could not create user." }, { status: 400 });
  }

  // 2. Create the business (tenant), starting a 7-day free trial
  const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: business, error: bizError } = await supabaseAdmin
    .from("businesses")
    .insert({ name: businessName, slug, subscription_status: "trial", trial_ends_at: trialEndsAt })
    .select()
    .single();
  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 400 });
  }

  // 3. Create their first branch
  const { data: branch, error: branchError } = await supabaseAdmin
    .from("branches")
    .insert({ business_id: business.id, name: "Main Branch" })
    .select()
    .single();
  if (branchError) {
    return NextResponse.json({ error: branchError.message }, { status: 400 });
  }

  // 4. Create the app_users profile as 'owner'
  const { error: profileError } = await supabaseAdmin.from("app_users").insert({
    id: authUser.user.id,
    business_id: business.id,
    branch_id: branch.id,
    role: "owner",
    full_name: ownerName,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, businessId: business.id, slug });
}
