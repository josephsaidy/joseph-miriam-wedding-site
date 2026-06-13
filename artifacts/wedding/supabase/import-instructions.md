# RSVP System Setup Instructions

## 1. Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New project"
3. Choose a name (e.g. "joseph-miriam-wedding") and set a database password
4. Wait for the project to provision (~1 min)

## 2. Run the Schema

1. In your Supabase project, go to **SQL Editor** → **New query**
2. Paste the entire contents of `supabase/schema.sql`
3. Click **Run**

## 3. Environment Variables (already done)

The following secrets are stored in Replit Secrets:
- `VITE_SUPABASE_URL` — your project URL (Settings → API → Project URL)
- `VITE_SUPABASE_ANON_KEY` — your anon/public key (Settings → API → Project API Keys)
- `VITE_ADMIN_PASSWORD` — your chosen admin dashboard password

## 4. Import Guest List

### Option A — CSV Import (recommended)

1. Edit `supabase/sample-guests.csv` with your real guest list.
   The `normalized_name` column is computed automatically by a trigger — **do not add it manually**.
   
   Format:
   ```
   full_name,party_name,allowed_guests
   Joseph Saidy,Saidy Family,2
   Miriam Khoury,Khoury Family,4
   ```

2. In Supabase, go to **Table Editor** → **guests** → **Import data**
3. Upload the CSV and map columns: `full_name`, `party_name`, `allowed_guests`
4. Click Import

### Option B — SQL Insert

Run this in the SQL Editor for each guest:
```sql
INSERT INTO guests (full_name, normalized_name, party_name, allowed_guests)
VALUES (
  'Joseph Saidy',
  lower(regexp_replace('Joseph Saidy', '[^a-zA-Z ]', '', 'g')),
  'Saidy Family',
  2
);
```

> **Important:** The `normalized_name` must be the lowercase, punctuation-stripped version of `full_name`. 
> Use this SQL to auto-populate it after a bulk import:
> ```sql
> UPDATE guests
> SET normalized_name = lower(regexp_replace(
>   regexp_replace(full_name, '[^\w\s]', ' ', 'g'),
>   '\s+', ' ', 'g'
> ));
> ```

## 5. Test the RSVP Flow

1. Open the wedding site and scroll to the RSVP section
2. Type a guest name (try slight misspellings to test fuzzy matching)
3. Confirm the match and fill in the form
4. Submit — check Supabase Table Editor to confirm the row updated

## 6. Test the Admin Dashboard

1. Go to `/admin` on your wedding site
2. Enter your `VITE_ADMIN_PASSWORD`
3. You should see all guests, their RSVP status, and stats

## 7. Deploy

Use the Deploy button in Replit. All environment variables are already stored as Secrets and will be available in production.
