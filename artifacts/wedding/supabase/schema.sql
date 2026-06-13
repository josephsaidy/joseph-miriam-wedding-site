-- ============================================================
-- Joseph & Miriam Wedding RSVP — Supabase Schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- 1. GUESTS TABLE (one row = one invitation / household)
CREATE TABLE IF NOT EXISTS guests (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            TEXT NOT NULL,           -- display name, e.g. "Joseph & Miriam Saidy"
  normalized_name      TEXT NOT NULL,           -- lowercase, punctuation-stripped
  party_name           TEXT,
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

-- 2. GUEST ALIASES TABLE (multiple search names per invitation)
--    Each row is one searchable name that resolves to a household row in guests.
--    Example: "Joseph Saidy", "Miriam Saidy", and "Joseph & Miriam Saidy"
--    all have guest_id pointing to the same guests row.
CREATE TABLE IF NOT EXISTS guest_aliases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  alias           TEXT NOT NULL,      -- display form, e.g. "Joseph Saidy"
  normalized_alias TEXT NOT NULL      -- lowercase, punctuation-stripped
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_guests_normalized_name         ON guests (normalized_name);
CREATE INDEX IF NOT EXISTS idx_guests_rsvp_status             ON guests (rsvp_status);
CREATE INDEX IF NOT EXISTS idx_guest_aliases_guest_id         ON guest_aliases (guest_id);
CREATE INDEX IF NOT EXISTS idx_guest_aliases_normalized_alias ON guest_aliases (normalized_alias);

-- 4. UPDATED_AT TRIGGER
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

-- 5. ROW LEVEL SECURITY
ALTER TABLE guests        ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_aliases ENABLE ROW LEVEL SECURITY;

-- Guests: anon can read (filtered via RPC) and update RSVP fields
CREATE POLICY "guests_select" ON guests FOR SELECT TO anon USING (true);
CREATE POLICY "guests_update" ON guests FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Aliases: anon can read (via RPC only)
CREATE POLICY "aliases_select" ON guest_aliases FOR SELECT TO anon USING (true);

-- 6. RPC: SEARCH — returns a flat list of (guest_id, display_name, normalized)
--    Sources: the household's own name + every alias row.
--    The frontend fuzzy-matches against this list; guest_id always points to guests.id
--    so get_guest_by_id always works regardless of which name matched.
CREATE OR REPLACE FUNCTION search_guests_for_rsvp()
RETURNS TABLE (id UUID, full_name TEXT, normalized_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  -- The household's primary display name
  SELECT g.id, g.full_name, g.normalized_name
  FROM guests g

  UNION ALL

  -- Every alias row, but returning the household guest_id as "id"
  SELECT a.guest_id AS id, a.alias AS full_name, a.normalized_alias AS normalized_name
  FROM guest_aliases a;
$$;

-- 7. RPC: SUBMIT RSVP
CREATE OR REPLACE FUNCTION submit_rsvp(
  p_id                   UUID,
  p_rsvp_status          TEXT,
  p_attending_count      INTEGER,
  p_guest_message        TEXT,
  p_dietary_restrictions TEXT
)
RETURNS guests
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result guests;
BEGIN
  IF p_rsvp_status NOT IN ('attending', 'not_attending') THEN
    RAISE EXCEPTION 'Invalid rsvp_status: %', p_rsvp_status;
  END IF;

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

-- 8. RPC: GET GUEST BY ID (always uses guests.id — aliases resolve via UNION above)
CREATE OR REPLACE FUNCTION get_guest_by_id(p_id UUID)
RETURNS guests
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM guests WHERE id = p_id LIMIT 1;
$$;

-- 9. GRANT RPC access to anon
GRANT EXECUTE ON FUNCTION search_guests_for_rsvp()                           TO anon;
GRANT EXECUTE ON FUNCTION submit_rsvp(UUID, TEXT, INTEGER, TEXT, TEXT)        TO anon;
GRANT EXECUTE ON FUNCTION get_guest_by_id(UUID)                               TO anon;
