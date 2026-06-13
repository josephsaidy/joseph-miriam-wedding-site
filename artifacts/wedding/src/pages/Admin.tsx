import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase, type Guest } from "@/lib/supabase";

const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroupRow {
  group_name: string;
  members: Guest[];
  leader: Guest | undefined;
  allowed_guests: number;
  rsvp_status: string;         // derived from leader / first member
  attending_count: number | null;
  guest_message: string | null;
  dietary_restrictions: string | null;
  submitted_at: string | null;
}

function buildGroups(guests: Guest[]): GroupRow[] {
  const map = new Map<string, Guest[]>();
  for (const g of guests) {
    if (!map.has(g.group_name)) map.set(g.group_name, []);
    map.get(g.group_name)!.push(g);
  }

  return Array.from(map.entries())
    .map(([group_name, members]) => {
      const leader = members.find((m) => m.is_group_leader) ?? members[0];
      return {
        group_name,
        members,
        leader,
        allowed_guests:       leader?.allowed_guests ?? 0,
        rsvp_status:          leader?.rsvp_status ?? "pending",
        attending_count:      leader?.attending_count ?? null,
        guest_message:        leader?.guest_message ?? null,
        dietary_restrictions: leader?.dietary_restrictions ?? null,
        submitted_at:         leader?.submitted_at ?? null,
      };
    })
    .sort((a, b) => a.group_name.localeCompare(b.group_name));
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCSV(groups: GroupRow[]) {
  const headers = [
    "Group Name",
    "Members",
    "Allowed Guests",
    "RSVP Status",
    "Attending Count",
    "Message",
    "Dietary Restrictions",
    "Submitted At",
  ];
  const rows = groups.map((gr) => [
    gr.group_name,
    gr.members.map((m) => m.full_name).join(" | "),
    gr.allowed_guests,
    gr.rsvp_status,
    gr.attending_count ?? "",
    (gr.guest_message ?? "").replace(/,/g, ";"),
    (gr.dietary_restrictions ?? "").replace(/,/g, ";"),
    gr.submitted_at ? new Date(gr.submitted_at).toLocaleString() : "",
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
  const [authed, setAuthed]         = useState(false);
  const [password, setPassword]     = useState("");
  const [authError, setAuthError]   = useState(false);
  const [guests, setGuests]         = useState<Guest[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

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
        .order("group_name")
        .order("is_group_leader", { ascending: false });
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

  // ── Derived data ──────────────────────────────────────────────────────────

  const groups = buildGroups(guests);

  const totalInvited      = groups.reduce((s, g) => s + g.allowed_guests, 0);
  const totalAttending    = groups.filter((g) => g.rsvp_status === "attending").reduce((s, g) => s + (g.attending_count ?? 0), 0);
  const totalNotAttending = groups.filter((g) => g.rsvp_status === "not_attending").length;
  const totalPending      = groups.filter((g) => g.rsvp_status === "pending").length;
  const responded         = groups.filter((g) => g.rsvp_status !== "pending").length;
  const responseRate      = groups.length > 0 ? Math.round((responded / groups.length) * 100) : 0;

  const statusBadge: Record<string, string> = {
    pending:       "bg-yellow-100 text-yellow-800",
    attending:     "bg-green-100 text-green-800",
    not_attending: "bg-red-100 text-red-800",
  };

  const labelBase = "uppercase tracking-widest text-xs text-muted-foreground";
  const inputBase = "border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg w-full outline-none py-2";

  // ─── Login ────────────────────────────────────────────────────────────────

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

  // ─── Dashboard ───────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-7xl mx-auto space-y-12">

        <div className="text-center space-y-2">
          <span className={labelBase}>Admin</span>
          <h1 className="text-4xl font-serif">RSVP Dashboard</h1>
          <p className="text-muted-foreground font-light">Joseph & Miriam — August 2nd, 2026</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: "Invited",       value: totalInvited },
            { label: "Attending",     value: totalAttending },
            { label: "Not Attending", value: totalNotAttending },
            { label: "Pending",       value: totalPending },
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
            onClick={() => exportCSV(groups)}
            className="bg-foreground text-background font-serif py-3 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            Export CSV
          </button>
        </div>

        {fetchError && <p className="text-red-500 text-sm">{fetchError}</p>}

        {/* Table */}
        {loading ? (
          <p className="text-center text-muted-foreground font-light py-12">Loading…</p>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Invitation", "Members", "Allowed", "Status", "Attending", "Message", "Dietary", "Submitted"].map((h) => (
                    <th key={h} className="text-left px-4 py-4 uppercase tracking-wider text-xs text-muted-foreground font-normal whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-muted-foreground font-light">
                      No guests found. Import the guest list into Supabase first.
                    </td>
                  </tr>
                ) : (
                  groups.map((gr) => (
                    <tr key={gr.group_name} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors align-top">

                      {/* Invitation / group name */}
                      <td className="px-4 py-4 font-serif whitespace-nowrap">{gr.group_name}</td>

                      {/* Members list */}
                      <td className="px-4 py-4 max-w-[200px]">
                        <div className="flex flex-col gap-1">
                          {gr.members.map((m) => (
                            <span key={m.id} className="text-muted-foreground text-xs whitespace-nowrap">
                              {m.full_name}{m.is_group_leader ? " ★" : ""}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-center">{gr.allowed_guests}</td>

                      <td className="px-4 py-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusBadge[gr.rsvp_status]}`}>
                          {gr.rsvp_status.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-center">{gr.attending_count ?? "—"}</td>
                      <td className="px-4 py-4 max-w-[200px] text-muted-foreground truncate">{gr.guest_message || "—"}</td>
                      <td className="px-4 py-4 max-w-[160px] text-muted-foreground truncate">{gr.dietary_restrictions || "—"}</td>
                      <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                        {gr.submitted_at ? new Date(gr.submitted_at).toLocaleDateString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="text-center">
          <a href="/" className="text-sm text-muted-foreground underline underline-offset-4">
            ← Back to wedding site
          </a>
        </div>
      </div>
    </div>
  );
}
