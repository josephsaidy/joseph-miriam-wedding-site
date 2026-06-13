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
CREATE TABLE IF NOT EXISTS guest_aliases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guest_id        UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  alias           TEXT NOT NULL,
  normalized_alias TEXT NOT NULL
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

CREATE POLICY "guests_select" ON guests FOR SELECT TO anon USING (true);
CREATE POLICY "guests_update" ON guests FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "aliases_select" ON guest_aliases FOR SELECT TO anon USING (true);

-- 6. HELPER: normalize a text string (lowercase, strip punctuation, collapse spaces)
CREATE OR REPLACE FUNCTION normalize_text(input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(trim(regexp_replace(
    regexp_replace(input, '[^a-zA-Z\s]', ' ', 'g'),
    '\s+', ' ', 'g'
  )));
$$;

-- 7. AUTO-GENERATE ALIASES from full_name
--
--    Handles these patterns:
--      "FirstA & FirstB LastName"  → FirstA LastName, FirstB LastName,
--                                    FirstA FirstB, FirstB FirstA,
--                                    FirstA and FirstB LastName,
--                                    FirstB & FirstA LastName, etc.
--      "FirstA and FirstB LastName"→ same as above
--      "FirstA LastName Family"    → FirstA LastName, FirstA Family
--      Single names               → just the full_name itself
--
--    Rules:
--      - Never deletes manually added aliases
--      - Skips duplicates (by normalized_alias per guest)
--      - Returns the number of new aliases inserted
--
CREATE OR REPLACE FUNCTION generate_guest_aliases()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  g               RECORD;
  new_aliases     TEXT[] := ARRAY[]::TEXT[];
  alias_text      TEXT;
  normalized      TEXT;
  inserted_count  INTEGER := 0;

  -- parsing
  clean_name      TEXT;
  tokens          TEXT[];
  first1          TEXT;
  first2          TEXT;
  last_name       TEXT;
BEGIN
  FOR g IN SELECT id, full_name FROM guests LOOP
    new_aliases := ARRAY[]::TEXT[];

    -- Always include the exact full_name
    new_aliases := array_append(new_aliases, g.full_name);

    -- ── Pattern: connector name (& or " and ") ──────────────────────────────
    IF g.full_name ~ '&' OR g.full_name ~* '\s+and\s+' THEN

      -- Normalise & ↔ and so we handle both the same way
      clean_name := regexp_replace(g.full_name, '\s*&\s*|\s+and\s+', ' & ', 'gi');

      -- Tokenise without the & symbol
      tokens := array_remove(
        string_to_array(regexp_replace(clean_name, '\s*&\s*', ' ', 'g'), ' '),
        ''
      );

      IF array_length(tokens, 1) >= 3 THEN
        -- Assume: FirstA FirstB … LastName  (last token = shared surname)
        first1    := tokens[1];
        last_name := tokens[array_length(tokens, 1)];
        -- second-to-last token = second first name
        first2    := tokens[array_length(tokens, 1) - 1];

        -- Individual names
        new_aliases := array_append(new_aliases, first1 || ' ' || last_name);
        new_aliases := array_append(new_aliases, first2 || ' ' || last_name);

        -- First names only (no last name)
        new_aliases := array_append(new_aliases, first1 || ' ' || first2);
        new_aliases := array_append(new_aliases, first2 || ' ' || first1);

        -- Ampersand variants
        new_aliases := array_append(new_aliases, first1 || ' & ' || first2 || ' ' || last_name);
        new_aliases := array_append(new_aliases, first2 || ' & ' || first1 || ' ' || last_name);

        -- "and" word variants
        new_aliases := array_append(new_aliases, first1 || ' and ' || first2 || ' ' || last_name);
        new_aliases := array_append(new_aliases, first2 || ' and ' || first1 || ' ' || last_name);

      ELSIF array_length(tokens, 1) = 2 THEN
        -- Two first names, no shared last name
        first1 := tokens[1];
        first2 := tokens[2];

        new_aliases := array_append(new_aliases, first1 || ' ' || first2);
        new_aliases := array_append(new_aliases, first2 || ' ' || first1);
        new_aliases := array_append(new_aliases, first1 || ' & ' || first2);
        new_aliases := array_append(new_aliases, first2 || ' & ' || first1);
        new_aliases := array_append(new_aliases, first1 || ' and ' || first2);
        new_aliases := array_append(new_aliases, first2 || ' and ' || first1);
      END IF;
    END IF;

    -- ── Pattern: "… Family" suffix ──────────────────────────────────────────
    IF g.full_name ~* '\bfamily\b' THEN
      -- Version without "Family"
      clean_name := trim(regexp_replace(g.full_name, '\s*\bfamily\b\s*$', '', 'gi'));
      IF clean_name <> g.full_name AND length(clean_name) > 0 THEN
        new_aliases := array_append(new_aliases, clean_name);
      END IF;

      -- "FirstName Family" (just the first token + Family)
      tokens := array_remove(string_to_array(g.full_name, ' '), '');
      IF array_length(tokens, 1) >= 2 THEN
        new_aliases := array_append(new_aliases, tokens[1] || ' Family');
      END IF;
    END IF;

    -- ── Insert each candidate alias, skipping duplicates ────────────────────
    FOREACH alias_text IN ARRAY new_aliases LOOP
      alias_text := trim(alias_text);
      CONTINUE WHEN length(alias_text) < 2;

      normalized := normalize_text(alias_text);

      IF NOT EXISTS (
        SELECT 1 FROM guest_aliases
        WHERE guest_id = g.id AND normalized_alias = normalized
      ) THEN
        INSERT INTO guest_aliases (guest_id, alias, normalized_alias)
        VALUES (g.id, alias_text, normalized);
        inserted_count := inserted_count + 1;
      END IF;
    END LOOP;

  END LOOP;

  RETURN inserted_count;
END;
$$;

-- 8. RPC: SEARCH — returns flat list for fuzzy matching
--    Both the household's own name and every alias row map back to guests.id
CREATE OR REPLACE FUNCTION search_guests_for_rsvp()
RETURNS TABLE (id UUID, full_name TEXT, normalized_name TEXT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT g.id, g.full_name, g.normalized_name
  FROM guests g

  UNION ALL

  SELECT a.guest_id AS id, a.alias AS full_name, a.normalized_alias AS normalized_name
  FROM guest_aliases a;
$$;

-- 9. RPC: SUBMIT RSVP
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

-- 10. RPC: GET GUEST BY ID
CREATE OR REPLACE FUNCTION get_guest_by_id(p_id UUID)
RETURNS guests
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM guests WHERE id = p_id LIMIT 1;
$$;

-- 11. GRANT RPC access to anon
GRANT EXECUTE ON FUNCTION normalize_text(TEXT)                                TO anon;
GRANT EXECUTE ON FUNCTION generate_guest_aliases()                            TO anon;
GRANT EXECUTE ON FUNCTION search_guests_for_rsvp()                           TO anon;
GRANT EXECUTE ON FUNCTION submit_rsvp(UUID, TEXT, INTEGER, TEXT, TEXT)        TO anon;
GRANT EXECUTE ON FUNCTION get_guest_by_id(UUID)                               TO anon;
