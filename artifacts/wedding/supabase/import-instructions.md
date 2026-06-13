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
- `normalize_text()` helper function
- `generate_guest_aliases()` — auto-generates aliases from full_name
- `search_guests_for_rsvp()`, `submit_rsvp()`, `get_guest_by_id()` RPCs
- Row Level Security policies

## 3. Import Your Guest List

### Step A — Prepare `sample-guests.csv`

Edit `supabase/sample-guests.csv` with your real households. Each row = one invitation.

```
full_name,party_name,allowed_guests
Joseph & Miriam Saidy,Saidy Household,2
Georges & Joelle Hayek,Hayek Household,4
Tony Saidy Family,Saidy Family,6
```

**Tips for `full_name`:**
- Use `FirstA & FirstB LastName` for couples — aliases will be auto-generated
- Use `Name Family` for family invitations — aliases will be auto-generated
- This is the display name guests will see after matching

### Step B — Import the CSV into Supabase

1. In Supabase → **Table Editor** → `guests` → **Import data from CSV**
2. Upload the file and map columns: `full_name`, `party_name`, `allowed_guests`
3. Click **Import**

### Step C — Populate normalized_name

After importing, run this in the SQL Editor:

```sql
UPDATE guests
SET normalized_name = normalize_text(full_name);
```

### Step D — Auto-generate aliases

**Option 1 (easiest): Use the Admin Dashboard**
1. Go to `/admin` on your wedding site
2. Log in with your `VITE_ADMIN_PASSWORD`
3. Click the **"Generate Aliases"** button
4. Done — aliases appear instantly in the Search Names column

**Option 2: Run directly in Supabase SQL Editor**
```sql
SELECT generate_guest_aliases();
```
The function returns the number of new aliases inserted.

---

## What aliases are auto-generated?

| `full_name` | Auto-generated aliases |
|---|---|
| `Joseph & Miriam Saidy` | Joseph Saidy, Miriam Saidy, Joseph Miriam, Miriam Joseph, Joseph and Miriam Saidy, Miriam & Joseph Saidy, Miriam and Joseph Saidy |
| `Georges & Joelle Hayek` | Georges Hayek, Joelle Hayek, Georges Joelle, Joelle Georges, Georges and Joelle Hayek, Joelle & Georges Hayek … |
| `Tony Saidy Family` | Tony Saidy, Tony Family |

- The function **never deletes** manually added aliases — it only adds new ones
- Running it multiple times is safe (skips duplicates by normalized form)

---

## 4. Test the RSVP Flow

1. Open the wedding site and scroll to the RSVP section
2. Type any of the generated search names (try "Joseph Saidy" or "Miriam Saidy")
3. Both should surface the same household invitation
4. Complete the RSVP form and verify the row updates in the Supabase Table Editor

## 5. Test the Admin Dashboard

1. Go to `/admin`
2. Log in with your `VITE_ADMIN_PASSWORD`
3. Stats, guest table, and search names should all be visible
4. Use **Export CSV** to download a full response list

## 6. Deploy

Use the Deploy button in Replit. All secrets (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_ADMIN_PASSWORD`) are already stored and will be available in production.
