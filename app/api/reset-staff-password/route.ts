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
    return NextResponse.json({ error: "You don't have permission to reset passwords." }, { status: 403 });
  }

  const { staffUserId } = await req.json();
  if (!staffUserId) {
    return NextResponse.json({ error: "Missing staff user ID." }, { status: 400 });
  }

  // Confirm the target staff belongs to the same business
  const { data: targetProfile } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", staffUserId)
    .single();

  if (!targetProfile || targetProfile.business_id !== callerProfile.business_id) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  const tempPassword = generateTempPassword();
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(staffUserId, {
    password: tempPassword,
  });
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, tempPassword });
}
