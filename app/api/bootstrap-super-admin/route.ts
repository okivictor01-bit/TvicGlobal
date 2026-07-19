import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  const { secret, fullName, email, password } = await req.json();

  if (!secret || secret !== process.env.SUPER_ADMIN_SETUP_SECRET) {
    return NextResponse.json({ error: "Invalid setup secret." }, { status: 403 });
  }
  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError || !authUser.user) {
    return NextResponse.json({ error: authError?.message || "Could not create user." }, { status: 400 });
  }

  const { error: profileError } = await supabaseAdmin.from("app_users").insert({
    id: authUser.user.id,
    business_id: null,
    branch_id: null,
    role: "super_admin",
    full_name: fullName,
  });
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
