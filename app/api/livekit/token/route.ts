export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { generateLiveKitToken } from "@/lib/livekit/token";

interface TokenRequestBody {
  roomName: string;
  userId: string;
  displayName: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body: unknown = await req.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("roomName" in body) ||
      !("userId" in body) ||
      !("displayName" in body)
    ) {
      return NextResponse.json(
        { error: "Missing required fields: roomName, userId, displayName" },
        { status: 400 }
      );
    }

    const { roomName, userId, displayName } = body as TokenRequestBody;

    if (
      typeof roomName !== "string" ||
      typeof userId !== "string" ||
      typeof displayName !== "string" ||
      roomName.trim() === "" ||
      userId.trim() === "" ||
      displayName.trim() === ""
    ) {
      return NextResponse.json(
        { error: "roomName, userId, and displayName must be non-empty strings" },
        { status: 400 }
      );
    }

    const token = await generateLiveKitToken(roomName, userId, displayName);

    return NextResponse.json({ token });
  } catch (err) {
    console.error("[livekit/token] Error generating token:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
