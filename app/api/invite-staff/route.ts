import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function generateTempPassword() {
  return Math.random().toString(36).slice(-8) + "A1!";
}

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  // Identify who's making the request
  const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
  if (callerError || !callerData.user) {
    return NextResponse.json({ error: "Invalid session." }, { status: 401 });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", callerData.user.id)
    .single();

  if (!callerProfile || !["owner", "manager"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "You don't have permission to invite staff." }, { status: 403 });
  }

  const { fullName, email, role, branchId } = await req.json();

  if (!fullName || !email || !role || !branchId) {
    return NextResponse.json({ error: "All fields are required." }, { status: 400 });
  }

  // Enforce role rules
  const allowedRoles = callerProfile.role === "owner"
    ? ["manager", "secretary"]
    : ["secretary"];
  if (!allowedRoles.includes(role)) {
    return NextResponse.json({ error: "You can't assign that role." }, { status: 403 });
  }

  // Managers can only invite into their own branch
  if (callerProfile.role === "manager" && branchId !== callerProfile.branch_id) {
    return NextResponse.json({ error: "You can only invite staff to your own branch." }, { status: 403 });
  }

  const tempPassword = generateTempPassword();

  const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });
  if (createError || !newUser.user) {
    return NextResponse.json({ error: createError?.message || "Could not create user." }, { status: 400 });
  }

  const { error: profileInsertError } = await supabaseAdmin.from("app_users").insert({
    id: newUser.user.id,
    business_id: callerProfile.business_id,
    branch_id: branchId,
    role,
    full_name: fullName,
  });
  if (profileInsertError) {
    return NextResponse.json({ error: profileInsertError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, email, tempPassword });
}
