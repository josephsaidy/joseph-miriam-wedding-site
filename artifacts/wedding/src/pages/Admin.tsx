import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase, type Guest } from "@/lib/supabase";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "";

// ─── CSV export helper ────────────────────────────────────────────────────────

function exportCSV(guests: Guest[]) {
  const headers = [
    "Full Name",
    "Party Name",
    "Allowed Guests",
    "RSVP Status",
    "Attending Count",
    "Message",
    "Dietary Restrictions",
    "Submitted At",
  ];
  const rows = guests.map((g) => [
    g.full_name,
    g.party_name ?? "",
    g.allowed_guests,
    g.rsvp_status,
    g.attending_count ?? "",
    (g.guest_message ?? "").replace(/,/g, ";"),
    (g.dietary_restrictions ?? "").replace(/,/g, ";"),
    g.submitted_at ? new Date(g.submitted_at).toLocaleString() : "",
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "rsvp-responses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Check sessionStorage so the admin doesn't have to re-enter on refresh
  useEffect(() => {
    if (sessionStorage.getItem("rsvp_admin") === "1") setAuthed(true);
  }, []);

  useEffect(() => {
    if (authed) loadGuests();
  }, [authed]);

  async function loadGuests() {
    setLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await supabase
        .from("guests")
        .select("*")
        .order("full_name");
      if (error) throw error;
      setGuests((data as Guest[]) ?? []);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load guests.");
    } finally {
      setLoading(false);
    }
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem("rsvp_admin", "1");
      setAuthed(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalInvited = guests.reduce((s, g) => s + g.allowed_guests, 0);
  const totalAttending = guests
    .filter((g) => g.rsvp_status === "attending")
    .reduce((s, g) => s + (g.attending_count ?? 0), 0);
  const totalNotAttending = guests.filter((g) => g.rsvp_status === "not_attending").length;
  const totalPending = guests.filter((g) => g.rsvp_status === "pending").length;
  const responded = guests.filter((g) => g.rsvp_status !== "pending").length;
  const responseRate = guests.length > 0 ? Math.round((responded / guests.length) * 100) : 0;

  const statusBadge: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    attending: "bg-green-100 text-green-800",
    not_attending: "bg-red-100 text-red-800",
  };

  const labelBase = "uppercase tracking-widest text-xs text-muted-foreground";
  const inputBase =
    "border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg w-full outline-none py-2";

  // ─── Login screen ──────────────────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card text-card-foreground p-10 md:p-16 rounded-xl shadow-xl border border-border w-full max-w-md"
        >
          <div className="text-center space-y-3 mb-10">
            <span className={labelBase}>Admin</span>
            <h1 className="text-3xl font-serif">RSVP Dashboard</h1>
            <p className="text-muted-foreground font-light text-sm">Joseph & Miriam — August 2nd, 2026</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-8">
            <div>
              <label className={labelBase}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBase}
                placeholder="Enter admin password"
                autoFocus
              />
              {authError && <p className="text-red-500 text-sm mt-2">Incorrect password.</p>}
            </div>
            <button
              type="submit"
              className="w-full bg-foreground text-background font-serif py-4 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg"
            >
              Enter
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-7xl mx-auto space-y-12">

        {/* Header */}
        <div className="text-center space-y-2">
          <span className={labelBase}>Admin</span>
          <h1 className="text-4xl font-serif">RSVP Dashboard</h1>
          <p className="text-muted-foreground font-light">Joseph & Miriam — August 2nd, 2026</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Invited", value: totalInvited },
            { label: "Attending", value: totalAttending },
            { label: "Not Attending", value: totalNotAttending },
            { label: "Pending", value: totalPending },
            { label: "Response Rate", value: `${responseRate}%` },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-6 text-center shadow-sm">
              <p className="text-3xl font-serif text-foreground">{s.value}</p>
              <p className={`${labelBase} mt-1`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-end">
          <button
            onClick={loadGuests}
            className="border border-foreground text-foreground font-serif py-3 px-6 hover:bg-foreground hover:text-background transition-all duration-300"
          >
            Refresh
          </button>
          <button
            onClick={() => exportCSV(guests)}
            className="bg-foreground text-background font-serif py-3 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Export CSV
          </button>
        </div>

        {/* Error */}
        {fetchError && <p className="text-red-500 text-sm">{fetchError}</p>}

        {/* Table */}
        {loading ? (
          <p className="text-center text-muted-foreground font-light py-12">Loading…</p>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Full Name", "Party", "Allowed", "Status", "Attending", "Message", "Dietary", "Submitted"].map((h) => (
                    <th key={h} className="text-left px-4 py-4 uppercase tracking-wider text-xs text-muted-foreground font-normal whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground font-light">
                      No guests found. Make sure you've imported the guest list into Supabase.
                    </td>
                  </tr>
                ) : (
                  guests.map((g) => (
                    <tr key={g.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-4 font-serif whitespace-nowrap">{g.full_name}</td>
                      <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">{g.party_name ?? "—"}</td>
                      <td className="px-4 py-4 text-center">{g.allowed_guests}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusBadge[g.rsvp_status]}`}>
                          {g.rsvp_status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">{g.attending_count ?? "—"}</td>
                      <td className="px-4 py-4 max-w-[200px] text-muted-foreground truncate">{g.guest_message || "—"}</td>
                      <td className="px-4 py-4 max-w-[160px] text-muted-foreground truncate">{g.dietary_restrictions || "—"}</td>
                      <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                        {g.submitted_at ? new Date(g.submitted_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Back link */}
        <div className="text-center">
          <a href="/" className="text-sm text-muted-foreground underline underline-offset-4">
            ← Back to wedding site
          </a>
        </div>
      </div>
    </div>
  );
}
