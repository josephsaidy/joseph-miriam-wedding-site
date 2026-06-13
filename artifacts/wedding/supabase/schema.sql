-- ============================================================
-- Joseph & Miriam Wedding RSVP — Supabase Schema (simplified)
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. GUESTS TABLE
--    One row per invited person.
--    People who share an invitation share the same group_name.
--    is_group_leader marks the primary contact for the group.
CREATE TABLE IF NOT EXISTS guests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            TEXT NOT NULL,
  normalized_name      TEXT NOT NULL,          -- lowercase, punctuation-stripped
  group_name           TEXT NOT NULL,          -- shared by everyone in the same invitation
  is_group_leader      BOOLEAN NOT NULL DEFAULT false,
  allowed_guests       INTEGER NOT NULL DEFAULT 1 CHECK (allowed_guests >= 1),
  rsvp_status          TEXT NOT NULL DEFAULT 'pending'
                         CHECK (rsvp_status IN ('pending', 'attending', 'not_attending')),
  attending_count      INTEGER CHECK (attending_count >= 0),
  guest_message        TEXT,
  dietary_restrictions TEXT,
  submitted_at         TIMESTAMPTZ,
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_guests_normalized_name ON guests (normalized_name);
CREATE INDEX IF NOT EXISTS idx_guests_group_name      ON guests (group_name);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status     ON guests (rsvp_status);

-- 3. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER guests_updated_at
  BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 4. ROW LEVEL SECURITY
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guests_select" ON guests FOR SELECT TO anon USING (true);
CREATE POLICY "guests_update" ON guests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- 5. RPC: SEARCH — returns id, full_name, normalized_name for fuzzy matching
--    The frontend searches this list; the matched id is then used to load the group.
CREATE OR REPLACE FUNCTION search_guests_for_rsvp()
RETURNS TABLE (id UUID, full_name TEXT, normalized_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, full_name, normalized_name FROM guests;
$$;

-- 6. RPC: GET GROUP BY GUEST ID
--    Returns all members of the same invitation group as the matched guest.
CREATE OR REPLACE FUNCTION get_group_by_guest_id(p_id UUID)
RETURNS SETOF guests
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM guests
  WHERE group_name = (SELECT group_name FROM guests WHERE id = p_id)
  ORDER BY is_group_leader DESC, full_name;
$$;

-- 7. RPC: SUBMIT RSVP
--    Updates every member of the group that contains p_id with the same RSVP data.
--    Returns the number of rows updated.
CREATE OR REPLACE FUNCTION submit_rsvp(
  p_id                   UUID,
  p_rsvp_status          TEXT,
  p_attending_count      INTEGER,
  p_guest_message        TEXT,
  p_dietary_restrictions TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_group_name TEXT;
  v_updated    INTEGER;
BEGIN
  IF p_rsvp_status NOT IN ('attending', 'not_attending') THEN
    RAISE EXCEPTION 'Invalid rsvp_status: %', p_rsvp_status;
  END IF;

  SELECT group_name INTO v_group_name FROM guests WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found: %', p_id;
  END IF;

  UPDATE guests SET
    rsvp_status          = p_rsvp_status,
    attending_count      = CASE WHEN p_rsvp_status = 'not_attending' THEN 0 ELSE p_attending_count END,
    guest_message        = p_guest_message,
    dietary_restrictions = p_dietary_restrictions,
    submitted_at         = NOW(),
    updated_at           = NOW()
  WHERE group_name = v_group_name;

  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$;

-- 8. GRANT RPC access to anon
GRANT EXECUTE ON FUNCTION search_guests_for_rsvp()                           TO anon;
GRANT EXECUTE ON FUNCTION get_group_by_guest_id(UUID)                        TO anon;
GRANT EXECUTE ON FUNCTION submit_rsvp(UUID, TEXT, INTEGER, TEXT, TEXT)        TO anon;
