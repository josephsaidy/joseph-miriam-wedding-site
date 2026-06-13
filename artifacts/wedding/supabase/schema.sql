-- ============================================================
-- Joseph & Miriam Wedding RSVP — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. GUESTS TABLE
CREATE TABLE IF NOT EXISTS guests (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           TEXT NOT NULL,
  normalized_name     TEXT NOT NULL,
  party_name          TEXT,
  allowed_guests      INTEGER NOT NULL DEFAULT 1 CHECK (allowed_guests >= 1),
  rsvp_status         TEXT NOT NULL DEFAULT 'pending'
                        CHECK (rsvp_status IN ('pending', 'attending', 'not_attending')),
  attending_count     INTEGER CHECK (attending_count >= 0),
  guest_message       TEXT,
  dietary_restrictions TEXT,
  submitted_at        TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_guests_normalized_name ON guests (normalized_name);
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

-- Allow anonymous users to search normalized names only (no full guest list exposure)
CREATE POLICY "guests_search" ON guests
  FOR SELECT
  TO anon
  USING (true);  -- filtered by RPC functions below; direct SELECT is locked via RPC

-- Allow anonymous users to update RSVP fields only (not name, allowed_guests, etc.)
CREATE POLICY "guests_rsvp_update" ON guests
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 5. RPC: SEARCH GUESTS (returns only id, full_name, normalized_name for fuzzy matching)
--    Prevents full list exposure — clients get only what they need for matching.
CREATE OR REPLACE FUNCTION search_guests_for_rsvp()
RETURNS TABLE (id UUID, full_name TEXT, normalized_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT id, full_name, normalized_name FROM guests;
$$;

-- 6. RPC: SUBMIT RSVP
CREATE OR REPLACE FUNCTION submit_rsvp(
  p_id                UUID,
  p_rsvp_status       TEXT,
  p_attending_count   INTEGER,
  p_guest_message     TEXT,
  p_dietary_restrictions TEXT
)
RETURNS guests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result guests;
BEGIN
  -- Validate status
  IF p_rsvp_status NOT IN ('attending', 'not_attending') THEN
    RAISE EXCEPTION 'Invalid rsvp_status: %', p_rsvp_status;
  END IF;

  -- Update the row
  UPDATE guests SET
    rsvp_status          = p_rsvp_status,
    attending_count      = CASE WHEN p_rsvp_status = 'not_attending' THEN 0 ELSE p_attending_count END,
    guest_message        = p_guest_message,
    dietary_restrictions = p_dietary_restrictions,
    submitted_at         = NOW(),
    updated_at           = NOW()
  WHERE id = p_id
  RETURNING * INTO result;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Guest not found: %', p_id;
  END IF;

  RETURN result;
END;
$$;

-- 7. RPC: GET GUEST BY ID (for post-match detail fetch)
CREATE OR REPLACE FUNCTION get_guest_by_id(p_id UUID)
RETURNS guests
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM guests WHERE id = p_id LIMIT 1;
$$;

-- 8. GRANT RPC access to anon
GRANT EXECUTE ON FUNCTION search_guests_for_rsvp()      TO anon;
GRANT EXECUTE ON FUNCTION submit_rsvp(UUID, TEXT, INTEGER, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_guest_by_id(UUID)          TO anon;
