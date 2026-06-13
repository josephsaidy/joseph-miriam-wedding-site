# Joseph & Miriam — Wedding Website

A luxury, mobile-first wedding website for Joseph & Miriam's wedding on August 2nd, 2026 in Bekaa, Lebanon. Includes an online RSVP system backed by Supabase and a password-protected admin dashboard.

## Run & Operate

- `pnpm --filter @workspace/wedding run dev` — run the wedding site (workflow: `artifacts/wedding: web`)
- `pnpm --filter @workspace/wedding run typecheck` — typecheck the wedding package
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- React + Vite, TypeScript, Tailwind CSS, shadcn/ui
- Animations: framer-motion
- Forms: react-hook-form + zod
- Router: wouter (SPA, base path from `BASE_PATH` env var)
- DB/RSVP backend: Supabase (PostgreSQL)
- Fonts: Playfair Display (serif), Inter

## Where things live

| Path | Purpose |
|---|---|
| `artifacts/wedding/src/` | React app source |
| `artifacts/wedding/src/pages/Home.tsx` | Main wedding page (all sections) |
| `artifacts/wedding/src/pages/Admin.tsx` | Admin RSVP dashboard (`/admin`) |
| `artifacts/wedding/src/components/RSVP.tsx` | Multi-step RSVP component |
| `artifacts/wedding/src/lib/supabase.ts` | Supabase client + Guest type |
| `artifacts/wedding/src/lib/fuzzy.ts` | Fuzzy name matching logic |
| `artifacts/wedding/supabase/schema.sql` | Full Supabase schema + RPCs |
| `artifacts/wedding/supabase/sample-guests.csv` | Example guest list CSV |
| `artifacts/wedding/supabase/import-instructions.md` | Step-by-step Supabase setup |
| `artifacts/wedding/public/favicon.svg` | J&M monogram favicon |
| `artifacts/wedding/public/opengraph.jpg` | OG/social preview image (1200×630) |
| `scripts/generate-og.sh` | Regenerate the OG image from photos |

## RSVP System

**Schema**: one row per person, grouped by `group_name`. `is_group_leader` marks the primary contact per invitation.

**Flow**:
1. Guest searches their name → `search_guests_for_rsvp()` RPC (returns only `id/full_name/normalized_name`)
2. Frontend fuzzy-matches client-side (`src/lib/fuzzy.ts`)
3. Guest confirms → `get_group_by_guest_id(id)` loads the full invitation group
4. Guest submits → `submit_rsvp(id, ...)` updates all group members atomically

**Security**:
- No direct `SELECT` or `UPDATE` policy on `guests` for anon — all access via SECURITY DEFINER RPCs
- `search_guests_for_rsvp()` exposes only name/id, not RSVP data
- `submit_rsvp()` enforces `attending_count <= allowed_guests` server-side
- Admin dashboard reads via `get_all_guests_admin()` RPC, gated client-side by `VITE_ADMIN_PASSWORD`

## Required Environment Variables

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_ADMIN_PASSWORD` | Admin dashboard password |

All set as Replit secrets — never hardcode these.

## Architecture Decisions

- **One row per person** (not per household) so every invited individual is searchable by name without needing a separate aliases table.
- **All Supabase writes go through RPCs**, not direct table mutations, so RLS policies can stay minimal (no anon SELECT/UPDATE needed).
- **Fuzzy matching runs client-side** against the minimal search RPC payload (id + name only) to avoid exposing full guest data during the search step.
- **Admin password is client-side only** — acceptable for a private wedding site; the meaningful data protection is the removed SELECT policy + SECURITY DEFINER RPCs.
- **`sessionStorage`** for admin auth — persists across page refreshes in the same tab, cleared when the tab closes.

## User Preferences

- Do not redesign the website. Preserve the existing visual style (Playfair Display serif, warm gold palette, framer-motion animations).
- Keep the site elegant and minimal — no unnecessary features.
