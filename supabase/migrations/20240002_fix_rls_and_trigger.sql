-- ============================================================
-- Migration: fix RLS policies + auto-create profile on signup
-- ============================================================

-- ------------------------------------------------------------
-- 1. Organizations — INSERT policy
--    The initial schema had no INSERT policy, so any attempt to
--    create an org from the client (onboarding) was blocked.
-- ------------------------------------------------------------

CREATE POLICY "Authenticated users can create organizations"
  ON organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ------------------------------------------------------------
-- 2. Organizations — SELECT policy
--    Members can only see the org they belong to.
-- ------------------------------------------------------------

CREATE POLICY "Users can view their own organization"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ------------------------------------------------------------
-- 3. Auto-create profile row on new auth.users INSERT
--    Without this trigger a brand-new OAuth user has no profile
--    row, causing 406 errors on any profiles query before
--    onboarding completes.
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop before recreate so re-running this migration is safe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
