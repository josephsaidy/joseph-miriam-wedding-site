# RSVP System Setup Instructions

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New project", name it (e.g. "joseph-miriam-wedding"), set a DB password
3. Wait ~1 min for provisioning

## 2. Run the Schema

1. Go to **SQL Editor** → **New query**
2. Paste the full contents of `supabase/schema.sql`
3. Click **Run**

This creates:
- `guests` table — one row per invitation/household
- `guest_aliases` table — multiple searchable names per household
- Secure RPC functions for guest search and RSVP submission
- Row Level Security policies

## 3. Import Your Guest List

### Step A — Import `sample-guests.csv` into the `guests` table

1. Edit `supabase/sample-guests.csv` with your real household rows.
   Each row = one invitation. `full_name` should be the household display name.

2. In Supabase → **Table Editor** → `guests` → **Import data from CSV**

3. Upload the file and map columns: `full_name`, `party_name`, `allowed_guests`

4. Click **Import**

### Step B — Auto-populate `normalized_name`

After importing, run this in the SQL Editor to fill in the normalized names:

```sql
UPDATE guests
SET normalized_name = lower(
  trim(regexp_replace(
    regexp_replace(full_name, '[^a-zA-Z\s]', ' ', 'g'),
    '\s+', ' ', 'g'
  ))
);
```

### Step C — Import aliases

1. Edit `supabase/sample-aliases.csv` — add one row per searchable name per household.
   The `guest_full_name` column must exactly match `full_name` in the guests table.

   Example CSV:
   ```
   guest_full_name,alias
   Joseph & Miriam Saidy,Joseph Saidy
   Joseph & Miriam Saidy,Miriam Saidy
   Joseph & Miriam Saidy,Joseph & Miriam Saidy
   ```

2. Run this SQL in the SQL Editor to insert the aliases (linking by full_name):

```sql
-- Run after importing sample-aliases.csv data via a temp table, or insert manually:
INSERT INTO guest_aliases (guest_id, alias, normalized_alias)
SELECT
  g.id,
  a.alias,
  lower(trim(regexp_replace(regexp_replace(a.alias, '[^a-zA-Z\s]', ' ', 'g'), '\s+', ' ', 'g')))
FROM (
  VALUES
    ('Joseph & Miriam Saidy', 'Joseph Saidy'),
    ('Joseph & Miriam Saidy', 'Miriam Saidy'),
    ('Joseph & Miriam Saidy', 'Joseph & Miriam Saidy'),
    ('Joseph & Miriam Saidy', 'Miriam & Joseph Saidy'),
    ('Antoine & Carla Gemayel', 'Antoine Gemayel'),
    ('Antoine & Carla Gemayel', 'Carla Gemayel')
    -- Add more rows here following the same pattern
) AS a(guest_full_name, alias)
JOIN guests g ON g.full_name = a.guest_full_name;
```

**Tip:** For each couple/household, add these aliases:
- Each person's individual name (e.g. "Joseph Saidy", "Miriam Saidy")  
- The combined name in both orders (e.g. "Joseph & Miriam Saidy", "Miriam & Joseph Saidy")
- Common nicknames if applicable

## 4. Verify in the Admin Dashboard

1. Go to `/admin` on your wedding site
2. Enter your `VITE_ADMIN_PASSWORD`
3. Each guest row shows a "Search Names" column listing all aliases

## 5. Test RSVP Flow

1. Scroll to the RSVP section on the wedding site
2. Try typing individual names (e.g. "Joseph Saidy" or "Miriam Saidy") — both should match the same household
3. Try a slight misspelling to test fuzzy matching
4. Complete the RSVP form and check Supabase Table Editor to confirm the update

## 6. Deploy

Use the Deploy button in Replit. All secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`) are already stored and available in production.
