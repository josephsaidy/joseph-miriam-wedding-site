import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase, type Guest } from "@/lib/supabase";
import { findMatches, normalizeName } from "@/lib/fuzzy";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step = "search" | "confirm" | "form" | "success" | "not_found";

interface SearchCandidate {
  id: string;
  full_name: string;
  normalized_name: string;
}

interface MatchResult {
  guestId: string;
  fullName: string;
  score: number;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const searchSchema = z.object({
  query: z.string().min(2, "Please enter your name"),
});

const rsvpSchema = z.object({
  attendance: z.enum(["attending", "not_attending"], {
    required_error: "Please let us know if you can make it",
  }),
  attending_count: z.coerce.number().min(1).max(20),
  guest_message: z.string().optional(),
  dietary_restrictions: z.string().optional(),
});

type SearchValues = z.infer<typeof searchSchema>;
type RSVPValues = z.infer<typeof rsvpSchema>;

// ─── Inline styles matching existing site palette ────────────────────────────

const btnPrimary =
  "w-full bg-foreground text-background font-serif py-4 px-6 hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg disabled:opacity-50 disabled:cursor-not-allowed";

const inputBase =
  "border-b-2 border-t-0 border-x-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-primary px-0 text-lg";

const labelBase = "uppercase tracking-widest text-xs text-muted-foreground";

// ─── Component ───────────────────────────────────────────────────────────────

export default function RSVP() {
  const [step, setStep] = useState<Step>("search");
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const searchForm = useForm<SearchValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { query: "" },
  });

  const rsvpForm = useForm<RSVPValues>({
    resolver: zodResolver(rsvpSchema),
    defaultValues: { attending_count: 1, guest_message: "", dietary_restrictions: "" },
  });

  const attendance = rsvpForm.watch("attendance");

  // ── Step 1: Search guest list ──────────────────────────────────────────────
  async function onSearch({ query }: SearchValues) {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      // Fetch only id + names via secure RPC (no full list exposed)
      const { data, error } = await supabase.rpc("search_guests_for_rsvp");
      if (error) throw error;

      const candidates = (data as SearchCandidate[]) ?? [];
      const results = findMatches(query, candidates);

      if (results.length === 0) {
        setStep("not_found");
      } else {
        setMatches(results);
        setStep("confirm");
      }
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 2: Guest confirms their name ─────────────────────────────────────
  async function onConfirm(guestId: string) {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.rpc("get_guest_by_id", { p_id: guestId });
      if (error) throw error;

      const guest = data as Guest;
      setSelectedGuest(guest);
      rsvpForm.setValue("attending_count", guest.allowed_guests);
      setStep("form");
    } catch (err) {
      setErrorMsg("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  // ── Step 3: Submit RSVP ───────────────────────────────────────────────────
  async function onSubmit(values: RSVPValues) {
    if (!selectedGuest) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.rpc("submit_rsvp", {
        p_id: selectedGuest.id,
        p_rsvp_status: values.attendance,
        p_attending_count:
          values.attendance === "not_attending" ? 0 : values.attending_count,
        p_guest_message: values.guest_message ?? "",
        p_dietary_restrictions: values.dietary_restrictions ?? "",
      });

      if (error) throw error;
      setStep("success");
    } catch (err) {
      setErrorMsg("Failed to submit RSVP. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  function restart() {
    setStep("search");
    setMatches([]);
    setSelectedGuest(null);
    setErrorMsg(null);
    searchForm.reset();
    rsvpForm.reset();
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <section id="rsvp" className="py-24 md:py-32 bg-secondary text-secondary-foreground relative">
      <div className="container mx-auto px-6 max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="bg-card text-card-foreground p-10 md:p-16 rounded-xl shadow-xl border border-border"
        >
          {/* Section heading — always visible unless success */}
          {step !== "success" && (
            <div className="text-center space-y-4 mb-12">
              <span className="uppercase tracking-[0.2em] text-sm text-primary">Join Us</span>
              <h2 className="text-4xl md:text-5xl font-serif">RSVP</h2>
              <p className="text-muted-foreground font-light">Please respond by July 2nd, 2026</p>
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── STEP: SEARCH ── */}
            {step === "search" && (
              <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Form {...searchForm}>
                  <form onSubmit={searchForm.handleSubmit(onSearch)} className="space-y-8">
                    <FormField
                      control={searchForm.control}
                      name="query"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelBase}>Your Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Joseph Saidy"
                              className={inputBase}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                    <button type="submit" disabled={isLoading} className={btnPrimary}>
                      {isLoading ? "Searching…" : "Find My Invitation"}
                    </button>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── STEP: CONFIRM MATCH ── */}
            {step === "confirm" && (
              <motion.div key="confirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                <p className="text-center text-muted-foreground font-light">
                  {matches.length === 1 ? "We found you on the guest list:" : "Did you mean one of these?"}
                </p>
                <div className="space-y-4">
                  {matches.map((m) => (
                    <button
                      key={m.guestId}
                      onClick={() => onConfirm(m.guestId)}
                      disabled={isLoading}
                      className="w-full text-left border border-border rounded-lg px-6 py-5 hover:border-primary hover:bg-muted transition-all duration-200 font-serif text-xl disabled:opacity-50"
                    >
                      {m.fullName}
                    </button>
                  ))}
                </div>
                {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}
                <button onClick={restart} className="w-full text-sm text-muted-foreground underline underline-offset-4 mt-2">
                  That's not me — search again
                </button>
              </motion.div>
            )}

            {/* ── STEP: RSVP FORM ── */}
            {step === "form" && selectedGuest && (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-center text-muted-foreground font-light mb-10">
                  Welcome, <span className="font-serif text-foreground text-xl">{selectedGuest.full_name}</span>
                  {selectedGuest.party_name ? ` — ${selectedGuest.party_name}` : ""}
                </p>

                <Form {...rsvpForm}>
                  <form onSubmit={rsvpForm.handleSubmit(onSubmit)} className="space-y-8">

                    <FormField
                      control={rsvpForm.control}
                      name="attendance"
                      render={({ field }) => (
                        <FormItem className="space-y-4">
                          <FormLabel className={labelBase}>Will you attend?</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              className="flex flex-col sm:flex-row gap-4"
                            >
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="attending" />
                                </FormControl>
                                <FormLabel className="font-serif text-lg font-normal cursor-pointer">
                                  Joyfully Accepts
                                </FormLabel>
                              </FormItem>
                              <FormItem className="flex items-center space-x-3 space-y-0">
                                <FormControl>
                                  <RadioGroupItem value="not_attending" />
                                </FormControl>
                                <FormLabel className="font-serif text-lg font-normal cursor-pointer">
                                  Regretfully Declines
                                </FormLabel>
                              </FormItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {attendance === "attending" && (
                      <FormField
                        control={rsvpForm.control}
                        name="attending_count"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={labelBase}>
                              Number of guests attending (max {selectedGuest.allowed_guests})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min={1}
                                max={selectedGuest.allowed_guests}
                                className={`${inputBase} w-24`}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={rsvpForm.control}
                      name="guest_message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelBase}>Message to Joseph & Miriam</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Leave a note for the couple…"
                              className={`resize-none ${inputBase} min-h-[80px]`}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={rsvpForm.control}
                      name="dietary_restrictions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className={labelBase}>Dietary restrictions</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. vegetarian, nut allergy…"
                              className={inputBase}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {errorMsg && <p className="text-sm text-red-500">{errorMsg}</p>}

                    <div className="pt-6">
                      <button type="submit" disabled={isLoading} className={btnPrimary}>
                        {isLoading ? "Sending…" : "Send RSVP"}
                      </button>
                    </div>
                  </form>
                </Form>
              </motion.div>
            )}

            {/* ── STEP: SUCCESS ── */}
            {step === "success" && (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-12 space-y-6">
                <h3 className="text-4xl font-serif text-primary italic">Thank You!</h3>
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  Your RSVP has been received.<br />
                  {selectedGuest?.rsvp_status !== "not_attending"
                    ? "We can't wait to celebrate with you."
                    : "We'll miss you, and hope to see you soon."}
                </p>
                <button onClick={restart} className="text-sm text-muted-foreground underline underline-offset-4">
                  Submit another response
                </button>
              </motion.div>
            )}

            {/* ── STEP: NOT FOUND ── */}
            {step === "not_found" && (
              <motion.div key="not_found" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center space-y-6 py-4">
                <p className="text-lg text-muted-foreground font-light leading-relaxed">
                  We couldn't find your name on the guest list.<br />
                  Please check the spelling or contact Joseph & Miriam directly.
                </p>
                <button onClick={restart} className="text-sm text-foreground underline underline-offset-4">
                  Try again
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
