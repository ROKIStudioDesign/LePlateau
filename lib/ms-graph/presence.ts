import type { TeamsStatus } from "@/lib/types/database";

export interface MSPresenceResponse {
  availability: string;
  activity: string;
}

export async function fetchMSPresence(
  accessToken: string
): Promise<MSPresenceResponse | null> {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/presence", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) return null;
    return response.json() as Promise<MSPresenceResponse>;
  } catch {
    return null;
  }
}

export function mapTeamsStatus(availability: string): TeamsStatus {
  const map: Record<string, TeamsStatus> = {
    Available: "Available",
    Busy: "Busy",
    BusyIdle: "Busy",
    DoNotDisturb: "DoNotDisturb",
    InACall: "InACall",
    InAMeeting: "InAMeeting",
    InAConferenceCall: "InAMeeting",
    Away: "Away",
    BeRightBack: "BeRightBack",
    Offline: "Offline",
    PresenceUnknown: "Offline",
  };
  return map[availability] ?? null;
}

export function getStatusLabel(status: TeamsStatus): string {
  const labels: Record<string, string> = {
    Available: "Disponible",
    Busy: "Occupé",
    InACall: "En appel",
    InAMeeting: "En réunion",
    Away: "Absent",
    BeRightBack: "De retour",
    DoNotDisturb: "Ne pas déranger",
    Offline: "Hors ligne",
  };
  return status ? (labels[status] ?? status) : "Hors ligne";
}

export function getStatusColor(status: TeamsStatus): string {
  if (!status || status === "Offline") return "#64748B";
  if (status === "Available") return "#10B981";
  if (status === "Away" || status === "BeRightBack") return "#F59E0B";
  if (status === "DoNotDisturb") return "#EF4444";
  if (["Busy", "InACall", "InAMeeting"].includes(status)) return "#EF4444";
  return "#64748B";
}
