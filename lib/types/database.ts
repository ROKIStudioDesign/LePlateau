export type PlanType = "free" | "pro" | "enterprise";
export type UserRole = "admin" | "member";
export type ZoneType = "open_space" | "meeting_room" | "focus" | "social" | "break";
export type MapTheme = "modern" | "zen" | "startup";
export type TeamsStatus =
  | "Available"
  | "Busy"
  | "InACall"
  | "InAMeeting"
  | "Away"
  | "BeRightBack"
  | "DoNotDisturb"
  | "Offline"
  | null;

// Use type aliases (not interfaces) — supabase-js generics require Row extends
// Record<string,unknown>, which TypeScript only satisfies for type aliases, not
// for interfaces (interfaces are "open" and fail the index-signature check).

export type Organization = {
  id: string;
  name: string;
  slug: string;
  plan: PlanType;
  max_users: number;
  logo_url: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  organization_id: string | null;
  display_name: string;
  avatar_url: string | null;
  role: UserRole;
  ms_access_token: string | null;
  teams_status: string | null;
  created_at: string;
};

export type OfficeMap = {
  id: string;
  organization_id: string;
  name: string;
  layout_json: Record<string, unknown>;
  theme: MapTheme;
  created_at: string;
};

export type Zone = {
  id: string;
  office_map_id: string;
  name: string;
  type: ZoneType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  max_capacity: number | null;
  auto_mute: boolean;
  created_at: string;
};

export type AvatarPosition = {
  id: string;
  user_id: string;
  office_map_id: string;
  x: number;
  y: number;
  zone_id: string | null;
  is_online: boolean;
  updated_at: string;
};

export type LiveKitRoom = {
  id: string;
  zone_id: string;
  room_name: string;
  is_active: boolean;
  created_at: string;
};

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationship[];
};

export type Database = {
  public: {
    Tables: {
      organizations: TableDef<
        Organization,
        Omit<Organization, "id" | "created_at">,
        Partial<Omit<Organization, "id" | "created_at">>
      >;
      profiles: TableDef<
        Profile,
        Omit<Profile, "created_at">,
        Partial<Omit<Profile, "id" | "created_at">>
      >;
      office_maps: TableDef<
        OfficeMap,
        Omit<OfficeMap, "id" | "created_at">,
        Partial<Omit<OfficeMap, "id" | "created_at">>
      >;
      zones: TableDef<
        Zone,
        Omit<Zone, "id" | "created_at">,
        Partial<Omit<Zone, "id" | "created_at">>
      >;
      avatar_positions: TableDef<
        AvatarPosition,
        Omit<AvatarPosition, "id" | "updated_at">,
        Partial<Omit<AvatarPosition, "id">>
      >;
      livekit_rooms: TableDef<
        LiveKitRoom,
        Omit<LiveKitRoom, "id" | "created_at">,
        Partial<Omit<LiveKitRoom, "id" | "created_at">>
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      plan_type: PlanType;
      user_role: UserRole;
      zone_type: ZoneType;
      map_theme: MapTheme;
    };
    CompositeTypes: Record<string, never>;
  };
};
