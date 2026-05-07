export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

interface InviteRequestBody {
  emails: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // Use the regular client to verify the calling user's identity and role
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: only admins can invite users" },
        { status: 403 }
      );
    }

    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("emails" in body) ||
      !Array.isArray((body as InviteRequestBody).emails)
    ) {
      return NextResponse.json(
        { error: "Missing required field: emails (must be an array)" },
        { status: 400 }
      );
    }

    const { emails } = body as InviteRequestBody;

    if (emails.length === 0) {
      return NextResponse.json(
        { error: "emails array must not be empty" },
        { status: 400 }
      );
    }

    const invalidEmails = emails.filter(
      (e) => typeof e !== "string" || e.trim() === ""
    );
    if (invalidEmails.length > 0) {
      return NextResponse.json(
        { error: "All emails must be non-empty strings" },
        { status: 400 }
      );
    }

    // Use the service client for admin operations
    const serviceClient = await createServiceClient();

    let invited = 0;

    for (const email of emails) {
      const { error } = await serviceClient.auth.admin.inviteUserByEmail(
        email.trim()
      );
      if (!error) {
        invited++;
      } else {
        console.warn(`[invite] Failed to invite ${email}:`, error.message);
      }
    }

    return NextResponse.json({ invited });
  } catch (err) {
    console.error("[invite] Error inviting users:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
