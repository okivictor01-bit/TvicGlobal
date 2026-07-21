import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
    return NextResponse.json({ error: "You don't have permission to remove staff." }, { status: 403 });
  }

  const { staffUserId } = await req.json();
  if (!staffUserId) {
    return NextResponse.json({ error: "Missing staff user ID." }, { status: 400 });
  }

  const { data: targetProfile } = await supabaseAdmin
    .from("app_users")
    .select("*")
    .eq("id", staffUserId)
    .single();

  if (!targetProfile || targetProfile.business_id !== callerProfile.business_id) {
    return NextResponse.json({ error: "Staff member not found." }, { status: 404 });
  }

  if (targetProfile.role === "owner") {
    return NextResponse.json({ error: "The owner account cannot be removed." }, { status: 400 });
  }

  const { error: profileDeleteError } = await supabaseAdmin
    .from("app_users")
    .delete()
    .eq("id", staffUserId);
  if (profileDeleteError) {
    return NextResponse.json({ error: profileDeleteError.message }, { status: 400 });
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(staffUserId);
  if (authDeleteError) {
    return NextResponse.json({ error: authDeleteError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
