export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    const headerSecret = req.headers.get("x-webhook-secret");

    if (!secret || headerSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload: WebhookPayload = (await req.json()) as WebhookPayload;

    // Handle user deletion from auth.users
    if (payload.schema === "auth" && payload.table === "users" && payload.type === "DELETE") {
      const deletedUserId =
        payload.old_record && typeof payload.old_record["id"] === "string"
          ? payload.old_record["id"]
          : null;

      if (!deletedUserId) {
        console.warn("[webhook/supabase] DELETE event missing user id");
        return NextResponse.json({ received: true });
      }

      const supabase = await createServiceClient();

      // Clean up avatar positions
      const { error: positionsError } = await supabase
        .from("avatar_positions")
        .delete()
        .eq("user_id", deletedUserId);

      if (positionsError) {
        console.error(
          `[webhook/supabase] Failed to delete avatar_positions for user ${deletedUserId}:`,
          positionsError.message
        );
      }

      // Clean up profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", deletedUserId);

      if (profileError) {
        console.error(
          `[webhook/supabase] Failed to delete profile for user ${deletedUserId}:`,
          profileError.message
        );
      }

      console.log(
        `[webhook/supabase] Cleaned up data for deleted user: ${deletedUserId}`
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/supabase] Error handling webhook:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
