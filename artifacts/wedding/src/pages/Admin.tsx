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
  rsvp_status: string;
  attending_count: number | null;
  guest_message: string | null;
  dietary_restrictions: string | null;
  submitted_at: string | null;
}

interface EditState {
  rsvp_status: string;
  attending_count: number;
  guest_message: string;
  dietary_restrictions: string;
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

function csvCell(value: string | number | null | undefined): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCSV(groups: GroupRow[]) {
  const headers = [
    "Group Name", "Members", "Allowed Guests", "RSVP Status",
    "Attending Count", "Message", "Dietary Restrictions", "Submitted At",
  ];
  const rows = groups.map((gr) => [
    csvCell(gr.group_name),
    csvCell(gr.members.map((m) => m.full_name).join(" | ")),
    csvCell(gr.allowed_guests),
    csvCell(gr.rsvp_status),
    csvCell(gr.attending_count),
    csvCell(gr.guest_message),
    csvCell(gr.dietary_restrictions),
    csvCell(gr.submitted_at ? new Date(gr.submitted_at).toLocaleString() : ""),
  ]);
  const csv  = [headers.map(csvCell), ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = "rsvp-responses.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Shared style tokens ──────────────────────────────────────────────────────

const cellInput =
  "w-full border-b border-border bg-transparent text-sm py-1 px-0 focus:outline-none focus:border-primary transition-colors";

const statusBadge: Record<string, string> = {
  pending:       "bg-yellow-100 text-yellow-800",
  attending:     "bg-green-100 text-green-800",
  not_attending: "bg-red-100 text-red-800",
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function Admin() {
  const [authed, setAuthed]         = useState(false);
  const [password, setPassword]     = useState("");
  const [authError, setAuthError]   = useState(false);
  const [guests, setGuests]         = useState<Guest[]>([]);
  const [loading, setLoading]       = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Search/filter
  const [filterQuery, setFilterQuery] = useState("");

  // Inline edit state
  const [editingGroup, setEditingGroup] = useState<string | null>(null);
  const [editState, setEditState]       = useState<EditState>({
    rsvp_status: "pending", attending_count: 1, guest_message: "", dietary_restrictions: "",
  });
  const [saving, setSaving]     = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
      const { data, error } = await supabase.rpc("get_all_guests_admin");
      if (error) throw error;
      setGuests((data as Guest[]) ?? []);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : "Failed to load guests.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(gr: GroupRow) {
    setEditingGroup(gr.group_name);
    setEditState({
      rsvp_status:          gr.rsvp_status,
      attending_count:      gr.attending_count ?? gr.allowed_guests,
      guest_message:        gr.guest_message ?? "",
      dietary_restrictions: gr.dietary_restrictions ?? "",
    });
    setSaveError(null);
  }

  function cancelEdit() {
    setEditingGroup(null);
    setSaveError(null);
  }

  async function saveEdit(gr: GroupRow) {
    // Client-side cap check
    if (editState.rsvp_status === "attending" && editState.attending_count > gr.allowed_guests) {
      setSaveError(`Max ${gr.allowed_guests} guest${gr.allowed_guests !== 1 ? "s" : ""} for this invitation.`);
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase.rpc("admin_update_group", {
        p_group_name:           gr.group_name,
        p_rsvp_status:          editState.rsvp_status,
        p_attending_count:      editState.rsvp_status === "not_attending" ? 0 : editState.attending_count,
        p_guest_message:        editState.guest_message,
        p_dietary_restrictions: editState.dietary_restrictions,
      });
      if (error) throw error;
      setEditingGroup(null);
      await loadGuests();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSaving(false);
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

  const filteredGroups = filterQuery.trim()
    ? groups.filter((gr) => {
        const q = filterQuery.toLowerCase();
        return (
          gr.group_name.toLowerCase().includes(q) ||
          gr.members.some((m) => m.full_name.toLowerCase().includes(q)) ||
          gr.rsvp_status.includes(q) ||
          (gr.guest_message ?? "").toLowerCase().includes(q) ||
          (gr.dietary_restrictions ?? "").toLowerCase().includes(q)
        );
      })
    : groups;

  const totalInvited      = groups.reduce((s, g) => s + g.allowed_guests, 0);
  const totalAttending    = groups.filter((g) => g.rsvp_status === "attending").reduce((s, g) => s + (g.attending_count ?? 0), 0);
  const totalNotAttending = groups.filter((g) => g.rsvp_status === "not_attending").length;
  const totalPending      = groups.filter((g) => g.rsvp_status === "pending").length;
  const responded         = groups.filter((g) => g.rsvp_status !== "pending").length;
  const responseRate      = groups.length > 0 ? Math.round((responded / groups.length) * 100) : 0;

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

        {/* Search / filter */}
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search by name, group, status, message…"
            className="w-full border-b-2 border-border bg-transparent py-3 pr-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
          {filterQuery ? (
            <button
              onClick={() => setFilterQuery("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none px-2"
              aria-label="Clear search"
            >
              ×
            </button>
          ) : (
            <span className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground text-sm px-2 pointer-events-none">⌕</span>
          )}
          {filterQuery && (
            <p className="mt-1 text-xs text-muted-foreground">
              {filteredGroups.length} of {groups.length} group{groups.length !== 1 ? "s" : ""}
            </p>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <p className="text-center text-muted-foreground font-light py-12">Loading…</p>
        ) : (
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  {["Invitation", "Members", "Allowed", "Status", "Attending", "Message", "Dietary", "Submitted", ""].map((h) => (
                    <th key={h} className="text-left px-4 py-4 uppercase tracking-wider text-xs text-muted-foreground font-normal whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-muted-foreground font-light">
                      {filterQuery ? "No groups match your search." : "No guests found. Import the guest list into Supabase first."}
                    </td>
                  </tr>
                ) : (
                  filteredGroups.map((gr) => {
                    const isEditing = editingGroup === gr.group_name;

                    return (
                      <tr
                        key={gr.group_name}
                        className={`border-b border-border last:border-0 align-top transition-colors ${isEditing ? "bg-muted/60" : "hover:bg-muted/30"}`}
                      >
                        {/* Invitation */}
                        <td className="px-4 py-4 font-serif whitespace-nowrap">{gr.group_name}</td>

                        {/* Members */}
                        <td className="px-4 py-4 max-w-[180px]">
                          <div className="flex flex-col gap-1">
                            {gr.members.map((m) => (
                              <span key={m.id} className="text-muted-foreground text-xs whitespace-nowrap">
                                {m.full_name}{m.is_group_leader ? " ★" : ""}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Allowed */}
                        <td className="px-4 py-4 text-center">{gr.allowed_guests}</td>

                        {/* Status — editable */}
                        <td className="px-4 py-4 min-w-[140px]">
                          {isEditing ? (
                            <select
                              value={editState.rsvp_status}
                              onChange={(e) => setEditState((s) => ({ ...s, rsvp_status: e.target.value }))}
                              className={`${cellInput} cursor-pointer`}
                            >
                              <option value="pending">pending</option>
                              <option value="attending">attending</option>
                              <option value="not_attending">not attending</option>
                            </select>
                          ) : (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${statusBadge[gr.rsvp_status] ?? ""}`}>
                              {gr.rsvp_status.replace("_", " ")}
                            </span>
                          )}
                        </td>

                        {/* Attending count — editable */}
                        <td className="px-4 py-4 text-center min-w-[80px]">
                          {isEditing && editState.rsvp_status === "attending" ? (
                            <input
                              type="number"
                              min={1}
                              max={gr.allowed_guests}
                              value={editState.attending_count}
                              onChange={(e) => setEditState((s) => ({ ...s, attending_count: Number(e.target.value) }))}
                              className={`${cellInput} w-16 text-center`}
                            />
                          ) : (
                            <span>{isEditing ? "—" : (gr.attending_count ?? "—")}</span>
                          )}
                        </td>

                        {/* Message — editable */}
                        <td className="px-4 py-4 min-w-[180px] max-w-[220px]">
                          {isEditing && editState.rsvp_status !== "pending" ? (
                            <input
                              type="text"
                              value={editState.guest_message}
                              onChange={(e) => setEditState((s) => ({ ...s, guest_message: e.target.value }))}
                              placeholder="Leave a note…"
                              className={cellInput}
                            />
                          ) : (
                            <span className="text-muted-foreground truncate block max-w-[200px]">
                              {isEditing ? <span className="italic text-muted-foreground/50">cleared on pending</span> : (gr.guest_message || "—")}
                            </span>
                          )}
                        </td>

                        {/* Dietary — editable */}
                        <td className="px-4 py-4 min-w-[160px] max-w-[200px]">
                          {isEditing && editState.rsvp_status !== "pending" ? (
                            <input
                              type="text"
                              value={editState.dietary_restrictions}
                              onChange={(e) => setEditState((s) => ({ ...s, dietary_restrictions: e.target.value }))}
                              placeholder="e.g. vegetarian…"
                              className={cellInput}
                            />
                          ) : (
                            <span className="text-muted-foreground truncate block max-w-[160px]">
                              {isEditing ? <span className="italic text-muted-foreground/50">cleared on pending</span> : (gr.dietary_restrictions || "—")}
                            </span>
                          )}
                        </td>

                        {/* Submitted */}
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                          {gr.submitted_at ? new Date(gr.submitted_at).toLocaleDateString() : "—"}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex flex-col gap-2 items-start">
                              <div className="flex gap-2">
                                <button
                                  onClick={() => saveEdit(gr)}
                                  disabled={saving}
                                  className="border border-foreground text-foreground text-xs font-serif px-3 py-1.5 hover:bg-foreground hover:text-background transition-all duration-200 disabled:opacity-50"
                                >
                                  {saving ? "Saving…" : "Save"}
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  disabled={saving}
                                  className="text-xs text-muted-foreground underline underline-offset-2 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                              {saveError && (
                                <p className="text-red-500 text-xs max-w-[160px]">{saveError}</p>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(gr)}
                              disabled={editingGroup !== null}
                              className="border border-border text-muted-foreground text-xs font-serif px-3 py-1.5 hover:border-foreground hover:text-foreground transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
