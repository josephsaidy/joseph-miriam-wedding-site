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
- `guests` table — one row per person
- `search_guests_for_rsvp()` — RPC for guest name search
- `get_group_by_guest_id()` — loads everyone in the same invitation group
- `submit_rsvp()` — updates all group members at once
- Row Level Security policies

## 3. Import Your Guest List

### Prepare `sample-guests.csv`

Each row = one person. Use `group_name` to link people in the same invitation.

```
full_name,normalized_name,group_name,is_group_leader,allowed_guests,rsvp_status
Joseph Saidy,joseph saidy,Joseph & Miriam,true,2,pending
Miriam Saidy,miriam saidy,Joseph & Miriam,false,2,pending
Georges Saidy,georges saidy,Georges & Joelle,true,4,pending
Joelle Saidy,joelle saidy,Georges & Joelle,false,4,pending
Rami Khalil,rami khalil,Rami Khalil,true,2,pending
```

**Rules:**
- `full_name` — the person's individual name (what they search)
- `normalized_name` — lowercase, no punctuation (e.g. `joseph saidy`)
- `group_name` — shared by everyone in the same invitation (shown to guests on the site)
- `is_group_leader` — set `true` for one person per group (the primary contact)
- `allowed_guests` — same value for everyone in the group (total seats for the invitation)
- `rsvp_status` — always `pending` on import

### Import via Supabase Table Editor

1. In Supabase → **Table Editor** → `guests` → **Import data from CSV**
2. Upload your CSV and map all columns
3. Click **Import**

### Tip: Generate normalized_name automatically after import

If you skipped filling in `normalized_name`, run this in the SQL Editor:

```sql
UPDATE guests
SET normalized_name = lower(trim(regexp_replace(
  regexp_replace(full_name, '[^a-zA-Z\s]', ' ', 'g'),
  '\s+', ' ', 'g'
)));
```

## 4. Test the RSVP Flow

1. Open the wedding site and scroll to the RSVP section
2. Type a guest name — both Joseph and Miriam will match their own rows
3. After selecting their name, the site loads the whole group and shows both members
4. Submitting the RSVP updates both rows in Supabase

## 5. Test the Admin Dashboard

1. Go to `/admin`
2. Log in with your `VITE_ADMIN_PASSWORD`
3. Guests are grouped by `group_name` — one row per invitation group
4. Use **Export CSV** to download all responses

## 6. Deploy

Use the Deploy button in Replit. All secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`) are already stored and will be available in production.
