# LePlateau

A spatial virtual office for remote and hybrid teams. Users appear as avatars on a 2D canvas, move between zones, and automatically join zone-based audio rooms via LiveKit. Microsoft Teams presence is synced in real time.

## Tech Stack

- **Next.js 14** (App Router, TypeScript)
- **Supabase** — Postgres, Realtime, Auth (Microsoft OAuth via Azure AD)
- **LiveKit** — zone-based spatial audio
- **React-Konva** — 2D canvas rendering
- **Zustand** — global office state
- **Framer Motion** — UI animations
- **Tailwind CSS** — styling

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [LiveKit](https://livekit.io) Cloud account (or self-hosted server)
- A Microsoft Azure AD app registration (for Microsoft OAuth + Teams presence)

---

## Environment Variables

Create a `.env.local` file at the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# LiveKit
LIVEKIT_API_KEY=<your-livekit-api-key>
LIVEKIT_API_SECRET=<your-livekit-api-secret>
NEXT_PUBLIC_LIVEKIT_URL=wss://<your-livekit-host>

# Microsoft Graph (Teams presence)
NEXT_PUBLIC_AZURE_CLIENT_ID=<your-azure-app-client-id>
NEXT_PUBLIC_AZURE_TENANT_ID=<your-azure-tenant-id>

# Webhook secret (for Supabase → app webhooks)
WEBHOOK_SECRET=<random-secret-string>
```

---

## Database Setup

### 1. Run migrations

In the Supabase SQL editor, run the migration file:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, enums, RLS policies, helper functions, and enables Realtime on the required tables.

### 2. Enable Realtime

The migration enables Realtime publication for `avatar_positions` and `profiles`. Verify in the Supabase dashboard under **Database → Replication** that both tables are listed.

### 3. Configure the Supabase webhook

To automatically clean up user data when an auth user is deleted, create a webhook in the Supabase dashboard:

- **Table**: `auth.users`
- **Events**: `DELETE`
- **URL**: `https://<your-domain>/api/webhooks/supabase`
- **HTTP header**: `x-webhook-secret: <your WEBHOOK_SECRET value>`

---

## Microsoft Azure AD Setup

### 1. Create an App Registration

1. Go to [Azure Portal](https://portal.azure.com) → **Azure Active Directory → App registrations → New registration**
2. Set the redirect URI to:
   - `https://<your-domain>/auth/callback` (production)
   - `http://localhost:3000/auth/callback` (development)

### 2. Configure API permissions

Add the following **Delegated** Microsoft Graph permissions:

- `Presence.Read` — read the signed-in user's Teams presence
- `User.Read` — read basic profile info

Grant admin consent for your tenant.

### 3. Configure Supabase Auth provider

In the Supabase dashboard under **Authentication → Providers → Azure**:

- **Client ID**: your Azure app's Application (client) ID
- **Client Secret**: create a client secret in Azure and paste it here
- **Tenant URL**: `https://login.microsoftonline.com/<your-tenant-id>`

Set the **Redirect URL** in Supabase to match the one registered in Azure.

---

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The middleware redirects unauthenticated users to `/auth/login`. Sign in with a Microsoft account linked to your Azure AD tenant.

First-time users are directed to `/onboarding` to create their organization and pick an office layout.

---

## Production Build

```bash
npm run build
npm start
```

---

## Project Structure

```
app/
  auth/
    login/          # Microsoft OAuth login page
    callback/       # OAuth callback → redirects to onboarding or dashboard
  onboarding/       # 3-step wizard: org creation, invite, office layout
  dashboard/
    office/         # Main spatial office canvas
    settings/
      organization/ # Org settings (name, logo)
      members/      # Member management + invite
      billing/      # Plan & billing overview
components/
  canvas/           # Konva canvas, zone panels, knock toasts
  audio/            # LiveKit provider + mic controls
  layout/           # Sidebar, dashboard shell
  ui/               # Shared UI primitives (button, card, badge, etc.)
lib/
  supabase/         # Browser + server + middleware Supabase clients
  livekit/          # Token generation
  ms-graph/         # Teams presence polling
  store/            # Zustand office store
  canvas/           # Zone layout templates
  types/            # Database type definitions
hooks/
  use-livekit-audio.ts   # Zone-based audio connect/disconnect
  use-ms-presence.ts     # Teams status polling
  use-presence.ts        # Realtime avatar position sync
supabase/
  migrations/       # SQL schema migrations
```

---

## Key Features

- **Spatial canvas** — drag your avatar between zones; proximity triggers audio connection
- **Zone-based audio** — entering a meeting room automatically connects you to its LiveKit room
- **Knock notifications** — send a knock to users in a zone; they receive a toast notification
- **Teams presence sync** — your Microsoft Teams status (Available, Busy, DND…) is reflected on your avatar
- **Admin panel** — invite members by email, manage organization settings
- **Invite-only access** — only admins can invite new users; new users receive a Supabase magic-link email
