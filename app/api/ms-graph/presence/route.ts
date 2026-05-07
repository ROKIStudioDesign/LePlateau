export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchMSPresence, mapTeamsStatus } from "@/lib/ms-graph/presence";

export async function GET(): Promise<NextResponse> {
  try {
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
      .select("ms_access_token")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    if (!profile.ms_access_token) {
      return NextResponse.json(
        { error: "No Microsoft access token found" },
        { status: 401 }
      );
    }

    const presence = await fetchMSPresence(profile.ms_access_token);

    if (!presence) {
      return NextResponse.json(
        { error: "Failed to fetch Microsoft presence" },
        { status: 502 }
      );
    }

    const status = mapTeamsStatus(presence.availability);

    await supabase
      .from("profiles")
      .update({ teams_status: status })
      .eq("id", user.id);

    return NextResponse.json({ status });
  } catch (err) {
    console.error("[ms-graph/presence] Error fetching presence:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
